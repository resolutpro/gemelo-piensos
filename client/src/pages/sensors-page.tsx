import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  Activity,
  Settings,
  Edit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sensor, Zone, SensorReading } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const sensorSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  type: z.enum(["dust", "temperature", "humidity", "co2", "other"]),
  zoneId: z.string().min(1),
  unit: z.string().min(1),
  alertThresholdMin: z.string().optional(),
  alertThresholdMax: z.string().optional(),
  warningThresholdMin: z.string().optional(),
  warningThresholdMax: z.string().optional(),
});

const readingSchema = z.object({
  value: z.string().min(1, "Valor obligatorio"),
  notes: z.string().optional(),
});

const mqttSchema = z.object({
  mqttEnabled: z.boolean(),
  mqttHost: z.string().optional(),
  mqttPort: z.string().optional(),
  mqttTopic: z.string().optional(),
  mqttUsername: z.string().optional(),
  mqttPassword: z.string().optional(),
  jsonFields: z.string().optional(),
});

type SensorFormData = z.infer<typeof sensorSchema>;
type ReadingFormData = z.infer<typeof readingSchema>;
type MqttFormData = z.infer<typeof mqttSchema>;

const TYPE_LABELS: Record<string, string> = {
  dust: "Polvo",
  temperature: "Temperatura",
  humidity: "Humedad",
  co2: "CO₂",
  other: "Otro",
};
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  online: { label: "Online", color: "text-green-600", dot: "bg-green-500" },
  offline: {
    label: "Offline",
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  warning: { label: "Aviso", color: "text-yellow-600", dot: "bg-yellow-500" },
  error: { label: "Error", color: "text-destructive", dot: "bg-destructive" },
};

function SensorCard({
  sensor,
  onAddReading,
  onConfigureMqtt,
  onEdit,
}: {
  sensor: Sensor & { zone?: Zone };
  onAddReading: (s: Sensor) => void;
  onConfigureMqtt: (s: Sensor) => void;
  onEdit: (s: Sensor) => void;
}) {
  const statusCfg = STATUS_CONFIG[sensor.status] ?? STATUS_CONFIG.offline;
  const isAboveMax =
    sensor.alertThresholdMax !== null &&
    sensor.lastValue !== null &&
    (sensor.lastValue ?? 0) > (sensor.alertThresholdMax ?? Infinity);
  const isBelowMin =
    sensor.alertThresholdMin !== null &&
    sensor.lastValue !== null &&
    (sensor.lastValue ?? 0) < (sensor.alertThresholdMin ?? -Infinity);
  const hasAlert = isAboveMax || isBelowMin;

  return (
    <Card className={`${hasAlert ? "border-destructive/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {sensor.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {sensor.code} · {sensor.zone?.name ?? "Sin zona"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={hasAlert ? "destructive" : "secondary"}
              className="text-xs mr-1"
            >
              {TYPE_LABELS[sensor.type] ?? sensor.type}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onConfigureMqtt(sensor)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onEdit(sensor)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            {sensor.lastValue !== null ? (
              <p
                className={`text-3xl font-bold font-mono ${hasAlert ? "text-destructive" : "text-foreground"}`}
              >
                {sensor.lastValue?.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {sensor.unit}
                </span>
              </p>
            ) : (
              <p className="text-lg text-muted-foreground">— {sensor.unit}</p>
            )}
            {sensor.lastReadingAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(sensor.lastReadingAt), "d MMM HH:mm", {
                  locale: es,
                })}
              </p>
            )}
          </div>
          {sensor.alertThresholdMax !== null && (
            <div className="text-right text-xs text-muted-foreground">
              <p>
                Max: {sensor.alertThresholdMax}
                {sensor.unit}
              </p>
              {sensor.alertThresholdMin !== null && (
                <p>
                  Min: {sensor.alertThresholdMin}
                  {sensor.unit}
                </p>
              )}
            </div>
          )}
        </div>

        {hasAlert && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive p-2 rounded-md bg-destructive/10">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {isAboveMax
              ? `Valor supera umbral máximo (${sensor.alertThresholdMax}${sensor.unit})`
              : `Valor bajo umbral mínimo (${sensor.alertThresholdMin}${sensor.unit})`}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => onAddReading(sensor)}
            data-testid={`button-add-reading-${sensor.id}`}
          >
            <Activity className="w-3 h-3 mr-1.5" /> Registrar Manual
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SensorsPage() {
  const { toast } = useToast();
  const [sensorOpen, setSensorOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [mqttOpen, setMqttOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  const { data: sensors = [], isLoading } = useQuery<
    (Sensor & { zone?: Zone })[]
  >({ queryKey: ["/api/sensors"] });
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ["/api/zones"] });

  const sensorForm = useForm<SensorFormData>({
    resolver: zodResolver(sensorSchema),
    defaultValues: { unit: "", code: "" },
  });
  const readingForm = useForm<ReadingFormData>({
    resolver: zodResolver(readingSchema),
    defaultValues: { value: "" },
  });
  const mqttForm = useForm<MqttFormData>({
    resolver: zodResolver(mqttSchema),
    defaultValues: { mqttEnabled: false },
  });

  const createSensorMutation = useMutation({
    mutationFn: async (data: SensorFormData) => {
      // Si el código está vacío, generamos uno automáticamente
      const payload = {
        ...data,
        code: data.code || `SEN-${Math.floor(Math.random() * 10000)}`,
      };
      const res = await apiRequest("POST", "/api/sensors", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      toast({ title: "Sensor registrado" });
      setSensorOpen(false);
      sensorForm.reset();
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const updateSensorMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SensorFormData>;
    }) => {
      const res = await apiRequest("PATCH", `/api/sensors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      toast({ title: "Sensor actualizado" });
      setSensorOpen(false);
      setEditingSensor(null);
      sensorForm.reset();
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: ReadingFormData) => {
      if (!selectedSensor) throw new Error("No sensor selected");
      const res = await apiRequest(
        "POST",
        `/api/sensors/${selectedSensor.id}/readings`,
        {
          value: data.value,
          unit: selectedSensor.unit,
          notes: data.notes,
          recordedAt: new Date().toISOString(),
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Lectura registrada" });
      setReadingOpen(false);
      readingForm.reset();
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const updateMqttMutation = useMutation({
    mutationFn: async (data: MqttFormData) => {
      if (!selectedSensor) throw new Error("No sensor selected");
      const payload = {
        ...data,
        mqttPort: data.mqttPort ? parseInt(data.mqttPort) : null,
      };
      const res = await apiRequest(
        "PATCH",
        `/api/sensors/${selectedSensor.id}`,
        payload,
      );
      // Opcional: Llamar a un endpoint para refrescar MQTT en el backend
      await apiRequest("POST", `/api/sensors/refresh-mqtt`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      toast({
        title: "Configuración MQTT actualizada",
        description: "El servicio MQTT se ha reiniciado para aplicar cambios.",
      });
      setMqttOpen(false);
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  // Función para abrir el modal en modo edición
  const handleEditSensor = (sensor: Sensor) => {
    setEditingSensor(sensor);
    sensorForm.reset({
      name: sensor.name,
      code: sensor.code,
      type: sensor.type as any,
      zoneId: String(sensor.zoneId),
      unit: sensor.unit,
      alertThresholdMin: sensor.alertThresholdMin?.toString() ?? "",
      alertThresholdMax: sensor.alertThresholdMax?.toString() ?? "",
      warningThresholdMin: sensor.warningThresholdMin?.toString() ?? "",
      warningThresholdMax: sensor.warningThresholdMax?.toString() ?? "",
    });
    setSensorOpen(true);
  };

  // Controlador unificado para el envío del formulario
  const onSubmitSensor = (data: SensorFormData) => {
    if (editingSensor) {
      updateSensorMutation.mutate({ id: editingSensor.id, data });
    } else {
      createSensorMutation.mutate(data);
    }
  };

  const handleAddReading = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setReadingOpen(true);
  };

  const handleConfigureMqtt = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    mqttForm.reset({
      mqttEnabled: sensor.mqttEnabled || false,
      mqttHost: sensor.mqttHost || "",
      mqttPort: sensor.mqttPort ? String(sensor.mqttPort) : "",
      mqttTopic: sensor.mqttTopic || "",
      mqttUsername: sensor.mqttUsername || "",
      mqttPassword: sensor.mqttPassword || "",
      jsonFields: sensor.jsonFields || "",
    });
    setMqttOpen(true);
  };

  const filteredSensors =
    selectedZone === "all"
      ? sensors
      : sensors.filter((s) => String(s.zoneId) === selectedZone);
  const onlineSensors = sensors.filter((s) => s.status === "online").length;
  const warningSensors = sensors.filter((s) => s.status === "warning").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sensores IoT</h1>
          <p className="text-sm text-muted-foreground">
            Monitorización ambiental en tiempo real por zonas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSensor(null);
            sensorForm.reset({ unit: "", code: "" });
            setSensorOpen(true);
          }}
          data-testid="button-new-sensor"
        >
          <Plus className="w-4 h-4 mr-2" /> Añadir Sensor
        </Button>
      </div>

      {/* Stats */}
      {sensors.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineSensors}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-950">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningSensors}</p>
                <p className="text-xs text-muted-foreground">Con aviso</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sensors.length - onlineSensors - warningSensors}
                </p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zone filter */}
      {zones.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedZone === "all" ? "default" : "outline"}
            onClick={() => setSelectedZone("all")}
            className="text-xs"
          >
            Todas las Zonas
          </Button>
          {zones.map((z) => (
            <Button
              key={z.id}
              size="sm"
              variant={selectedZone === String(z.id) ? "default" : "outline"}
              onClick={() => setSelectedZone(String(z.id))}
              className="text-xs"
            >
              {z.name}
            </Button>
          ))}
        </div>
      )}

      {/* Sensors grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredSensors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="p-4 rounded-full bg-muted mx-auto w-fit">
              <Wifi className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold">Sin sensores configurados</p>
            <p className="text-sm text-muted-foreground">
              {zones.length === 0
                ? "Primero configure las zonas en el módulo de Configuración, luego añada sensores."
                : "Añada sensores para comenzar la monitorización ambiental"}
            </p>
            {zones.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/configuracion")}
              >
                Ir a Configuración
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSensors.map((sensor) => (
            <SensorCard
              key={sensor.id}
              sensor={sensor}
              onAddReading={handleAddReading}
              onConfigureMqtt={handleConfigureMqtt}
              onEdit={handleEditSensor}
            />
          ))}
        </div>
      )}

      {/* New / Edit Sensor Dialog */}
      <Dialog open={sensorOpen} onOpenChange={setSensorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              {editingSensor ? "Editar Sensor" : "Nuevo Sensor"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={sensorForm.handleSubmit(onSubmitSensor)}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  {...sensorForm.register("name")}
                  placeholder="Sensor Polvo Molino"
                  data-testid="input-sensor-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Código {editingSensor ? "" : "(Opcional)"}</Label>
                <Input
                  {...sensorForm.register("code")}
                  placeholder={
                    editingSensor ? "" : "Auto-generado si está vacío"
                  }
                  disabled={!!editingSensor}
                  data-testid="input-sensor-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={sensorForm.watch("type")}
                  onValueChange={(v) => sensorForm.setValue("type", v as any)}
                >
                  <SelectTrigger data-testid="select-sensor-type">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Zona</Label>
                <Select
                  value={sensorForm.watch("zoneId")}
                  onValueChange={(v) => sensorForm.setValue("zoneId", v)}
                >
                  <SelectTrigger data-testid="select-sensor-zone">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Configure zonas primero
                      </SelectItem>
                    ) : (
                      zones.map((z) => (
                        <SelectItem key={z.id} value={String(z.id)}>
                          {z.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unidad de Medida</Label>
                <Input
                  {...sensorForm.register("unit")}
                  placeholder="mg/m³, %, °C"
                  data-testid="input-sensor-unit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Umbral Alerta Min</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...sensorForm.register("alertThresholdMin")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Umbral Alerta Max</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...sensorForm.register("alertThresholdMax")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Umbral Aviso Min</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...sensorForm.register("warningThresholdMin")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Umbral Aviso Max</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...sensorForm.register("warningThresholdMax")}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSensorOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createSensorMutation.isPending ||
                  updateSensorMutation.isPending
                }
                data-testid="button-submit-sensor"
              >
                {createSensorMutation.isPending ||
                updateSensorMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}{" "}
                {editingSensor ? "Guardar Cambios" : "Guardar Sensor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Reading Dialog */}
      <Dialog open={readingOpen} onOpenChange={setReadingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Lectura</DialogTitle>
          </DialogHeader>
          {selectedSensor && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-semibold">{selectedSensor.name}</p>
                <p className="text-muted-foreground text-xs">
                  {TYPE_LABELS[selectedSensor.type]} · Unidad:{" "}
                  {selectedSensor.unit}
                </p>
              </div>
              <form
                onSubmit={readingForm.handleSubmit((d) =>
                  createReadingMutation.mutate(d),
                )}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Valor ({selectedSensor.unit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...readingForm.register("value")}
                    autoFocus
                    data-testid="input-reading-value"
                  />
                  {readingForm.formState.errors.value && (
                    <p className="text-xs text-destructive">
                      {readingForm.formState.errors.value.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input {...readingForm.register("notes")} />
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReadingOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createReadingMutation.isPending}
                    data-testid="button-submit-reading"
                  >
                    {createReadingMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}{" "}
                    Guardar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configuración MQTT Dialog */}
      <Dialog open={mqttOpen} onOpenChange={setMqttOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración MQTT</DialogTitle>
            <DialogDescription>
              Conecta este sensor a un broker MQTT para recibir datos
              automáticamente.
            </DialogDescription>
          </DialogHeader>
          {selectedSensor && (
            <form
              onSubmit={mqttForm.handleSubmit((d) =>
                updateMqttMutation.mutate(d),
              )}
              className="space-y-4 pt-2"
            >
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Habilitar conexión MQTT</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibir lecturas en tiempo real
                  </p>
                </div>
                <Switch
                  checked={mqttForm.watch("mqttEnabled")}
                  onCheckedChange={(val) =>
                    mqttForm.setValue("mqttEnabled", val)
                  }
                />
              </div>

              {mqttForm.watch("mqttEnabled") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Host / Servidor</Label>
                      <Input
                        {...mqttForm.register("mqttHost")}
                        placeholder="mqtt.ejemplo.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Puerto</Label>
                      <Input
                        type="number"
                        {...mqttForm.register("mqttPort")}
                        placeholder="1883"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tema (Topic)</Label>
                    <Input
                      {...mqttForm.register("mqttTopic")}
                      placeholder="fabrica/zona1/sensor_polvo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Usuario</Label>
                      <Input {...mqttForm.register("mqttUsername")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contraseña</Label>
                      <Input
                        type="password"
                        {...mqttForm.register("mqttPassword")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Campos JSON a extraer</Label>
                    <Input
                      {...mqttForm.register("jsonFields")}
                      placeholder="value, payload.humidity"
                    />
                    <p className="text-xs text-muted-foreground">
                      Rutas separadas por comas (ej: payload.value)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMqttOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMqttMutation.isPending}>
                  {updateMqttMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Guardar y Conectar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
