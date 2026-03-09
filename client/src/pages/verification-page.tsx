import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearch } from "wouter";
import { CheckCircle2, TrendingUp, TrendingDown, Minus, Loader2, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProductionBatch, MixSimulation, FinalProductAnalysis, Recommendation } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const analysisSchema = z.object({
  batchId: z.string().min(1, "Seleccione un lote"),
  moisture: z.string().optional(),
  protein: z.string().optional(),
  fat: z.string().optional(),
  starch: z.string().optional(),
  fiber: z.string().optional(),
  ash: z.string().optional(),
  notes: z.string().optional(),
  analyzedAt: z.string().min(1),
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

type BatchWithSim = ProductionBatch & { simulation?: MixSimulation };

function DeviationBadge({ deviation }: { deviation: number | null | undefined }) {
  if (deviation === null || deviation === undefined) return <span className="text-muted-foreground">—</span>;
  const abs = Math.abs(deviation);
  const Icon = deviation > 0.1 ? TrendingUp : deviation < -0.1 ? TrendingDown : Minus;
  const color = abs > 1.0 ? "text-destructive" : abs > 0.5 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400";
  return (
    <span className={`flex items-center gap-1 font-mono text-sm ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {deviation > 0 ? "+" : ""}{deviation.toFixed(2)}%
    </span>
  );
}

export default function VerificationPage() {
  const { toast } = useToast();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const defaultBatchId = searchParams.get("batchId") ?? "";

  const form = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      batchId: defaultBatchId,
      analyzedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<BatchWithSim[]>({ queryKey: ["/api/production-batches"] });
  const { data: analyses = [], isLoading: analysesLoading } = useQuery<FinalProductAnalysis[]>({ queryKey: ["/api/final-analyses"] });
  const { data: recommendations = [] } = useQuery<Recommendation[]>({ queryKey: ["/api/recommendations"] });

  const watchBatchId = form.watch("batchId");
  const selectedBatch = batches.find(b => String(b.id) === watchBatchId);
  const existingAnalysis = analyses.find(a => String(a.batchId) === watchBatchId);

  const createMutation = useMutation({
    mutationFn: async (data: AnalysisFormData) => {
      const res = await apiRequest("POST", "/api/final-analyses", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/final-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({ title: "Análisis final registrado y comparación calculada" });
      form.reset({ analyzedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"), batchId: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const PARAMS = [
    { key: "moisture", label: "Humedad" },
    { key: "protein", label: "Proteína" },
    { key: "fat", label: "Grasa" },
    { key: "starch", label: "Almidón" },
    { key: "fiber", label: "Fibra" },
    { key: "ash", label: "Cenizas" },
  ];

  const analyzedBatchIds = new Set(analyses.map(a => a.batchId));
  const pendingBatches = batches.filter(b => !analyzedBatchIds.has(b.id));

  const chartData = analyses.slice(0, 5).reverse().map((a) => {
    const batch = batches.find(b => b.id === a.batchId);
    return {
      name: batch?.batchCode ?? String(a.batchId),
      predicha: selectedBatch?.simulation ? null : null,
      real: a.protein ?? 0,
      desviacion: Math.abs(a.proteinDeviation ?? 0),
    };
  });

  const recentRecs = recommendations.slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Verificación del Producto Final</h1>
        <p className="text-sm text-muted-foreground">Análisis NIR del pienso terminado y comparación con predicción</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> Nuevo Análisis NIR Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Lote de Producción</Label>
                <Select value={watchBatchId} onValueChange={(v) => form.setValue("batchId", v)}>
                  <SelectTrigger data-testid="select-batch-to-verify">
                    <SelectValue placeholder="Seleccione un lote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingBatches.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {batches.length === 0 ? "Sin lotes de producción" : "Todos los lotes verificados"}
                      </SelectItem>
                    ) : (
                      pendingBatches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.batchCode} — {b.simulation?.name ?? "?"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.batchId && <p className="text-xs text-destructive">{form.formState.errors.batchId.message}</p>}
              </div>

              {selectedBatch && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p className="font-semibold">{selectedBatch.batchCode}</p>
                  <p className="text-xs text-muted-foreground">{selectedBatch.simulation?.name} · {selectedBatch.quantity.toLocaleString()} kg · {format(new Date(selectedBatch.producedAt), "d MMM yyyy", { locale: es })}</p>
                  {selectedBatch.simulation?.estimatedProtein !== null && selectedBatch.simulation?.estimatedProtein !== undefined && (
                    <p className="text-xs text-primary">Proteína predicha: {selectedBatch.simulation.estimatedProtein.toFixed(2)}%</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Fecha Análisis</Label>
                <Input type="datetime-local" {...form.register("analyzedAt")} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {PARAMS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label} (%)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" {...form.register(key as any)} data-testid={`input-final-${key}`} />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea {...form.register("notes")} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-final-analysis">
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</> : "Registrar y Comparar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent analyses */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimas Verificaciones</CardTitle>
              <CardDescription>Comparación predicción vs. realidad</CardDescription>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : analyses.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Sin verificaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analyses.slice(0, 3).map((a) => {
                    const batch = batches.find(b => b.id === a.batchId);
                    return (
                      <div key={a.id} className="p-3 rounded-lg bg-card border border-card-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">{batch?.batchCode ?? `Lote #${a.batchId}`}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(a.analyzedAt), "d MMM HH:mm", { locale: es })}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                          {PARAMS.filter(p => (a as any)[p.key] !== null).slice(0, 6).map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className="text-muted-foreground">{label}:</span>
                              <span className="font-mono font-semibold">{((a as any)[key] as number).toFixed(1)}%</span>
                              <DeviationBadge deviation={(a as any)[`${key}Deviation`]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {recentRecs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recomendaciones Generadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentRecs.map((rec) => (
                  <div key={rec.id} className={`p-3 rounded-lg text-xs border ${rec.severity === "warning" ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30" : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"}`}>
                    <p className="font-semibold text-foreground">{rec.title}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
