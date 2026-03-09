import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, FlaskConical, Activity, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MixSimulation } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon: any }> = {
  draft: { label: "Borrador", variant: "secondary", icon: Clock },
  ready: { label: "Lista", variant: "default", icon: Activity },
  fabricated: { label: "Fabricada", variant: "outline", icon: CheckCircle2 },
};

export default function SimulationsPage() {
  const { data: simulations = [], isLoading } = useQuery<MixSimulation[]>({ queryKey: ["/api/simulations"] });

  const draftCount = simulations.filter(s => s.status === "draft").length;
  const readyCount = simulations.filter(s => s.status === "ready").length;
  const fabricatedCount = simulations.filter(s => s.status === "fabricated").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Simulaciones de Mezcla</h1>
          <p className="text-sm text-muted-foreground">Gemelo digital para predicción nutricional de piensos</p>
        </div>
        <Link href="/simulaciones/nueva">
          <Button data-testid="button-new-simulation">
            <Plus className="w-4 h-4 mr-2" /> Nueva Simulación
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {simulations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-bold">{draftCount}</p>
              <p className="text-xs text-muted-foreground mt-1">En borrador</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-primary">{readyCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Listas para fabricar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{fabricatedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Fabricadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : simulations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted mx-auto w-fit"><FlaskConical className="w-8 h-8 text-muted-foreground" /></div>
            <div>
              <p className="font-semibold">Sin simulaciones registradas</p>
              <p className="text-sm text-muted-foreground mt-1">Cree una simulación para predecir la composición nutricional de su mezcla</p>
            </div>
            <Link href="/simulaciones/nueva">
              <Button size="sm">Crear Primera Simulación</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => {
            const cfg = STATUS_CONFIG[sim.status] ?? STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            return (
              <Link href={`/simulaciones/${sim.id}`} key={sim.id}>
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{sim.name}</p>
                            <Badge variant={cfg.variant as any} className="text-xs">{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(sim.createdAt), "d 'de' MMMM yyyy", { locale: es })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        {sim.totalQuantity > 0 && (
                          <div className="text-right">
                            <p className="text-lg font-bold font-mono">{sim.totalQuantity.toLocaleString()} kg</p>
                            <p className="text-xs text-muted-foreground">Total mezcla</p>
                          </div>
                        )}
                        {sim.estimatedProtein !== null && (
                          <div className="text-right">
                            <p className="text-lg font-bold">{sim.estimatedProtein?.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Proteína est.</p>
                          </div>
                        )}
                        {sim.estimatedMoisture !== null && (
                          <div className="text-right">
                            <p className="text-lg font-bold">{sim.estimatedMoisture?.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Humedad est.</p>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
