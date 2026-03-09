import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Package, Bell, FlaskConical, GitBranch, TrendingUp, Wifi, AlertTriangle, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Alert, MixSimulation, RawMaterialLot, Sensor } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function KpiCard({ title, value, sub, icon: Icon, iconColor, to }: { title: string; value: string | number; sub: string; icon: any; iconColor: string; to?: string }) {
  const content = (
    <Card className="hover-elevate cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${iconColor} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link href={to}>{content}</Link> : content;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
      <div className="p-3 rounded-full bg-muted">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "destructive",
  warning: "outline",
  info: "secondary",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  warning: "Aviso",
  info: "Info",
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<{ lotsToday: number; activeAlerts: number; pendingSimulations: number; recentBatch: string | null }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: simulations = [], isLoading: simsLoading } = useQuery<MixSimulation[]>({
    queryKey: ["/api/simulations"],
  });

  const { data: lots = [], isLoading: lotsLoading } = useQuery<RawMaterialLot[]>({
    queryKey: ["/api/lots"],
  });

  const { data: sensors = [], isLoading: sensorsLoading } = useQuery<(Sensor & { zone?: any })[]>({
    queryKey: ["/api/sensors"],
  });

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const recentAlerts = activeAlerts.slice(0, 3);
  const recentLots = lots.slice(0, 4);
  const recentSims = simulations.slice(0, 3);
  const onlineSensors = sensors.filter((s) => s.status === "online").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          {user?.name && ` · Bienvenido, ${user.name.split(" ")[0]}`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <KpiCard title="Lotes Hoy" value={stats?.lotsToday ?? 0} sub="Lotes recibidos hoy" icon={Package} iconColor="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" to="/recepcion" />
            <KpiCard title="Alertas Activas" value={stats?.activeAlerts ?? 0} sub={stats?.activeAlerts ? "Requieren atención" : "Sin alertas activas"} icon={Bell} iconColor={stats?.activeAlerts ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"} to="/alertas" />
            <KpiCard title="Simulaciones" value={stats?.pendingSimulations ?? 0} sub="En estado listas" icon={FlaskConical} iconColor="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" to="/simulaciones" />
            <KpiCard title="Trazabilidad" value={stats?.recentBatch ?? "--"} sub={stats?.recentBatch ? "Último lote de producción" : "Sin registros recientes"} icon={GitBranch} iconColor="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" to="/trazabilidad" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas activas */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle className="text-base">Alertas Activas</CardTitle>
              <CardDescription>Tiempo real</CardDescription>
            </div>
            <Link href="/alertas">
              <Button variant="ghost" size="sm" className="text-xs h-8">Ver todas <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div>
            ) : recentAlerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Sin alertas activas" description="El sistema funciona con normalidad" />
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-foreground truncate">{alert.title}</p>
                        <Badge variant={SEVERITY_COLORS[alert.severity] as any} className="text-xs">{SEVERITY_LABELS[alert.severity]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado sensores */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle className="text-base">Estado de Sensores</CardTitle>
              <CardDescription>{sensors.length > 0 ? `${onlineSensors}/${sensors.length} online` : "Sin sensores configurados"}</CardDescription>
            </div>
            <Link href="/sensores">
              <Button variant="ghost" size="sm" className="text-xs h-8">Ver todos <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {sensorsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
            ) : sensors.length === 0 ? (
              <EmptyState icon={Wifi} title="Sin sensores registrados" description="Configure sensores IoT en el módulo de sensores" action={<Link href="/sensores"><Button size="sm" variant="outline" className="text-xs">Ir a Sensores</Button></Link>} />
            ) : (
              <div className="space-y-2">
                {sensors.slice(0, 4).map((sensor) => {
                  const statusColor = sensor.status === "online" ? "bg-green-500" : sensor.status === "warning" ? "bg-yellow-500" : "bg-red-500";
                  const statusLabel = sensor.status === "online" ? "Online" : sensor.status === "warning" ? "Aviso" : "Offline";
                  return (
                    <div key={sensor.id} className="flex items-center gap-3 p-2.5 rounded-md bg-card border border-card-border">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{sensor.name}</p>
                        <p className="text-xs text-muted-foreground">{(sensor as any).zone?.name ?? "Sin zona"}</p>
                      </div>
                      {sensor.lastValue !== null && (
                        <span className="text-xs font-mono font-semibold text-foreground">{sensor.lastValue}{sensor.unit}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas simulaciones */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle className="text-base">Simulaciones Recientes</CardTitle>
              <CardDescription>Gemelo digital</CardDescription>
            </div>
            <Link href="/simulaciones">
              <Button variant="ghost" size="sm" className="text-xs h-8">Ver todas <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {simsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div>
            ) : recentSims.length === 0 ? (
              <EmptyState icon={FlaskConical} title="Sin simulaciones" description="Cree su primera simulación de mezcla" action={<Link href="/simulaciones/nueva"><Button size="sm" variant="outline" className="text-xs">Nueva Simulación</Button></Link>} />
            ) : (
              <div className="space-y-2">
                {recentSims.map((sim) => {
                  const statusColors: Record<string, string> = { draft: "text-muted-foreground", ready: "text-blue-500", fabricated: "text-green-500" };
                  const statusLabels: Record<string, string> = { draft: "Borrador", ready: "Lista", fabricated: "Fabricada" };
                  return (
                    <Link href={`/simulaciones/${sim.id}`} key={sim.id}>
                      <div className="flex items-center gap-3 p-2.5 rounded-md bg-card border border-card-border hover-elevate cursor-pointer">
                        <Activity className={`w-4 h-4 flex-shrink-0 ${statusColors[sim.status]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{sim.name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(sim.createdAt), "d MMM yyyy", { locale: es })}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{statusLabels[sim.status]}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimos lotes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
          <div>
            <CardTitle className="text-base">Últimos Lotes Recibidos</CardTitle>
            <CardDescription>Recepción de materias primas</CardDescription>
          </div>
          <Link href="/recepcion">
            <Button variant="ghost" size="sm" className="text-xs h-8">Ver todos <ChevronRight className="w-3 h-3 ml-1" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {lotsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
          ) : recentLots.length === 0 ? (
            <EmptyState icon={Package} title="Todavía no hay lotes registrados" description="Registre su primer lote de materia prima en el módulo de recepción" action={<Link href="/recepcion"><Button size="sm" variant="outline" className="text-xs">Ir a Recepción</Button></Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Código Lote</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Materia Prima</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Proveedor</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cantidad</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Fecha</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLots.map((lot: any) => (
                    <tr key={lot.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-3 font-mono font-semibold text-foreground">{lot.lotCode}</td>
                      <td className="py-2.5 px-3 text-foreground">{lot.rawMaterial?.name ?? "—"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{lot.supplier?.name ?? "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">{lot.quantity.toLocaleString()} {lot.unit}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{format(new Date(lot.receivedAt), "d MMM yyyy", { locale: es })}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-xs capitalize">{lot.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
