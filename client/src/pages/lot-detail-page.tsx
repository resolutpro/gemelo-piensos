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
import { ArrowLeft, Package, Scan, Calendar, Truck, User } from "lucide-react";
import { format } from "date-fns";

export default function LotDetailPage() {
  const [, params] = useRoute("/recepcion/:id");
  const lotId = params?.id;

  const { data: lot, isLoading: lotLoading } = useQuery({
    queryKey: [`/api/lots/${lotId}`],
    enabled: !!lotId,
  });

  const { data: nirAnalyses = [] } = useQuery({
    queryKey: [`/api/nir-analyses/lot/${lotId}`],
    enabled: !!lotId,
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["/api/raw-materials"],
  });
  const { data: suppliers = [] } = useQuery({ queryKey: ["/api/suppliers"] });

  if (lotLoading) {
    return (
      <div className="p-8 text-center flex items-center justify-center">
        Cargando detalles del lote...
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">Lote no encontrado</h2>
        <Link href="/recepcion">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Recepción
          </Button>
        </Link>
      </div>
    );
  }

  const rawMaterial = rawMaterials.find(
    (rm: any) => rm.id === lot.rawMaterialId,
  );
  const supplier = suppliers.find((s: any) => s.id === lot.supplierId);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/recepcion">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Lote {lot.lotCode}
          </h2>
          <p className="text-muted-foreground">
            Detalles de la recepción e histórico analítico
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Datos de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Materia Prima
                </p>
                <p className="text-lg font-semibold">
                  {rawMaterial?.name || "Desconocida"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Proveedor
                </p>
                <p className="text-lg font-semibold">
                  {supplier?.name || "Sin proveedor"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Fecha
                </p>
                <p>{format(new Date(lot.receivedAt), "dd/MM/yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-4 w-4" /> Cantidad
                </p>
                <p>
                  {lot.quantity} {lot.unit}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Truck className="h-4 w-4" /> Matrícula
                </p>
                <p>{lot.truckPlate || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" /> Conductor
                </p>
                <p>{lot.driverName || "-"}</p>
              </div>
            </div>
            {lot.observations && (
              <div className="pt-4 mt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  Observaciones
                </p>
                <p className="text-sm">{lot.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Análisis Espectrómetro (NIR)
            </CardTitle>
            <CardDescription>
              Mediciones físicas de calidad tomadas en la recepción
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nirAnalyses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-md">
                <p>Aún no hay lecturas NIR asociadas a este lote.</p>
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
                  {nirAnalyses.map((nir: any) => (
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
      </div>
    </div>
  );
}
