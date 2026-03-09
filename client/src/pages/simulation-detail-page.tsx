import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Factory, CheckCircle2, AlertTriangle, FlaskConical, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MixSimulation, MixSimulationItem, RawMaterialLot, RawMaterial, NirAnalysis } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

const batchSchema = z.object({
  batchCode: z.string().min(2, "Código obligatorio"),
  producedAt: z.string().min(1, "Fecha obligatoria"),
  quantity: z.string().min(1, "Cantidad obligatoria"),
  observations: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  draft: { label: "Borrador", variant: "secondary" },
  ready: { label: "Lista", variant: "default" },
  fabricated: { label: "Fabricada", variant: "outline" },
};

function NutriCheck({ label, value, target, isMax }: { label: string; value: number | null | undefined; target: number | null | undefined; isMax?: boolean }) {
  if (value === null || value === undefined) return null;
  const inSpec = target == null ? null : isMax ? value <= target : value >= target;
  const near = target !== null && inSpec !== null && Math.abs(value - (target ?? 0)) < Math.abs((target ?? 0)) * 0.05;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono font-semibold">{value.toFixed(2)}%</span>
        {target !== null && target !== undefined && (
          <span className="text-xs text-muted-foreground">{isMax ? "máx" : "mín"}: {target}%</span>
        )}
        {inSpec !== null && (
          inSpec
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
      </div>
    </div>
  );
}

type SimWithItems = MixSimulation & {
  items?: (MixSimulationItem & { lot?: RawMaterialLot & { rawMaterial?: RawMaterial; nirAnalyses?: NirAnalysis[] } })[];
};

export default function SimulationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [batchOpen, setBatchOpen] = useState(false);

  const { data: sim, isLoading } = useQuery<SimWithItems>({
    queryKey: ["/api/simulations", id],
    queryFn: async () => {
      const res = await fetch(`/api/simulations/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Simulación no encontrada");
      return res.json();
    },
  });

  const batchForm = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batchCode: `BATCH-${format(new Date(), "yy")}${String(Math.floor(Math.random() * 9000) + 1000)}`,
      producedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      quantity: sim?.totalQuantity?.toString() ?? "",
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const res = await apiRequest("POST", "/api/production-batches", {
        ...data,
        simulationId: id,
      });
      return res.json();
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
      toast({ title: "Lote de producción registrado" });
      setBatchOpen(false);
      navigate(`/produccion`);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!sim) {
    return <div className="p-6 text-center text-muted-foreground">Simulación no encontrada</div>;
  }

  const statusCfg = STATUS_CONFIG[sim.status] ?? STATUS_CONFIG.draft;
  const totalQty = sim.totalQuantity ?? 0;

  const radarData = [
    { param: "Humedad", value: sim.estimatedMoisture ?? 0 },
    { param: "Proteína", value: sim.estimatedProtein ?? 0 },
    { param: "Grasa", value: sim.estimatedFat ?? 0 },
    { param: "Almidón", value: sim.estimatedStarch ?? 0 },
    { param: "Fibra", value: sim.estimatedFiber ?? 0 },
    { param: "Cenizas", value: sim.estimatedAsh ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/simulaciones">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{sim.name}</h1>
            <Badge variant={statusCfg.variant as any}>{statusCfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(sim.createdAt), "d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        {sim.status !== "fabricated" && (
          <Button onClick={() => { batchForm.setValue("quantity", String(totalQty)); setBatchOpen(true); }} data-testid="button-mark-fabricated">
            <Factory className="w-4 h-4 mr-2" /> Registrar Producción
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Ingredients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ingredientes de la Mezcla</CardTitle>
            </CardHeader>
            <CardContent>
              {!sim.items || sim.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin ingredientes registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">Lote</th>
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">Materia Prima</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">Cantidad</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">%</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">Proteína NIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.items.map((item) => {
                      const pct = totalQty > 0 ? (item.quantity / totalQty * 100).toFixed(1) : "0.0";
                      const nirs = item.lot?.nirAnalyses;
                      const lastNir = nirs && nirs.length > 0 ? nirs[nirs.length - 1] : null;
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 font-mono font-semibold text-foreground">{item.lot?.lotCode ?? "—"}</td>
                          <td className="py-2.5 text-foreground">{item.lot?.rawMaterial?.name ?? "—"}</td>
                          <td className="py-2.5 text-right font-mono">{item.quantity.toLocaleString()} kg</td>
                          <td className="py-2.5 text-right font-mono text-muted-foreground">{pct}%</td>
                          <td className="py-2.5 text-right">
                            {lastNir?.protein !== null && lastNir?.protein !== undefined
                              ? <span className="font-mono">{lastNir.protein.toFixed(2)}%</span>
                              : <span className="text-yellow-600 text-xs">Sin NIR</span>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-semibold">
                      <td colSpan={2} className="py-2 text-xs">TOTAL</td>
                      <td className="py-2 text-right font-mono text-sm">{totalQty.toLocaleString()} kg</td>
                      <td className="py-2 text-right font-mono text-muted-foreground text-xs">100%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Nutritional prediction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Composición Nutricional Predicha</CardTitle>
            </CardHeader>
            <CardContent>
              <NutriCheck label="Humedad" value={sim.estimatedMoisture} target={sim.targetMoistureMax} isMax />
              <NutriCheck label="Proteína" value={sim.estimatedProtein} target={sim.targetProteinMin} />
              <NutriCheck label="Grasa" value={sim.estimatedFat} target={sim.targetFatMax} isMax />
              <NutriCheck label="Almidón" value={sim.estimatedStarch} target={null} />
              <NutriCheck label="Fibra" value={sim.estimatedFiber} target={sim.targetFiberMax} isMax />
              <NutriCheck label="Cenizas" value={sim.estimatedAsh} target={null} />

              {sim.estimatedProtein === null && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Sin predicción disponible. Los ingredientes no tienen análisis NIR registrado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total mezcla</span>
                <span className="font-mono font-bold">{totalQty.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ingredientes</span>
                <span className="font-mono font-bold">{sim.items?.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={statusCfg.variant as any}>{statusCfg.label}</Badge>
              </div>
              {sim.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">{sim.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {radarData.length >= 3 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Perfil Nutricional</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="param" tick={{ fontSize: 10 }} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Register Production Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-primary" /> Registrar Producción Física
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={batchForm.handleSubmit((d) => createBatchMutation.mutate(d))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Código de Lote de Producción</Label>
              <Input {...batchForm.register("batchCode")} data-testid="input-batch-code" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha y Hora de Fabricación</Label>
              <Input type="datetime-local" {...batchForm.register("producedAt")} />
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad Producida (kg)</Label>
              <Input type="number" step="0.1" {...batchForm.register("quantity")} />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea {...batchForm.register("observations")} rows={2} />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setBatchOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createBatchMutation.isPending} data-testid="button-submit-batch">
                {createBatchMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
