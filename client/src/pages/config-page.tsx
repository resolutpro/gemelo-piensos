import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Building2, MapPin, FlaskConical, Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Zone, RawMaterial, Supplier } from "@shared/schema";

// Schemas
const zoneSchema = z.object({ name: z.string().min(2, "Nombre obligatorio"), description: z.string().optional(), location: z.string().optional() });
const materialSchema = z.object({
  name: z.string().min(2, "Nombre obligatorio"),
  code: z.string().min(2, "Código obligatorio"),
  category: z.enum(["cereal", "legume", "protein", "fat", "mineral", "additive", "other"]),
  unit: z.string().default("kg"),
  targetMoistureMax: z.string().optional(),
  targetProteinMin: z.string().optional(),
  targetFatMax: z.string().optional(),
  targetFiberMax: z.string().optional(),
  notes: z.string().optional(),
});
const supplierSchema = z.object({ name: z.string().min(2, "Nombre obligatorio"), code: z.string().optional(), country: z.string().optional(), contactEmail: z.string().email("Email inválido").optional().or(z.literal("")), contactPhone: z.string().optional(), notes: z.string().optional() });

type ZoneFormData = z.infer<typeof zoneSchema>;
type MaterialFormData = z.infer<typeof materialSchema>;
type SupplierFormData = z.infer<typeof supplierSchema>;

const CATEGORY_LABELS: Record<string, string> = { cereal: "Cereal", legume: "Leguminosa", protein: "Proteína", fat: "Grasa/Aceite", mineral: "Mineral", additive: "Aditivo", other: "Otro" };

function EntityCard({ name, code, badge, onDelete }: { name: string; code?: string; badge?: string; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {code && <span className="text-xs text-muted-foreground font-mono">{code}</span>}
        {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
      </div>
      {onDelete && (
        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function ConfigPage() {
  const { toast } = useToast();
  const [zoneOpen, setZoneOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const { data: zones = [], isLoading: zonesLoading } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });
  const { data: rawMaterials = [], isLoading: materialsLoading } = useQuery<RawMaterial[]>({ queryKey: ["/api/raw-materials"] });
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const zoneForm = useForm<ZoneFormData>({ resolver: zodResolver(zoneSchema), defaultValues: { name: "" } });
  const materialForm = useForm<MaterialFormData>({ resolver: zodResolver(materialSchema), defaultValues: { unit: "kg", code: "" } });
  const supplierForm = useForm<SupplierFormData>({ resolver: zodResolver(supplierSchema), defaultValues: {} });

  const createZone = useMutation({
    mutationFn: async (data: ZoneFormData) => { const r = await apiRequest("POST", "/api/zones", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/zones"] }); toast({ title: "Zona creada" }); setZoneOpen(false); zoneForm.reset(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createMaterial = useMutation({
    mutationFn: async (data: MaterialFormData) => { const r = await apiRequest("POST", "/api/raw-materials", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] }); toast({ title: "Materia prima creada" }); setMaterialOpen(false); materialForm.reset(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createSupplier = useMutation({
    mutationFn: async (data: SupplierFormData) => { const r = await apiRequest("POST", "/api/suppliers", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); toast({ title: "Proveedor creado" }); setSupplierOpen(false); supplierForm.reset(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/zones/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/zones"] }); toast({ title: "Zona eliminada" }); },
    onError: (err: any) => toast({ title: "No se puede eliminar", description: "La zona puede estar en uso", variant: "destructive" }),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/raw-materials/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] }); toast({ title: "Materia prima eliminada" }); },
    onError: (err: any) => toast({ title: "No se puede eliminar", description: "La materia prima puede estar en uso", variant: "destructive" }),
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/suppliers/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] }); toast({ title: "Proveedor eliminado" }); },
    onError: (err: any) => toast({ title: "No se puede eliminar", description: "El proveedor puede estar en uso", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Gestión de catálogos maestros del sistema</p>
      </div>

      <Tabs defaultValue="materials">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="materials">Materias Primas</TabsTrigger>
          <TabsTrigger value="zones">Zonas</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        {/* Materials */}
        <TabsContent value="materials" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Materias Primas</p>
              <p className="text-xs text-muted-foreground">Catálogo de ingredientes para la fábrica</p>
            </div>
            <Button size="sm" onClick={() => setMaterialOpen(true)} data-testid="button-new-material">
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Materia Prima
            </Button>
          </div>

          {Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
            const catMaterials = rawMaterials.filter(m => m.category === cat);
            if (catMaterials.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{catLabel} ({catMaterials.length})</p>
                {catMaterials.map((m) => (
                  <EntityCard
                    key={m.id}
                    name={m.name}
                    code={m.code}
                    badge={m.unit}
                    onDelete={() => deleteMaterial.mutate(m.id)}
                  />
                ))}
              </div>
            );
          })}

          {rawMaterials.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <FlaskConical className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Sin materias primas. Añada las primeras para comenzar.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Zones */}
        <TabsContent value="zones" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Zonas de la Fábrica</p>
              <p className="text-xs text-muted-foreground">Divisiones geográficas para sensores y gestión</p>
            </div>
            <Button size="sm" onClick={() => setZoneOpen(true)} data-testid="button-new-zone">
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Zona
            </Button>
          </div>
          <div className="space-y-2">
            {zones.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <MapPin className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Sin zonas definidas. Cree zonas para organizar los sensores.</p>
                </CardContent>
              </Card>
            ) : (
              zones.map((z) => (
                <EntityCard
                  key={z.id}
                  name={z.name}
                  code={z.location ?? undefined}
                  badge={z.description ?? undefined}
                  onDelete={() => deleteZone.mutate(z.id)}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Proveedores</p>
              <p className="text-xs text-muted-foreground">Empresas suministradoras de materias primas</p>
            </div>
            <Button size="sm" onClick={() => setSupplierOpen(true)} data-testid="button-new-supplier">
              <Plus className="w-4 h-4 mr-1.5" /> Nuevo Proveedor
            </Button>
          </div>
          <div className="space-y-2">
            {suppliers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <Building2 className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Sin proveedores. Añada proveedores para asociarlos a los lotes.</p>
                </CardContent>
              </Card>
            ) : (
              suppliers.map((s) => (
                <EntityCard
                  key={s.id}
                  name={s.name}
                  code={s.code ?? undefined}
                  badge={s.country ?? undefined}
                  onDelete={() => deleteSupplier.mutate(s.id)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={zoneOpen} onOpenChange={setZoneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Zona</DialogTitle></DialogHeader>
          <form onSubmit={zoneForm.handleSubmit((d) => createZone.mutate(d))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...zoneForm.register("name")} placeholder="Sala de Molienda" data-testid="input-zone-name" />
              {zoneForm.formState.errors.name && <p className="text-xs text-destructive">{zoneForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Ubicación / Referencia</Label>
              <Input {...zoneForm.register("location")} placeholder="Planta 2, Sector A" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input {...zoneForm.register("description")} />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setZoneOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createZone.isPending} data-testid="button-submit-zone">
                {createZone.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Nueva Materia Prima</DialogTitle></DialogHeader>
          <form onSubmit={materialForm.handleSubmit((d) => createMaterial.mutate(d))} className="flex flex-col h-full">
            <div className="overflow-y-auto flex-1 space-y-4 pt-2 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input {...materialForm.register("name")} placeholder="Maíz Grano" data-testid="input-material-name" />
                  {materialForm.formState.errors.name && <p className="text-xs text-destructive">{materialForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Código *</Label>
                  <Input {...materialForm.register("code")} placeholder="MAZ-001" data-testid="input-material-code" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select onValueChange={(v) => materialForm.setValue("category", v as any)}>
                    <SelectTrigger data-testid="select-material-category"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unidad</Label>
                  <Input {...materialForm.register("unit")} placeholder="kg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Humedad máx. (%)</Label>
                  <Input type="number" step="0.1" {...materialForm.register("targetMoistureMax")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Proteína mín. (%)</Label>
                  <Input type="number" step="0.1" {...materialForm.register("targetProteinMin")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Grasa máx. (%)</Label>
                  <Input type="number" step="0.1" {...materialForm.register("targetFatMax")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fibra máx. (%)</Label>
                  <Input type="number" step="0.1" {...materialForm.register("targetFiberMax")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea {...materialForm.register("notes")} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setMaterialOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMaterial.isPending} data-testid="button-submit-material">
                {createMaterial.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Nuevo Proveedor</DialogTitle></DialogHeader>
          <form onSubmit={supplierForm.handleSubmit((d) => createSupplier.mutate(d))} className="flex flex-col h-full">
            <div className="overflow-y-auto flex-1 space-y-4 pt-2 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input {...supplierForm.register("name")} placeholder="Agricola SL" data-testid="input-supplier-name" />
                  {supplierForm.formState.errors.name && <p className="text-xs text-destructive">{supplierForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input {...supplierForm.register("code")} placeholder="PROV-001" />
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Input {...supplierForm.register("country")} placeholder="España" />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input {...supplierForm.register("contactPhone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email de Contacto</Label>
                <Input type="email" {...supplierForm.register("contactEmail")} />
                {supplierForm.formState.errors.contactEmail && <p className="text-xs text-destructive">{supplierForm.formState.errors.contactEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea {...supplierForm.register("notes")} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setSupplierOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createSupplier.isPending} data-testid="button-submit-supplier">
                {createSupplier.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
