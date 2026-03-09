import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Plus, Trash2, FlaskConical, AlertTriangle, CheckCircle2, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RawMaterialLot, RawMaterial, NirAnalysis } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type LotWithDetails = RawMaterialLot & { rawMaterial?: RawMaterial };
type LotWithNir = LotWithDetails & { nirAnalyses?: NirAnalysis[] };

type IngredientItem = {
  lotId: number;
  lot: LotWithNir;
  quantity: number;
};

const simSchema = z.object({
  name: z.string().min(2, "Nombre obligatorio"),
  targetMoistureMax: z.string().optional(),
  targetProteinMin: z.string().optional(),
  targetFatMin: z.string().optional(),
  targetFatMax: z.string().optional(),
  targetFiberMax: z.string().optional(),
  notes: z.string().optional(),
});

type SimFormData = z.infer<typeof simSchema>;

function NutriBar({ label, value, target, isMax }: { label: string; value: number | null; target: number | null; isMax?: boolean }) {
  if (value === null) return null;
  const inSpec = target === null ? null : isMax ? value <= target : value >= target;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${inSpec === null ? "bg-primary" : inSpec ? "bg-green-500" : "bg-destructive"}`}
          style={{ width: `${Math.min(100, (value / (target ?? value * 1.5)) * 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-mono font-semibold w-14 text-right">{value.toFixed(2)}%</span>
        {inSpec !== null && (
          inSpec
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            : <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
        )}
      </div>
    </div>
  );
}

export default function NewSimulationPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [addQty, setAddQty] = useState<string>("");
  const [estimated, setEstimated] = useState<{ moisture: number | null; protein: number | null; fat: number | null; starch: number | null; fiber: number | null; ash: number | null } | null>(null);

  const form = useForm<SimFormData>({ resolver: zodResolver(simSchema), defaultValues: { name: `Mezcla ${format(new Date(), "dd/MM/yyyy")}` } });

  const { data: lots = [] } = useQuery<LotWithNir[]>({
    queryKey: ["/api/lots"],
  });

  const availableLots = lots.filter(l => l.status !== "consumed" && !ingredients.find(i => i.lotId === l.id));

  const recalculate = useCallback((items: IngredientItem[]) => {
    if (items.length === 0) { setEstimated(null); return; }
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    let wMoisture = 0, wProtein = 0, wFat = 0, wStarch = 0, wFiber = 0, wAsh = 0;
    let hasMoisture = false, hasProtein = false, hasFat = false, hasStarch = false, hasFiber = false, hasAsh = false;
    for (const item of items) {
      const nirs = item.lot.nirAnalyses;
      if (nirs && nirs.length > 0) {
        const nir = nirs[nirs.length - 1];
        const w = item.quantity / totalQty;
        if (nir.moisture !== null) { wMoisture += (nir.moisture ?? 0) * w; hasMoisture = true; }
        if (nir.protein !== null) { wProtein += (nir.protein ?? 0) * w; hasProtein = true; }
        if (nir.fat !== null) { wFat += (nir.fat ?? 0) * w; hasFat = true; }
        if (nir.starch !== null) { wStarch += (nir.starch ?? 0) * w; hasStarch = true; }
        if (nir.fiber !== null) { wFiber += (nir.fiber ?? 0) * w; hasFiber = true; }
        if (nir.ash !== null) { wAsh += (nir.ash ?? 0) * w; hasAsh = true; }
      }
    }
    setEstimated({
      moisture: hasMoisture ? wMoisture : null,
      protein: hasProtein ? wProtein : null,
      fat: hasFat ? wFat : null,
      starch: hasStarch ? wStarch : null,
      fiber: hasFiber ? wFiber : null,
      ash: hasAsh ? wAsh : null,
    });
  }, []);

  const addIngredient = () => {
    if (!selectedLotId || !addQty || parseFloat(addQty) <= 0) return;
    const lot = lots.find(l => l.id === Number(selectedLotId));
    if (!lot) return;
    const newItems = [...ingredients, { lotId: Number(selectedLotId), lot, quantity: parseFloat(addQty) }];
    setIngredients(newItems);
    recalculate(newItems);
    setSelectedLotId("");
    setAddQty("");
  };

  const removeIngredient = (lotId: number) => {
    const newItems = ingredients.filter(i => i.lotId !== lotId);
    setIngredients(newItems);
    recalculate(newItems);
  };

  const createMutation = useMutation({
    mutationFn: async (data: SimFormData) => {
      const totalQty = ingredients.reduce((sum, i) => sum + i.quantity, 0);

      const simRes = await apiRequest("POST", "/api/simulations", {
        name: data.name,
        status: "draft",
        totalQuantity: totalQty,
        estimatedMoisture: estimated?.moisture ?? null,
        estimatedProtein: estimated?.protein ?? null,
        estimatedFat: estimated?.fat ?? null,
        estimatedStarch: estimated?.starch ?? null,
        estimatedFiber: estimated?.fiber ?? null,
        estimatedAsh: estimated?.ash ?? null,
        targetMoistureMax: data.targetMoistureMax ? parseFloat(data.targetMoistureMax) : null,
        targetProteinMin: data.targetProteinMin ? parseFloat(data.targetProteinMin) : null,
        targetFatMin: data.targetFatMin ? parseFloat(data.targetFatMin) : null,
        targetFatMax: data.targetFatMax ? parseFloat(data.targetFatMax) : null,
        targetFiberMax: data.targetFiberMax ? parseFloat(data.targetFiberMax) : null,
        notes: data.notes ?? null,
      });
      const sim = await simRes.json();

      for (const item of ingredients) {
        await apiRequest("POST", `/api/simulations/${sim.id}/items`, {
          lotId: item.lotId,
          quantity: item.quantity,
        });
      }

      return sim;
    },
    onSuccess: (sim) => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
      toast({ title: "Simulación creada correctamente" });
      navigate(`/simulaciones/${sim.id}`);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const totalQty = ingredients.reduce((sum, i) => sum + i.quantity, 0);
  const targets = form.watch();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/simulaciones">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nueva Simulación de Mezcla</h1>
          <p className="text-sm text-muted-foreground">Predicción nutricional por cálculo ponderado</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datos de la Simulación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nombre de la Simulación</Label>
                  <Input {...form.register("name")} data-testid="input-sim-name" />
                  {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea {...form.register("notes")} rows={2} placeholder="Observaciones..." />
                </div>
              </CardContent>
            </Card>

            {/* Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Objetivos de Receta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Humedad máx. (%)</Label>
                    <Input type="number" step="0.1" {...form.register("targetMoistureMax")} placeholder="14.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Proteína mín. (%)</Label>
                    <Input type="number" step="0.1" {...form.register("targetProteinMin")} placeholder="18.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Grasa mín. (%)</Label>
                    <Input type="number" step="0.1" {...form.register("targetFatMin")} placeholder="3.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Grasa máx. (%)</Label>
                    <Input type="number" step="0.1" {...form.register("targetFatMax")} placeholder="6.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fibra máx. (%)</Label>
                    <Input type="number" step="0.1" {...form.register("targetFiberMax")} placeholder="8.0" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ingredients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ingredientes / Lotes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add ingredient */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Seleccionar Lote</Label>
                    <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                      <SelectTrigger data-testid="select-ingredient-lot">
                        <SelectValue placeholder="Seleccione un lote..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLots.length === 0 ? (
                          <SelectItem value="_none" disabled>Sin lotes disponibles</SelectItem>
                        ) : (
                          availableLots.map((l) => {
                            const hasNir = (l as any).nirAnalyses?.length > 0;
                            return (
                              <SelectItem key={l.id} value={String(l.id)}>
                                {l.lotCode} — {l.rawMaterial?.name ?? "?"} {!hasNir ? "(sin NIR)" : ""}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-1.5">
                    <Label className="text-xs">Cantidad (kg)</Label>
                    <Input type="number" step="0.1" value={addQty} onChange={(e) => setAddQty(e.target.value)} data-testid="input-ingredient-qty" />
                  </div>
                  <Button type="button" size="icon" onClick={addIngredient} disabled={!selectedLotId || !addQty} data-testid="button-add-ingredient">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Ingredients table */}
                {ingredients.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    <FlaskConical className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    Añada lotes de materias primas para calcular la composición
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-muted-foreground">Lote</th>
                          <th className="text-left py-2 px-2 text-muted-foreground">Materia Prima</th>
                          <th className="text-right py-2 px-2 text-muted-foreground">Kg</th>
                          <th className="text-right py-2 px-2 text-muted-foreground">%</th>
                          <th className="text-right py-2 px-2 text-muted-foreground">NIR</th>
                          <th className="py-2 px-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((item) => {
                          const pct = totalQty > 0 ? (item.quantity / totalQty * 100).toFixed(1) : "0.0";
                          const nir = (item.lot as any).nirAnalyses?.[((item.lot as any).nirAnalyses?.length ?? 1) - 1];
                          return (
                            <tr key={item.lotId} className="border-b border-border last:border-0">
                              <td className="py-2 px-2 font-mono font-semibold">{item.lot.lotCode}</td>
                              <td className="py-2 px-2 text-foreground">{item.lot.rawMaterial?.name ?? "—"}</td>
                              <td className="py-2 px-2 text-right font-mono">{item.quantity.toLocaleString()}</td>
                              <td className="py-2 px-2 text-right font-mono text-muted-foreground">{pct}%</td>
                              <td className="py-2 px-2 text-right">
                                {nir ? (
                                  <span className="text-green-600 dark:text-green-400 text-xs">P: {nir.protein?.toFixed(1) ?? "—"}%</span>
                                ) : (
                                  <span className="text-yellow-600 text-xs flex items-center justify-end gap-1"><Info className="w-3 h-3" />Sin NIR</span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeIngredient(item.lotId)} className="h-6 w-6">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/50">
                          <td colSpan={2} className="py-2 px-2 font-semibold text-xs">TOTAL</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{totalQty.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right font-mono text-muted-foreground">100%</td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" /> Composición Estimada
                </CardTitle>
              </CardHeader>
              <CardContent>
                {estimated === null ? (
                  <div className="py-6 text-center space-y-2">
                    <FlaskConical className="w-6 h-6 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-xs text-muted-foreground">Añada ingredientes con análisis NIR para ver la predicción</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <NutriBar label="Humedad" value={estimated.moisture} target={targets.targetMoistureMax ? parseFloat(targets.targetMoistureMax) : null} isMax />
                    <NutriBar label="Proteína" value={estimated.protein} target={targets.targetProteinMin ? parseFloat(targets.targetProteinMin) : null} />
                    <NutriBar label="Grasa" value={estimated.fat} target={targets.targetFatMax ? parseFloat(targets.targetFatMax) : null} isMax />
                    <NutriBar label="Almidón" value={estimated.starch} target={null} />
                    <NutriBar label="Fibra" value={estimated.fiber} target={targets.targetFiberMax ? parseFloat(targets.targetFiberMax) : null} isMax />
                    <NutriBar label="Cenizas" value={estimated.ash} target={null} />

                    {ingredients.some(i => !(i.lot as any).nirAnalyses?.length) && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        Algunos ingredientes no tienen análisis NIR. La predicción es parcial.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total mezcla</span>
                  <span className="font-mono font-bold">{totalQty.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ingredientes</span>
                  <span className="font-mono font-bold">{ingredients.length}</span>
                </div>
                <Separator />
                <Button type="submit" className="w-full" disabled={createMutation.isPending || ingredients.length === 0} data-testid="button-create-simulation">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</> : "Crear Simulación"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
