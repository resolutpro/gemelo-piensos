import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Package, FlaskConical, Calendar, MapPin, Truck, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { RawMaterialLot, NirAnalysis, RawMaterial, Supplier, TraceEvent } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = { received: "Recibido", in_storage: "En Almacén", in_use: "En Uso", consumed: "Consumido" };

function NirCard({ analysis }: { analysis: NirAnalysis }) {
  const params = [
    { label: "Humedad", value: analysis.moisture, unit: "%" },
    { label: "Proteína", value: analysis.protein, unit: "%" },
    { label: "Grasa", value: analysis.fat, unit: "%" },
    { label: "Almidón", value: analysis.starch, unit: "%" },
    { label: "Fibra", value: analysis.fiber, unit: "%" },
    { label: "Cenizas", value: analysis.ash, unit: "%" },
  ].filter(p => p.value !== null && p.value !== undefined);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Análisis NIR — {format(new Date(analysis.analyzedAt), "d MMM yyyy HH:mm", { locale: es })}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {params.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos nutricionales registrados</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {params.map(({ label, value, unit }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{value?.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></p>
              </div>
            ))}
          </div>
        )}
        {analysis.notes && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">{analysis.notes}</p>}
      </CardContent>
    </Card>
  );
}

function TraceTimeline({ events }: { events: TraceEvent[] }) {
  const EVENT_LABELS: Record<string, string> = {
    lot_received: "Lote recibido",
    nir_analysis: "Análisis NIR registrado",
    simulation_created: "Incluido en simulación",
    batch_produced: "Usado en producción",
    final_analysis: "Análisis final registrado",
  };

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sin eventos registrados</p>
      ) : (
        events.map((ev, i) => (
          <div key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 flex-shrink-0" />
              {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-3 min-w-0">
              <p className="text-sm font-medium text-foreground">{EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
              <p className="text-xs text-muted-foreground">{ev.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ev.occurredAt), "d MMM yyyy HH:mm", { locale: es })}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function LotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: lot, isLoading } = useQuery<RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier }>({
    queryKey: ["/api/lots", id],
    queryFn: async () => {
      const res = await fetch(`/api/lots/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Lote no encontrado");
      return res.json();
    },
  });

  const { data: analyses = [] } = useQuery<NirAnalysis[]>({
    queryKey: ["/api/nir-analyses/lot", id],
    queryFn: async () => {
      const res = await fetch(`/api/nir-analyses/lot/${id}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: traceEvents = [] } = useQuery<TraceEvent[]>({
    queryKey: ["/api/trace-events", { lotId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/trace-events?lotId=${id}`, { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Lote no encontrado</p>
        <Link href="/recepcion"><Button variant="outline" className="mt-4">Volver a Recepción</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/recepcion">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">{lot.lotCode}</h1>
            <Badge variant="secondary">{STATUS_LABELS[lot.status] ?? lot.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Ficha detallada del lote de materia prima</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Información del Lote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Materia Prima</p>
                  <p className="font-medium">{lot.rawMaterial?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{lot.supplier?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad</p>
                  <p className="font-semibold text-lg font-mono">{lot.quantity.toLocaleString()} {lot.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tolva Destino</p>
                  <p className="font-medium">{lot.destinationBin ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha Recepción</p>
                  <p className="font-medium">{format(new Date(lot.receivedAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="outline">{STATUS_LABELS[lot.status] ?? lot.status}</Badge>
                </div>
                {lot.truckPlate && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Matrícula</p>
                    <p className="font-medium font-mono">{lot.truckPlate}</p>
                  </div>
                )}
                {lot.driverName && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Conductor</p>
                    <p className="font-medium">{lot.driverName}</p>
                  </div>
                )}
              </div>
              {lot.observations && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                    <p className="text-sm">{lot.observations}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* NIR Analyses */}
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> Análisis NIR
              <Badge variant="secondary" className="ml-auto">{analyses.length}</Badge>
            </h2>
            {analyses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <FlaskConical className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay análisis NIR registrados para este lote</p>
                </CardContent>
              </Card>
            ) : (
              analyses.map((a) => <NirCard key={a.id} analysis={a} />)
            )}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historial del Lote</CardTitle>
            </CardHeader>
            <CardContent>
              <TraceTimeline events={traceEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
