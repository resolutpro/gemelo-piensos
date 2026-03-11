import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Package,
  Search,
  Eye,
  Loader2,
  FlaskConical,
  Calendar,
  Truck,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  RawMaterialLot,
  RawMaterial,
  Supplier,
  NirAnalysis,
} from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const lotFormSchema = z.object({
  lotCode: z.string().min(2, "Código obligatorio"),
  rawMaterialId: z.string().min(1, "Seleccione una materia prima"),
  supplierId: z.string().optional(),
  quantity: z.string().min(1, "Cantidad obligatoria"),
  receivedAt: z.string().min(1, "Fecha obligatoria"),
  destinationBin: z.string().optional(),
  truckPlate: z.string().optional(),
  driverName: z.string().optional(),
  observations: z.string().optional(),
  moisture: z.string().optional(),
  protein: z.string().optional(),
  fat: z.string().optional(),
  starch: z.string().optional(),
  fiber: z.string().optional(),
  ash: z.string().optional(),
  nirNotes: z.string().optional(),
});

type LotFormData = z.infer<typeof lotFormSchema>;

const STATUS_LABELS: Record<string, string> = {
  received: "Recibido",
  in_storage: "En Almacén",
  in_use: "En Uso",
  consumed: "Consumido",
};
const STATUS_VARIANTS: Record<string, string> = {
  received: "secondary",
  in_storage: "outline",
  in_use: "default",
  consumed: "secondary",
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">
          Todavía no hay lotes registrados
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Registre el primer lote de materia prima para comenzar
        </p>
      </div>
    </div>
  );
}

export default function ReceptionPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Estado para controlar qué lote se está viendo en el modal de detalles
  const [viewLotId, setViewLotId] = useState<number | null>(null);

  const { data: lots = [], isLoading: lotsLoading } = useQuery<
    (RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })[]
  >({
    queryKey: ["/api/lots"],
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["/api/raw-materials"],
  });
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Consultar los análisis NIR solo del lote que se abre en el modal
  const { data: lotAnalyses = [], isLoading: analysesLoading } = useQuery<
    NirAnalysis[]
  >({
    queryKey: ["/api/nir-analyses/lot", viewLotId],
    queryFn: async () => {
      if (!viewLotId) return [];
      const res = await fetch(`/api/nir-analyses/lot/${viewLotId}`);
      return res.json();
    },
    enabled: !!viewLotId, // Solo se ejecuta si hay un lote seleccionado
  });

  const form = useForm<LotFormData>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      lotCode: `LOT-${format(new Date(), "yy")}${String(Math.floor(Math.random() * 9000) + 1000)}`,
      receivedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      quantity: "",
    },
  });

  const createLotMutation = useMutation({
    mutationFn: async (data: LotFormData) => {
      const lotRes = await apiRequest("POST", "/api/lots", {
        lotCode: data.lotCode,
        rawMaterialId: data.rawMaterialId,
        supplierId: data.supplierId || null,
        quantity: data.quantity,
        receivedAt: data.receivedAt,
        destinationBin: data.destinationBin,
        truckPlate: data.truckPlate,
        driverName: data.driverName,
        observations: data.observations,
      });
      const lot = await lotRes.json();

      const hasNir =
        data.moisture ||
        data.protein ||
        data.fat ||
        data.starch ||
        data.fiber ||
        data.ash;
      if (hasNir) {
        await apiRequest("POST", "/api/nir-analyses", {
          lotId: lot.id,
          moisture: data.moisture || null,
          protein: data.protein || null,
          fat: data.fat || null,
          starch: data.starch || null,
          fiber: data.fiber || null,
          ash: data.ash || null,
          notes: data.nirNotes || null,
          analyzedAt: data.receivedAt,
        });
      }
      return lot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nir-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Lote registrado correctamente" });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({
        title: "Error al registrar lote",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const filteredLots = lots.filter(
    (lot) =>
      search === "" ||
      lot.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      (lot.rawMaterial?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (lot.supplier?.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const selectedLot = viewLotId ? lots.find((l) => l.id === viewLotId) : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Recepción de Materias Primas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro y control de lotes de entrada y análisis NIR
          </p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-new-lot">
          <Plus className="w-4 h-4 mr-2" /> Nueva Recepción
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lote, materia prima o proveedor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-lots"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {lotsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredLots.length === 0 && !search ? (
            <EmptyState />
          ) : filteredLots.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Sin resultados para "{search}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Código Lote
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Materia Prima
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tolva
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recepción
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLots.map((lot) => (
                    <tr
                      key={lot.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`row-lot-${lot.id}`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-foreground">
                        {lot.lotCode}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {lot.rawMaterial?.name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {lot.supplier?.name ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {lot.quantity.toLocaleString()} {lot.unit}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {lot.destinationBin ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {format(new Date(lot.receivedAt), "d MMM yyyy HH:mm", {
                          locale: es,
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            (STATUS_VARIANTS[lot.status] as any) ?? "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[lot.status] ?? lot.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {/* Se eliminó el <Link> y se cambió por un onClick para abrir el modal */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewLotId(lot.id)}
                          data-testid={`button-view-lot-${lot.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Lot Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Formulario previo (se mantiene intacto) */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Nueva Recepción
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((d) => createLotMutation.mutate(d))}
            className="space-y-6 pt-2"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Datos Generales
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Código de Lote</Label>
                  <Input
                    {...form.register("lotCode")}
                    data-testid="input-lot-code"
                  />
                  {form.formState.errors.lotCode && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.lotCode.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Cantidad (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("quantity")}
                    data-testid="input-lot-quantity"
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Materia Prima</Label>
                  <Select
                    onValueChange={(v) => form.setValue("rawMaterialId", v)}
                  >
                    <SelectTrigger data-testid="select-raw-material">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          Sin materias primas. Configúrelas primero.
                        </SelectItem>
                      ) : (
                        rawMaterials.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.rawMaterialId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.rawMaterialId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Proveedor</Label>
                  <Select onValueChange={(v) => form.setValue("supplierId", v)}>
                    <SelectTrigger data-testid="select-supplier">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          Sin proveedores registrados
                        </SelectItem>
                      ) : (
                        suppliers.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha y Hora de Recepción</Label>
                  <Input
                    type="datetime-local"
                    {...form.register("receivedAt")}
                    data-testid="input-received-at"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tolva Destino</Label>
                  <Input
                    {...form.register("destinationBin")}
                    placeholder="T-01"
                    data-testid="input-destination-bin"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Análisis NIR
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "moisture", label: "Humedad (%)" },
                  { key: "protein", label: "Proteína (%)" },
                  { key: "fat", label: "Grasa (%)" },
                  { key: "starch", label: "Almidón (%)" },
                  { key: "fiber", label: "Fibra (%)" },
                  { key: "ash", label: "Cenizas (%)" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register(key as any)}
                      data-testid={`input-nir-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Logística
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Matrícula Camión</Label>
                  <Input
                    {...form.register("truckPlate")}
                    placeholder="ABC-123"
                    data-testid="input-truck-plate"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre Conductor</Label>
                  <Input
                    {...form.register("driverName")}
                    data-testid="input-driver-name"
                  />
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label>Observaciones</Label>
                <Textarea
                  {...form.register("observations")}
                  rows={2}
                  data-testid="input-observations"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createLotMutation.isPending}
                data-testid="button-submit-lot"
              >
                {createLotMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Registrando...
                  </>
                ) : (
                  "Registrar Entrada"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Lot Details Modal */}
      <Dialog
        open={!!viewLotId}
        onOpenChange={(isOpen) => !isOpen && setViewLotId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="w-5 h-5 text-primary" />
              Detalles del Lote: {selectedLot?.lotCode}
            </DialogTitle>
          </DialogHeader>

          {selectedLot && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Materia Prima</p>
                  <p className="font-medium">
                    {selectedLot.rawMaterial?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Proveedor</p>
                  <p className="font-medium">
                    {selectedLot.supplier?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cantidad</p>
                  <p className="font-mono font-medium">
                    {selectedLot.quantity.toLocaleString()} {selectedLot.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tolva Destino</p>
                  <p className="font-medium">
                    {selectedLot.destinationBin ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha Recepción
                  </p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedLot.receivedAt),
                      "dd/MM/yyyy HH:mm",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <Badge
                    variant={
                      (STATUS_VARIANTS[selectedLot.status] as any) ??
                      "secondary"
                    }
                  >
                    {STATUS_LABELS[selectedLot.status] ?? selectedLot.status}
                  </Badge>
                </div>
                {selectedLot.truckPlate && (
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Matrícula
                    </p>
                    <p className="font-mono">{selectedLot.truckPlate}</p>
                  </div>
                )}
                {selectedLot.driverName && (
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <User className="w-3 h-3" /> Conductor
                    </p>
                    <p>{selectedLot.driverName}</p>
                  </div>
                )}
              </div>

              {selectedLot.observations && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      Observaciones
                    </p>
                    <p className="text-sm">{selectedLot.observations}</p>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  Análisis Nutricional (NIR)
                </h3>
                {analysesLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : lotAnalyses.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg text-center">
                    No hay datos nutricionales registrados para este lote.
                  </p>
                ) : (
                  lotAnalyses.map((analysis, index) => {
                    const params = [
                      { label: "Humedad", value: analysis.moisture, unit: "%" },
                      { label: "Proteína", value: analysis.protein, unit: "%" },
                      { label: "Grasa", value: analysis.fat, unit: "%" },
                      { label: "Almidón", value: analysis.starch, unit: "%" },
                      { label: "Fibra", value: analysis.fiber, unit: "%" },
                      { label: "Cenizas", value: analysis.ash, unit: "%" },
                    ].filter((p) => p.value !== null && p.value !== undefined);

                    return (
                      <div key={analysis.id} className="mb-4">
                        {index > 0 && <Separator className="my-4" />}
                        <p className="text-xs text-muted-foreground mb-3 font-medium">
                          Muestra del{" "}
                          {format(
                            new Date(analysis.analyzedAt),
                            "dd/MM/yyyy HH:mm",
                          )}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {params.map((p) => (
                            <div
                              key={p.label}
                              className="p-3 rounded-md bg-muted/50 border border-border text-center"
                            >
                              <p className="text-xs text-muted-foreground">
                                {p.label}
                              </p>
                              <p className="text-lg font-bold">
                                {p.value?.toFixed(2)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                  {p.unit}
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
