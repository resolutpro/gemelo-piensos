import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Factory, FlaskConical, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductionBatch, MixSimulation } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type BatchWithSim = ProductionBatch & { simulation?: MixSimulation };

export default function ProductionPage() {
  const { data: batches = [], isLoading } = useQuery<BatchWithSim[]>({ queryKey: ["/api/production-batches"] });
  const { data: simulations = [], isLoading: simsLoading } = useQuery<MixSimulation[]>({ queryKey: ["/api/simulations"] });

  const readySims = simulations.filter(s => s.status === "ready");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Producción Física</h1>
        <p className="text-sm text-muted-foreground">Registro de lotes fabricados a partir de simulaciones</p>
      </div>

      {/* Ready to fabricate */}
      {readySims.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Simulaciones Listas para Fabricar
            </CardTitle>
            <CardDescription>Las siguientes simulaciones están aprobadas y pendientes de fabricación física</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readySims.map((sim) => (
                <Link href={`/simulaciones/${sim.id}`} key={sim.id}>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-background border border-border hover-elevate cursor-pointer">
                    <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{sim.name}</p>
                      <p className="text-xs text-muted-foreground">{sim.totalQuantity?.toLocaleString() ?? 0} kg estimados</p>
                    </div>
                    <Button size="sm" variant="default" className="text-xs flex-shrink-0">
                      Registrar Producción <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lotes de Producción</CardTitle>
          <CardDescription>Historial de fabricaciones registradas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="p-4 rounded-full bg-muted mx-auto w-fit"><Factory className="w-8 h-8 text-muted-foreground" /></div>
              <p className="font-semibold">Sin lotes de producción registrados</p>
              <p className="text-sm text-muted-foreground">
                {readySims.length > 0
                  ? "Registre la producción física de las simulaciones listas"
                  : "Primero cree y apruebe una simulación de mezcla"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código Lote</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulación</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cantidad</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha Fabricación</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verificación</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-muted/30" data-testid={`row-batch-${batch.id}`}>
                      <td className="py-3 px-4 font-mono font-semibold">{batch.batchCode}</td>
                      <td className="py-3 px-4 text-foreground">{batch.simulation?.name ?? "—"}</td>
                      <td className="py-3 px-4 text-right font-mono">{batch.quantity.toLocaleString()} kg</td>
                      <td className="py-3 px-4 text-muted-foreground">{format(new Date(batch.producedAt), "d MMM yyyy HH:mm", { locale: es })}</td>
                      <td className="py-3 px-4">
                        <Link href={`/verificacion?batchId=${batch.id}`}>
                          <Badge variant="outline" className="text-xs cursor-pointer">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verificar
                          </Badge>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        {batch.observations && (
                          <span className="text-xs text-muted-foreground truncate max-w-32 block">{batch.observations}</span>
                        )}
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
