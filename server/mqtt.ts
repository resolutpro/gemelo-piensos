import mqtt, { type MqttClient, type IClientOptions } from "mqtt";
import { storage } from "./storage";
import type { Sensor } from "@shared/schema";

const logger = {
  info: (msg: string, data?: any) => console.log(`[MQTT] ${msg}`, data || ""),
  warn: (msg: string, data?: any) => console.warn(`[MQTT] ${msg}`, data || ""),
  error: (msg: string, err?: any) => console.error(`[MQTT] ${msg}`, err || ""),
};

interface MqttConnection {
  client: MqttClient;
  sensors: Set<number>;
  connectionKey: string;
}

class MqttService {
  private connections: Map<string, MqttConnection> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    logger.info("Inicializando Servicio MQTT...");
    await this.refreshMqttConnections();
    this.initialized = true;

    // Recargar conexiones cada 5 minutos
    setInterval(() => this.refreshMqttConnections(), 300000); 
  }

  async refreshMqttConnections(): Promise<void> {
    try {
      logger.info("Refrescando conexiones MQTT...");

      // Obtener todos los sensores (y filtrar los que tienen mqtt activo)
      const allSensors = await storage.getSensors();
      const validSensors = allSensors.filter(s => 
        s.mqttEnabled && s.active && s.mqttHost && s.mqttPort && s.mqttTopic
      );

      // Limpiar conexiones obsoletas
      for (const [key, conn] of this.connections.entries()) {
        conn.client.end(true);
        this.connections.delete(key);
      }

      // Agrupar por broker
      const sensorsByConnection = new Map<string, Sensor[]>();
      for (const sensor of validSensors) {
        const key = `${sensor.mqttHost}:${sensor.mqttPort}:${sensor.mqttUsername || ''}`;
        if (!sensorsByConnection.has(key)) sensorsByConnection.set(key, []);
        sensorsByConnection.get(key)!.push(sensor);
      }

      // Conectar a cada grupo
      for (const [key, sensorsGroup] of sensorsByConnection.entries()) {
        await this.ensureConnection(key, sensorsGroup);
      }
    } catch (error) {
      logger.error("Error al refrescar MQTT", error);
    }
  }

  private async ensureConnection(key: string, sensorsGroup: Sensor[]): Promise<void> {
    const s = sensorsGroup[0];
    const protocol = (s.mqttPort === 8883 || s.mqttPort === 8884) ? "mqtts" : "mqtt";

    const options: IClientOptions = {
      host: s.mqttHost!,
      port: s.mqttPort!,
      username: s.mqttUsername || undefined,
      password: s.mqttPassword || undefined,
      protocol: protocol,
      reconnectPeriod: 10000,
      rejectUnauthorized: false
    };

    const client = mqtt.connect(options);
    this.connections.set(key, { client, sensors: new Set(sensorsGroup.map(x => x.id)), connectionKey: key });

    client.on("connect", () => {
      logger.info(`Conectado al broker: ${key}`);
      sensorsGroup.forEach(sensor => {
        if (sensor.mqttTopic) {
          client.subscribe(sensor.mqttTopic, () => logger.info(`Suscrito a ${sensor.mqttTopic}`));
        }
      });
    });

    client.on("message", async (topic, message) => {
      const msgStr = message.toString();
      let payload;
      try { payload = JSON.parse(msgStr); } catch { return; } // Ignorar no JSON

      // Detectar payload de TTN si existe
      const data = payload.uplink_message?.decoded_payload || payload;
      const matchingSensors = sensorsGroup.filter(s => s.mqttTopic === topic || this.topicMatch(s.mqttTopic!, topic));

      for (const sensor of matchingSensors) {
        await this.processMessage(sensor, data);
      }
    });

    client.on("error", (err) => logger.error(`Error MQTT en ${key}:`, err));
  }

  private async processMessage(sensor: Sensor, data: any) {
    if (!sensor.jsonFields) return;
    const fields = sensor.jsonFields.split(",").map(f => f.trim());

    for (const field of fields) {
      const val = this.extractValue(data, field);
      if (val !== null && !isNaN(Number(val))) {
        // Guardar lectura usando el storage de drizzle
        await storage.createSensorReading({
          sensorId: sensor.id,
          value: Number(val),
          unit: sensor.unit,
          recordedAt: new Date()
        });

        // Actualizar último valor en sensor (el createSensorReading del storage ya hace esto, pero puedes verificarlo en storage.ts)
        break; // Tomamos el primer campo válido
      }
    }
  }

  private extractValue(obj: any, path: string) {
    return path.split(".").reduce((o, i) => (o ? o[i] : null), obj);
  }

  private topicMatch(pattern: string, topic: string) {
    const regex = new RegExp("^" + pattern.replace(/\+/g, "[^/]+").replace(/#/g, ".*") + "$");
    return regex.test(topic);
  }
}

export const mqttService = new MqttService();