import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, AlertTriangle, Info, CheckCircle2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Alert, Zone, Sensor } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type AlertWithRelations = Alert & { zone?: Zone; sensor?: Sensor };

const SEVERITY_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string; badgeVariant: string }> = {
  critical: {
    label: "Crítica",
    icon: AlertTriangle,
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    text: "text-red-600 dark:text-red-400",
    badgeVariant: "destructive",
  },
  warning: {
    label: "Aviso",
    icon: AlertTriangle,
    bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900",
    text: "text-yellow-600 dark:text-yellow-400",
    badgeVariant: "outline",
  },
  info: {
    label: "Info",
    icon: Info,
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    text: "text-blue-600 dark:text-blue-400",
    badgeVariant: "secondary",
  },
};

export default function AlertsPage() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "resolved">("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const { data: alerts = [], isLoading } = useQuery<AlertWithRelations[]>({ queryKey: ["/api/alerts"] });

  const resolveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/alerts/${id}`, { status: "resolved" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Alerta marcada como resuelta" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = alerts.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

  const activeCount = alerts.filter(a => a.status === "active").length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && a.status === "active").length;
  const resolvedCount = alerts.filter(a => a.status === "resolved").length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Alertas del Sistema</h1>
        <p className="text-sm text-muted-foreground">Gestión de alertas por sensores, calidad y desviaciones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950"><AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Activas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Críticas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950"><CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resueltas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36 h-9" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="resolved">Resueltas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-36 h-9" data-testid="select-filter-severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Severidad: Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        {(filterStatus !== "all" || filterSeverity !== "all") && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setFilterStatus("all"); setFilterSeverity("all"); }}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="p-4 rounded-full bg-muted mx-auto w-fit">
              {activeCount === 0 ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Bell className="w-8 h-8 text-muted-foreground" />}
            </div>
            <p className="font-semibold">{activeCount === 0 ? "Sin alertas activas" : "Sin alertas con estos filtros"}</p>
            <p className="text-sm text-muted-foreground">
              {activeCount === 0 ? "El sistema funciona con normalidad. No hay alertas pendientes." : "Modifique los filtros para ver más resultados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            const isResolved = alert.status === "resolved";
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${isResolved ? "bg-muted/30 border-border opacity-70" : cfg.bg} transition-all`}
                data-testid={`alert-${alert.id}`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${cfg.text}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                        <Badge variant={cfg.badgeVariant as any} className="text-xs">{cfg.label}</Badge>
                        {isResolved && <Badge variant="secondary" className="text-xs">Resuelta</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{format(new Date(alert.createdAt), "d MMM yyyy HH:mm", { locale: es })}</span>
                        {alert.zone && <span>· {alert.zone.name}</span>}
                        {alert.sensor && <span>· {alert.sensor.name}</span>}
                        {isResolved && alert.resolvedAt && <span>· Resuelta: {format(new Date(alert.resolvedAt), "d MMM HH:mm", { locale: es })}</span>}
                      </div>
                    </div>
                    {!isResolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-shrink-0"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        data-testid={`button-resolve-alert-${alert.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
