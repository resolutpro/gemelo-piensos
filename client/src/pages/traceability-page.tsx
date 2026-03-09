import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GitBranch, Package, FlaskConical, Factory, CheckCircle2, Microscope, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TraceEvent, RawMaterialLot, RawMaterial, Supplier } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

const EVENT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  lot_received: { label: "Lote recibido", icon: Package, color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  nir_analysis: { label: "Análisis NIR", icon: Microscope, color: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  simulation_created: { label: "Simulación creada", icon: FlaskConical, color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" },
  batch_produced: { label: "Lote fabricado", icon: Factory, color: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" },
  final_analysis: { label: "Análisis final", icon: CheckCircle2, color: "bg-primary/10 text-primary" },
};

export default function TraceabilityPage() {
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = useQuery<TraceEvent[]>({
    queryKey: ["/api/trace-events"],
  });

  const { data: lots = [] } = useQuery<(RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })[]>({
    queryKey: ["/api/lots"],
  });

  const filteredEvents = events.filter((ev) => {
    if (!search) return true;
    const lot = lots.find(l => l.id === ev.lotId);
    return (
      ev.description.toLowerCase().includes(search.toLowerCase()) ||
      ev.eventType.toLowerCase().includes(search.toLowerCase()) ||
      (lot?.lotCode ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const groupedByDate = filteredEvents.reduce((acc, ev) => {
    const dateKey = format(new Date(ev.occurredAt), "d 'de' MMMM yyyy", { locale: es });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(ev);
    return acc;
  }, {} as Record<string, TraceEvent[]>);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Trazabilidad</h1>
        <p className="text-sm text-muted-foreground">Historial completo desde recepción hasta producto terminado</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(EVENT_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const count = events.filter(e => e.eventType === type).length;
          return (
            <Card key={type}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, descripción o evento..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-trace"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="p-4 rounded-full bg-muted mx-auto w-fit"><GitBranch className="w-8 h-8 text-muted-foreground" /></div>
            <p className="font-semibold">{search ? `Sin resultados para "${search}"` : "Sin eventos de trazabilidad"}</p>
            <p className="text-sm text-muted-foreground">{search ? "Ajuste su búsqueda" : "Los eventos se registran automáticamente al operar con lotes, simulaciones y producción"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dayEvents]) => (
            <div key={date}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">{date}</p>
              <div className="space-y-2">
                {dayEvents.map((ev, i) => {
                  const cfg = EVENT_CONFIG[ev.eventType];
                  const Icon = cfg?.icon ?? GitBranch;
                  const lot = lots.find(l => l.id === ev.lotId);
                  return (
                    <div key={ev.id} className="flex gap-4 items-start" data-testid={`trace-event-${ev.id}`}>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${cfg?.color ?? "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">{ev.description}</p>
                              {lot && (
                                <Link href={`/recepcion/${lot.id}`}>
                                  <Badge variant="outline" className="text-xs cursor-pointer">{lot.lotCode}</Badge>
                                </Link>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{cfg?.label ?? ev.eventType}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(ev.occurredAt), "HH:mm:ss")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
