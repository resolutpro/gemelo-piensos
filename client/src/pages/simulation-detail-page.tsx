import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { ArrowLeft, Beaker, Scan, Info, ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default function SimulationDetailPage() {
  const [, params] = useRoute("/simulaciones/:id");
  const simId = params?.id;

  const { data: simulation, isLoading: simLoading } = useQuery({
    queryKey: [`/api/simulations/${simId}`],
    enabled: !!simId,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: [`/api/simulations/${simId}/items`],
    enabled: !!simId,
  });

  // Obtenemos todos los NIR y filtramos los que fueron asignados a esta mezcla
  const { data: allNir = [] } = useQuery({ queryKey: ["/api/nir-analyses"] });
  const assignedNir = allNir.filter(
    (n: any) => n.productionBatchId === Number(simId),
  );

  const { data: lots = [] } = useQuery({ queryKey: ["/api/lots"] });
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["/api/raw-materials"],
  });

  if (simLoading || itemsLoading) {
    return (
      <div className="p-8 text-center flex items-center justify-center">
        Cargando detalles de la mezcla...
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">
          Simulación / Mezcla no encontrada
        </h2>
        <Link href="/simulaciones">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Simulaciones
          </Button>
        </Link>
      </div>
    );
  }

  const getLotName = (lotId: number) => {
    const lot = lots.find((l: any) => l.id === lotId);
    if (!lot) return `Lote #${lotId}`;
    const rm = rawMaterials.find((r: any) => r.id === lot.rawMaterialId);
    return `${rm?.name || "Materia Prima"} (Cód: ${lot.lotCode})`;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/simulaciones">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {simulation.name}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            Estado de formulación:{" "}
            <Badge variant="outline">{simulation.status.toUpperCase()}</Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> Información de la Mezcla
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cantidad Total
                </p>
                <p className="text-lg font-semibold">
                  {simulation.totalQuantity} kg
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Fecha de Creación
                </p>
                <p>
                  {format(new Date(simulation.createdAt), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Predicción Nutricional (Teórica del Gemelo)
              </p>
              {simulation.estimatedProtein === null &&
              simulation.estimatedMoisture === null ? (
                <p className="text-sm italic text-muted-foreground">
                  Sin datos predictivos suficientes.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {simulation.estimatedProtein !== null && (
                    <Badge variant="default">
                      Prot: {simulation.estimatedProtein}%
                    </Badge>
                  )}
                  {simulation.estimatedMoisture !== null && (
                    <Badge variant="default">
                      Hum: {simulation.estimatedMoisture}%
                    </Badge>
                  )}
                  {simulation.estimatedFat !== null && (
                    <Badge variant="default">
                      Gra: {simulation.estimatedFat}%
                    </Badge>
                  )}
                  {simulation.estimatedStarch !== null && (
                    <Badge variant="default">
                      Alm: {simulation.estimatedStarch}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Análisis Espectrómetro (NIR) Real
            </CardTitle>
            <CardDescription>
              Mediciones físicas tomadas sobre el producto mezclado final
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedNir.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
                <p>No hay lecturas físicas NIR asociadas a esta mezcla aún.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Valores Nutricionales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedNir.map((nir: any) => (
                    <TableRow key={nir.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(nir.analyzedAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {nir.protein !== null && (
                            <Badge variant="secondary">
                              Prot: {nir.protein}%
                            </Badge>
                          )}
                          {nir.moisture !== null && (
                            <Badge variant="secondary">
                              Hum: {nir.moisture}%
                            </Badge>
                          )}
                          {nir.fat !== null && (
                            <Badge variant="secondary">Gra: {nir.fat}%</Badge>
                          )}
                          {nir.starch !== null && (
                            <Badge variant="secondary">
                              Alm: {nir.starch}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Ingredientes (Lotes) de la
              Mezcla
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 border-2 border-dashed rounded-md">
                No se han añadido ingredientes a esta simulación.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Materia Prima / Lote</TableHead>
                    <TableHead className="text-right">Cantidad (kg)</TableHead>
                    <TableHead className="text-right">% en Mezcla</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => {
                    const percentage =
                      simulation.totalQuantity > 0
                        ? (
                            (item.quantity / simulation.totalQuantity) *
                            100
                          ).toFixed(1)
                        : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Beaker className="w-4 h-4 text-muted-foreground" />{" "}
                          {getLotName(item.lotId)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} kg
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{percentage}%</Badge>
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
    </div>
  );
}
