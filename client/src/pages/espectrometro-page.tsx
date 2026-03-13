import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { Scan, Beaker, CheckCircle, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function EspectrometroPage() {
  const { toast } = useToast();

  // Queries
  const { data: nirAnalyses = [] } = useQuery({
    queryKey: ["/api/nir-analyses"],
  });
  const { data: lots = [] } = useQuery({ queryKey: ["/api/lots"] });
  const { data: batches = [] } = useQuery({
    queryKey: ["/api/production-batches"],
  });

  // Filtrar solo los análisis que NO tienen lotId ni productionBatchId
  const unassignedAnalyses = nirAnalyses.filter(
    (a: any) => !a.lotId && !a.productionBatchId,
  );

  // Estados temporales para la asignación en la UI
  const [assignments, setAssignments] = useState<
    Record<number, { type: "lot" | "batch"; targetId: string }>
  >({});

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
        // Reset targetId if changing type
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Espectrómetro NIR</h2>
      </div>
      <p className="text-muted-foreground">
        Gestiona y asigna las lecturas entrantes del espectrómetro portátil o
        in-line.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Mediciones Pendientes de Asignar ({unassignedAnalyses.length})
          </CardTitle>
          <CardDescription>
            Estas mediciones han llegado por API pero aún no se han enlazado a
            ninguna recepción ni lote de producción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unassignedAnalyses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
              <CheckCircle className="mx-auto h-8 w-8 mb-3 text-green-500/50" />
              <p>Todas las mediciones están asignadas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Valores Nutricionales</TableHead>
                  <TableHead>Tipo de Destino</TableHead>
                  <TableHead>Seleccionar Destino</TableHead>
                  <TableHead>Acción</TableHead>
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
                          {analysis.protein && (
                            <Badge variant="outline">
                              Prot: {analysis.protein}%
                            </Badge>
                          )}
                          {analysis.moisture && (
                            <Badge variant="outline">
                              Hum: {analysis.moisture}%
                            </Badge>
                          )}
                          {analysis.fat && (
                            <Badge variant="outline">
                              Gra: {analysis.fat}%
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
                                <Package className="h-4 w-4" /> Materia Prima
                              </div>
                            </SelectItem>
                            <SelectItem value="batch">
                              <div className="flex items-center gap-2">
                                <Beaker className="h-4 w-4" /> Simulación/Mezcla
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
                            handleAssignmentChange(analysis.id, "targetId", val)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Elegir Lote/Mezcla..." />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAssignment?.type === "lot" &&
                              lots.map((l: any) => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                  {l.lotCode} - Quedan {l.quantity} kg
                                </SelectItem>
                              ))}
                            {currentAssignment?.type === "batch" &&
                              batches.map((b: any) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  Mezcla: {b.batchCode}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
