import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Scan,
  Beaker,
  CheckCircle,
  Package,
  Plus,
  Save,
  History,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

export default function EspectrometroPage() {
  const { toast } = useToast();

  // Queries
  const { data: nirAnalyses = [] } = useQuery({
    queryKey: ["/api/nir-analyses"],
  });
  const { data: lots = [] } = useQuery({ queryKey: ["/api/lots"] });
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["/api/raw-materials"],
  });
  const { data: suppliers = [] } = useQuery({ queryKey: ["/api/suppliers"] });
  const { data: simulations = [] } = useQuery({
    queryKey: ["/api/simulations"],
  });

  // Filtrado de estados de los análisis
  const unassignedAnalyses = nirAnalyses.filter(
    (a: any) => !a.lotId && !a.productionBatchId,
  );
  const assignedAnalyses = nirAnalyses.filter(
    (a: any) => a.lotId || a.productionBatchId,
  );

  // Determinar qué Lotes y Mezclas YA tienen un análisis asignado para filtrarlos
  const assignedLotIds = new Set(
    assignedAnalyses.map((a: any) => a.lotId).filter(Boolean),
  );
  const assignedBatchIds = new Set(
    assignedAnalyses.map((a: any) => a.productionBatchId).filter(Boolean),
  );

  // Opciones disponibles (que NO están en los Sets anteriores)
  const availableLots = lots.filter((l: any) => !assignedLotIds.has(l.id));
  const availableSimulations = simulations.filter(
    (s: any) => !assignedBatchIds.has(s.id),
  );

  // Estados
  const [assignments, setAssignments] = useState<
    Record<number, { type: "lot" | "batch"; targetId: string }>
  >({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnalysis, setNewAnalysis] = useState({
    protein: "",
    moisture: "",
    fat: "",
    starch: "",
    fiber: "",
    ash: "",
    type: "unassigned",
    targetId: "",
  });

  // Funciones de ayuda para mostrar nombres en lugar de IDs
  const getLotDisplayName = (lotId: number) => {
    const lot = lots.find((l: any) => l.id === lotId);
    if (!lot) return `Lote #${lotId}`;
    const rm = rawMaterials.find((r: any) => r.id === lot.rawMaterialId);
    const sup = suppliers.find((s: any) => s.id === lot.supplierId);

    const rmName = rm?.name || "Materia Prima";
    const supName = sup?.name ? ` - ${sup.name}` : "";
    return `${rmName}${supName} (Cód: ${lot.lotCode})`;
  };

  const getSimulationDisplayName = (simId: number) => {
    const sim = simulations.find((s: any) => s.id === simId);
    return sim ? `Mezcla: ${sim.name}` : `Mezcla #${simId}`;
  };

  // Mutación para ASIGNAR mediciones
  const assignMutation = useMutation({
    mutationFn: async ({
      id,
      lotId,
      productionBatchId,
    }: {
      id: number;
      lotId?: number;
      productionBatchId?: number;
    }) => {
      const payload = lotId ? { lotId } : { productionBatchId };
      const res = await apiRequest("PATCH", `/api/nir-analyses/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nir-analyses"] });
      toast({
        title: "Asignación exitosa",
        description: "La medición NIR se ha enlazado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al asignar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para CREAR una nueva medición manual
  const createMutation = useMutation({
    mutationFn: async (data: typeof newAnalysis) => {
      const payload: any = {
        protein: data.protein ? parseFloat(data.protein) : null,
        moisture: data.moisture ? parseFloat(data.moisture) : null,
        fat: data.fat ? parseFloat(data.fat) : null,
        starch: data.starch ? parseFloat(data.starch) : null,
      };

      if (data.type === "lot" && data.targetId)
        payload.lotId = parseInt(data.targetId);
      if (data.type === "batch" && data.targetId)
        payload.productionBatchId = parseInt(data.targetId);

      const res = await apiRequest("POST", "/api/nir-analyses", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nir-analyses"] });
      setIsDialogOpen(false);
      setNewAnalysis({
        protein: "",
        moisture: "",
        fat: "",
        starch: "",
        fiber: "",
        ash: "",
        type: "unassigned",
        targetId: "",
      });
      toast({
        title: "Medición guardada",
        description: "El análisis manual se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para ELIMINAR una medición
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/nir-analyses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nir-analyses"] });
      toast({
        title: "Medición eliminada",
        description: "El análisis se ha eliminado permanentemente del sistema.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignmentChange = (
    analysisId: number,
    field: "type" | "targetId",
    value: string,
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [analysisId]: {
        ...prev[analysisId],
        [field]: value,
        ...(field === "type" ? { targetId: "" } : {}),
      },
    }));
  };

  const handleAssign = (analysisId: number) => {
    const assignment = assignments[analysisId];
    if (!assignment || !assignment.targetId) return;

    if (assignment.type === "lot") {
      assignMutation.mutate({
        id: analysisId,
        lotId: parseInt(assignment.targetId),
      });
    } else {
      assignMutation.mutate({
        id: analysisId,
        productionBatchId: parseInt(assignment.targetId),
      });
    }
  };

  const handleCreateSubmit = () => {
    createMutation.mutate(newAnalysis);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Espectrómetro NIR
          </h2>
          <p className="text-muted-foreground">
            Gestiona las lecturas entrantes y revisa el histórico de mediciones.
          </p>
        </div>

        {/* DIÁLOGO PARA REGISTRO MANUAL */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Registro Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Análisis NIR</DialogTitle>
              <DialogDescription>
                Introduce los valores nutricionales obtenidos y asígnalos a un
                lote o mezcla.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proteína (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newAnalysis.protein}
                    onChange={(e) =>
                      setNewAnalysis({
                        ...newAnalysis,
                        protein: e.target.value,
                      })
                    }
                    placeholder="Ej: 16.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Humedad (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newAnalysis.moisture}
                    onChange={(e) =>
                      setNewAnalysis({
                        ...newAnalysis,
                        moisture: e.target.value,
                      })
                    }
                    placeholder="Ej: 12.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grasa (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newAnalysis.fat}
                    onChange={(e) =>
                      setNewAnalysis({ ...newAnalysis, fat: e.target.value })
                    }
                    placeholder="Ej: 4.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Almidón (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newAnalysis.starch}
                    onChange={(e) =>
                      setNewAnalysis({ ...newAnalysis, starch: e.target.value })
                    }
                    placeholder="Ej: 60.5"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <Label>Asignar a (Opcional)</Label>
                <Select
                  value={newAnalysis.type}
                  onValueChange={(val) =>
                    setNewAnalysis({ ...newAnalysis, type: val, targetId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      Dejar pendiente (Sin asignar)
                    </SelectItem>
                    <SelectItem value="lot">Materia Prima</SelectItem>
                    <SelectItem value="batch">Mezcla</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAnalysis.type !== "unassigned" && (
                <div className="space-y-2">
                  <Label>Selecciona el Destino (Solo sin asignar)</Label>
                  <Select
                    value={newAnalysis.targetId}
                    onValueChange={(val) =>
                      setNewAnalysis({ ...newAnalysis, targetId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {newAnalysis.type === "lot" &&
                        (availableLots.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No hay materias primas sin asignar
                          </SelectItem>
                        ) : (
                          availableLots.map((l: any) => (
                            <SelectItem key={l.id} value={l.id.toString()}>
                              {getLotDisplayName(l.id)}
                            </SelectItem>
                          ))
                        ))}
                      {newAnalysis.type === "batch" &&
                        (availableSimulations.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No hay mezclas sin asignar
                          </SelectItem>
                        ) : (
                          availableSimulations.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              Mezcla: {s.name}
                            </SelectItem>
                          ))
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" /> Guardar Medición
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pendientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendientes" className="relative">
            Pendientes de Asignar
            {unassignedAnalyses.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 w-5 h-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
                {unassignedAnalyses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="asignadas">Histórico Asignadas</TabsTrigger>
        </TabsList>

        {/* PESTAÑA: PENDIENTES */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Pendientes de Enlazar
              </CardTitle>
              <CardDescription>
                Mediciones huérfanas esperando ser asociadas a la materia prima
                o la mezcla correspondiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  <CheckCircle className="mx-auto h-8 w-8 mb-3 text-green-500/50" />
                  <p>Genial, no hay ninguna medición pendiente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha / Hora</TableHead>
                      <TableHead>Valores Nutricionales</TableHead>
                      <TableHead>Tipo de Destino</TableHead>
                      <TableHead>Seleccionar Destino</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedAnalyses.map((analysis: any) => {
                      const currentAssignment = assignments[analysis.id];
                      return (
                        <TableRow key={analysis.id}>
                          <TableCell>
                            <div className="font-medium">#{analysis.id}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(analysis.analyzedAt),
                                "dd/MM/yyyy HH:mm",
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {analysis.protein !== null && (
                                <Badge variant="outline">
                                  Prot: {analysis.protein}%
                                </Badge>
                              )}
                              {analysis.moisture !== null && (
                                <Badge variant="outline">
                                  Hum: {analysis.moisture}%
                                </Badge>
                              )}
                              {analysis.fat !== null && (
                                <Badge variant="outline">
                                  Gra: {analysis.fat}%
                                </Badge>
                              )}
                              {analysis.starch !== null && (
                                <Badge
                                  variant="outline"
                                  className="hidden sm:inline-flex"
                                >
                                  Alm: {analysis.starch}%
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={currentAssignment?.type || ""}
                              onValueChange={(val) =>
                                handleAssignmentChange(analysis.id, "type", val)
                              }
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lot">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Materia
                                    Prima
                                  </div>
                                </SelectItem>
                                <SelectItem value="batch">
                                  <div className="flex items-center gap-2">
                                    <Beaker className="h-4 w-4" /> Mezcla
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              disabled={!currentAssignment?.type}
                              value={currentAssignment?.targetId || ""}
                              onValueChange={(val) =>
                                handleAssignmentChange(
                                  analysis.id,
                                  "targetId",
                                  val,
                                )
                              }
                            >
                              <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Elegir Lote o Mezcla..." />
                              </SelectTrigger>
                              <SelectContent>
                                {currentAssignment?.type === "lot" &&
                                  (availableLots.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No hay materias primas disponibles
                                    </SelectItem>
                                  ) : (
                                    availableLots.map((l: any) => (
                                      <SelectItem
                                        key={l.id}
                                        value={l.id.toString()}
                                      >
                                        {getLotDisplayName(l.id)}
                                      </SelectItem>
                                    ))
                                  ))}
                                {currentAssignment?.type === "batch" &&
                                  (availableSimulations.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No hay mezclas disponibles
                                    </SelectItem>
                                  ) : (
                                    availableSimulations.map((s: any) => (
                                      <SelectItem
                                        key={s.id}
                                        value={s.id.toString()}
                                      >
                                        Mezcla: {s.name}
                                      </SelectItem>
                                    ))
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={
                                  !currentAssignment?.targetId ||
                                  assignMutation.isPending
                                }
                                onClick={() => handleAssign(analysis.id)}
                              >
                                Asignar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "¿Seguro que deseas eliminar este registro pendiente?",
                                    )
                                  ) {
                                    deleteMutation.mutate(analysis.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA: ASIGNADAS */}
        <TabsContent value="asignadas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Mediciones Asignadas
              </CardTitle>
              <CardDescription>
                Registro de todas las analíticas de espectrómetro que ya se han
                vinculado correctamente a tu flujo de trazabilidad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  <p>Aún no hay mediciones asignadas al histórico</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha / Hora</TableHead>
                      <TableHead>Asignado A</TableHead>
                      <TableHead>Proteína</TableHead>
                      <TableHead>Humedad</TableHead>
                      <TableHead>Grasa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedAnalyses.map((analysis: any) => (
                      <TableRow key={analysis.id}>
                        <TableCell>
                          <div className="text-sm">
                            {format(
                              new Date(analysis.analyzedAt),
                              "dd/MM/yyyy HH:mm",
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {analysis.lotId ? (
                            <span className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              <Package className="h-4 w-4 mr-2" />
                              {getLotDisplayName(analysis.lotId)}
                            </span>
                          ) : analysis.productionBatchId ? (
                            <span className="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              <Beaker className="h-4 w-4 mr-2" />
                              {getSimulationDisplayName(
                                analysis.productionBatchId,
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Desconocido
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {analysis.protein ? `${analysis.protein}%` : "-"}
                        </TableCell>
                        <TableCell>
                          {analysis.moisture ? `${analysis.moisture}%` : "-"}
                        </TableCell>
                        <TableCell>
                          {analysis.fat ? `${analysis.fat}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "¿Seguro que deseas eliminar este análisis histórico permanentemente?",
                                )
                              ) {
                                deleteMutation.mutate(analysis.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
