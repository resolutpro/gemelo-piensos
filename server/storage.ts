import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import {
  users,
  suppliers,
  rawMaterials,
  zones,
  rawMaterialLots,
  nirAnalyses,
  sensors,
  sensorReadings,
  recipes,
  mixSimulations,
  mixSimulationItems,
  productionBatches,
  finalProductAnalyses,
  recommendations,
  alerts,
  traceEvents,
  notificationContacts,
  type User,
  type InsertUser,
  type Supplier,
  type InsertSupplier,
  type RawMaterial,
  type InsertRawMaterial,
  type Zone,
  type InsertZone,
  type RawMaterialLot,
  type InsertRawMaterialLot,
  type NirAnalysis,
  type InsertNirAnalysis,
  type Sensor,
  type InsertSensor,
  type SensorReading,
  type InsertSensorReading,
  type Recipe,
  type InsertRecipe,
  type MixSimulation,
  type InsertMixSimulation,
  type MixSimulationItem,
  type InsertMixSimulationItem,
  type ProductionBatch,
  type InsertProductionBatch,
  type FinalProductAnalysis,
  type InsertFinalProductAnalysis,
  type Recommendation,
  type InsertRecommendation,
  type Alert,
  type InsertAlert,
  type TraceEvent,
  type InsertTraceEvent,
  type NotificationContact,
  type InsertNotificationContact,
} from "@shared/schema";
import { sendAlertNotifications } from "./notifications";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.SessionStore;

  // -- AÑADIR A LA INTERFAZ --
  getNotificationContacts(): Promise<NotificationContact[]>;
  createNotificationContact(
    data: InsertNotificationContact,
  ): Promise<NotificationContact>;
  deleteNotificationContact(id: number): Promise<void>;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Raw Materials
  getRawMaterials(): Promise<RawMaterial[]>;
  getRawMaterial(id: number): Promise<RawMaterial | undefined>;
  createRawMaterial(data: InsertRawMaterial): Promise<RawMaterial>;
  updateRawMaterial(
    id: number,
    data: Partial<InsertRawMaterial>,
  ): Promise<RawMaterial>;
  deleteRawMaterial(id: number): Promise<void>;

  // Zones
  getZones(): Promise<Zone[]>;
  getZone(id: number): Promise<Zone | undefined>;
  createZone(data: InsertZone): Promise<Zone>;
  updateZone(id: number, data: Partial<InsertZone>): Promise<Zone>;
  deleteZone(id: number): Promise<void>;

  // Lots
  getLots(): Promise<
    (RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })[]
  >;
  getLot(
    id: number,
  ): Promise<
    | (RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })
    | undefined
  >;
  createLot(data: InsertRawMaterialLot): Promise<RawMaterialLot>;
  updateLot(
    id: number,
    data: Partial<InsertRawMaterialLot>,
  ): Promise<RawMaterialLot>;
  deleteLot(id: number): Promise<void>;

  // NIR Analyses
  getNirAnalyses(): Promise<NirAnalysis[]>;
  getNirAnalysesByLot(lotId: number): Promise<NirAnalysis[]>;
  getNirAnalysisByBatch(batchId: number): Promise<NirAnalysis | undefined>;
  createNirAnalysis(data: InsertNirAnalysis): Promise<NirAnalysis>;

  // Sensors
  getSensors(): Promise<(Sensor & { zone?: Zone })[]>;
  getSensor(id: number): Promise<(Sensor & { zone?: Zone }) | undefined>;
  createSensor(data: InsertSensor): Promise<Sensor>;
  updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor>;
  deleteSensor(id: number): Promise<void>;

  // Sensor Readings
  getSensorReadings(sensorId: number, limit?: number): Promise<SensorReading[]>;
  createSensorReading(data: InsertSensorReading): Promise<SensorReading>;

  // Recipes
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: number): Promise<Recipe | undefined>;
  createRecipe(data: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: number, data: Partial<InsertRecipe>): Promise<Recipe>;

  // Simulations
  getSimulations(): Promise<MixSimulation[]>;
  getSimulation(id: number): Promise<
    | (MixSimulation & {
        items?: (MixSimulationItem & {
          lot?: RawMaterialLot & {
            rawMaterial?: RawMaterial;
            nirAnalyses?: NirAnalysis[];
          };
        })[];
      })
    | undefined
  >;
  createSimulation(data: InsertMixSimulation): Promise<MixSimulation>;
  updateSimulation(
    id: number,
    data: Partial<InsertMixSimulation>,
  ): Promise<MixSimulation>;

  // Simulation Items
  createSimulationItem(
    data: InsertMixSimulationItem,
  ): Promise<MixSimulationItem>;
  deleteSimulationItem(id: number): Promise<void>;
  getSimulationItems(simulationId: number): Promise<
    (MixSimulationItem & {
      lot?: RawMaterialLot & { rawMaterial?: RawMaterial };
    })[]
  >;

  // Production Batches
  getProductionBatches(): Promise<
    (ProductionBatch & { simulation?: MixSimulation })[]
  >;
  getProductionBatch(
    id: number,
  ): Promise<(ProductionBatch & { simulation?: MixSimulation }) | undefined>;
  createProductionBatch(data: InsertProductionBatch): Promise<ProductionBatch>;
  updateProductionBatch(
    id: number,
    data: Partial<InsertProductionBatch>,
  ): Promise<ProductionBatch>;

  // Final Analyses
  getFinalAnalyses(): Promise<FinalProductAnalysis[]>;
  getFinalAnalysisByBatch(
    batchId: number,
  ): Promise<FinalProductAnalysis | undefined>;
  createFinalAnalysis(
    data: InsertFinalProductAnalysis,
  ): Promise<FinalProductAnalysis>;

  // Recommendations
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendationsByBatch(batchId: number): Promise<Recommendation[]>;
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(
    id: number,
    data: Partial<InsertRecommendation>,
  ): Promise<Recommendation>;

  // Alerts
  getAlerts(): Promise<(Alert & { zone?: Zone; sensor?: Sensor })[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  createAlert(data: InsertAlert): Promise<Alert>;
  updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert>;

  // Trace Events
  getTraceEvents(filters?: {
    lotId?: number;
    simulationId?: number;
    batchId?: number;
  }): Promise<TraceEvent[]>;
  createTraceEvent(data: InsertTraceEvent): Promise<TraceEvent>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    lotsToday: number;
    activeAlerts: number;
    pendingSimulations: number;
    recentBatch: string | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [s] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return s;
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [s] = await db.insert(suppliers).values(data).returning();
    return s;
  }

  async updateSupplier(
    id: number,
    data: Partial<InsertSupplier>,
  ): Promise<Supplier> {
    const [s] = await db
      .update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();
    return s;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  async getRawMaterials(): Promise<RawMaterial[]> {
    return db.select().from(rawMaterials).orderBy(rawMaterials.name);
  }

  async getRawMaterial(id: number): Promise<RawMaterial | undefined> {
    const [m] = await db
      .select()
      .from(rawMaterials)
      .where(eq(rawMaterials.id, id));
    return m;
  }

  async createRawMaterial(data: InsertRawMaterial): Promise<RawMaterial> {
    const [m] = await db.insert(rawMaterials).values(data).returning();
    return m;
  }

  async updateRawMaterial(
    id: number,
    data: Partial<InsertRawMaterial>,
  ): Promise<RawMaterial> {
    const [m] = await db
      .update(rawMaterials)
      .set(data)
      .where(eq(rawMaterials.id, id))
      .returning();
    return m;
  }

  async deleteRawMaterial(id: number): Promise<void> {
    await db.delete(rawMaterials).where(eq(rawMaterials.id, id));
  }

  async getZones(): Promise<Zone[]> {
    return db.select().from(zones).orderBy(zones.name);
  }

  async getZone(id: number): Promise<Zone | undefined> {
    const [z] = await db.select().from(zones).where(eq(zones.id, id));
    return z;
  }

  async createZone(data: InsertZone): Promise<Zone> {
    const [z] = await db.insert(zones).values(data).returning();
    return z;
  }

  async updateZone(id: number, data: Partial<InsertZone>): Promise<Zone> {
    const [z] = await db
      .update(zones)
      .set(data)
      .where(eq(zones.id, id))
      .returning();
    return z;
  }

  async deleteZone(id: number): Promise<void> {
    await db.delete(zones).where(eq(zones.id, id));
  }

  async getLots(): Promise<
    (RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })[]
  > {
    const lots = await db
      .select()
      .from(rawMaterialLots)
      .orderBy(desc(rawMaterialLots.receivedAt));
    const result = await Promise.all(
      lots.map(async (lot) => {
        const [rm] = lot.rawMaterialId
          ? await db
              .select()
              .from(rawMaterials)
              .where(eq(rawMaterials.id, lot.rawMaterialId))
          : [];
        const [sp] = lot.supplierId
          ? await db
              .select()
              .from(suppliers)
              .where(eq(suppliers.id, lot.supplierId))
          : [];
        return { ...lot, rawMaterial: rm, supplier: sp };
      }),
    );
    return result;
  }

  async getLot(
    id: number,
  ): Promise<
    | (RawMaterialLot & { rawMaterial?: RawMaterial; supplier?: Supplier })
    | undefined
  > {
    const [lot] = await db
      .select()
      .from(rawMaterialLots)
      .where(eq(rawMaterialLots.id, id));
    if (!lot) return undefined;
    const [rm] = lot.rawMaterialId
      ? await db
          .select()
          .from(rawMaterials)
          .where(eq(rawMaterials.id, lot.rawMaterialId))
      : [];
    const [sp] = lot.supplierId
      ? await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, lot.supplierId))
      : [];
    return { ...lot, rawMaterial: rm, supplier: sp };
  }

  async createLot(data: InsertRawMaterialLot): Promise<RawMaterialLot> {
    const [lot] = await db.insert(rawMaterialLots).values(data).returning();
    return lot;
  }

  async updateLot(
    id: number,
    data: Partial<InsertRawMaterialLot>,
  ): Promise<RawMaterialLot> {
    const [lot] = await db
      .update(rawMaterialLots)
      .set(data)
      .where(eq(rawMaterialLots.id, id))
      .returning();
    return lot;
  }

  async deleteLot(id: number): Promise<void> {
    // 1. Primero eliminamos las dependencias (Análisis NIR y Eventos de Trazabilidad)
    await db.delete(nirAnalyses).where(eq(nirAnalyses.lotId, id));
    await db.delete(traceEvents).where(eq(traceEvents.lotId, id));

    // 2. Finalmente eliminamos el lote
    await db.delete(rawMaterialLots).where(eq(rawMaterialLots.id, id));
  }

  async getNirAnalyses(): Promise<NirAnalysis[]> {
    return db.select().from(nirAnalyses).orderBy(desc(nirAnalyses.analyzedAt));
  }

  async getNirAnalysesByLot(lotId: number): Promise<NirAnalysis[]> {
    return db
      .select()
      .from(nirAnalyses)
      .where(eq(nirAnalyses.lotId, lotId))
      .orderBy(desc(nirAnalyses.analyzedAt));
  }

  async getNirAnalysisByBatch(
    batchId: number,
  ): Promise<NirAnalysis | undefined> {
    const [a] = await db
      .select()
      .from(nirAnalyses)
      .where(eq(nirAnalyses.productionBatchId, batchId));
    return a;
  }

  async createNirAnalysis(data: InsertNirAnalysis): Promise<NirAnalysis> {
    const [a] = await db.insert(nirAnalyses).values(data).returning();
    return a;
  }

  async getSensors(): Promise<(Sensor & { zone?: Zone })[]> {
    const ss = await db.select().from(sensors).orderBy(sensors.name);
    const result = await Promise.all(
      ss.map(async (s) => {
        const [z] = await db.select().from(zones).where(eq(zones.id, s.zoneId));
        return { ...s, zone: z };
      }),
    );
    return result;
  }

  async getSensor(id: number): Promise<(Sensor & { zone?: Zone }) | undefined> {
    const [s] = await db.select().from(sensors).where(eq(sensors.id, id));
    if (!s) return undefined;
    const [z] = await db.select().from(zones).where(eq(zones.id, s.zoneId));
    return { ...s, zone: z };
  }

  async createSensor(data: InsertSensor): Promise<Sensor> {
    const [s] = await db.insert(sensors).values(data).returning();
    return s;
  }

  async updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor> {
    const [s] = await db
      .update(sensors)
      .set(data)
      .where(eq(sensors.id, id))
      .returning();
    return s;
  }

  async deleteSensor(id: number): Promise<void> {
    await db.delete(sensors).where(eq(sensors.id, id));
  }

  async getSensorReadings(
    sensorId: number,
    limit = 50,
  ): Promise<SensorReading[]> {
    return db
      .select()
      .from(sensorReadings)
      .where(eq(sensorReadings.sensorId, sensorId))
      .orderBy(desc(sensorReadings.recordedAt))
      .limit(limit);
  }

  async createSensorReading(data: InsertSensorReading): Promise<SensorReading> {
    // 1. Guardar la lectura
    const [r] = await db.insert(sensorReadings).values(data).returning();

    // 2. Actualizar el sensor con el último valor
    await db
      .update(sensors)
      .set({
        lastReadingAt: r.recordedAt,
        lastValue: r.value,
        status: "online",
      })
      .where(eq(sensors.id, r.sensorId));

    // 3. Lógica de Evaluación de Alertas (movida aquí)
    const [sensor] = await db
      .select()
      .from(sensors)
      .where(eq(sensors.id, r.sensorId));

    if (sensor) {
      const exceedsMax =
        sensor.alertThresholdMax !== null && r.value > sensor.alertThresholdMax;
      const belowMin =
        sensor.alertThresholdMin !== null && r.value < sensor.alertThresholdMin;

      if (exceedsMax || belowMin) {
        const title = `Alerta crítica: ${sensor.name}`;
        const desc = `Valor ${r.value} ${sensor.unit} ${exceedsMax ? "supera el umbral máximo de " + sensor.alertThresholdMax : "cae bajo el umbral mínimo de " + sensor.alertThresholdMin}`;

        // Crear alerta en BD
        await this.createAlert({
          type: "sensor_threshold",
          severity: "critical",
          status: "active",
          title,
          description: desc,
          sensorId: sensor.id,
          zoneId: sensor.zoneId,
        });

        // Enviar notificaciones de Email/WhatsApp sin bloquear el hilo principal
        this.getNotificationContacts().then((contacts) => {
          sendAlertNotifications(contacts, title, desc).catch((err) =>
            console.error("Error al enviar notificaciones:", err),
          );
        });
      } else {
        // Advertencias (Warnings)
        const exceedsWarningMax =
          sensor.warningThresholdMax !== null &&
          r.value > sensor.warningThresholdMax;
        const belowWarningMin =
          sensor.warningThresholdMin !== null &&
          r.value < sensor.warningThresholdMin;

        if (exceedsWarningMax || belowWarningMin) {
          await this.createAlert({
            type: "sensor_threshold",
            severity: "warning",
            status: "active",
            title: `Advertencia: ${sensor.name}`,
            description: `Valor ${r.value} ${sensor.unit} ${exceedsWarningMax ? "cerca del umbral máximo de " + sensor.warningThresholdMax : "cerca del umbral mínimo de " + sensor.warningThresholdMin}`,
            sensorId: sensor.id,
            zoneId: sensor.zoneId,
          });
        }
      }
    }

    return r;
  }

  async getRecipes(): Promise<Recipe[]> {
    return db
      .select()
      .from(recipes)
      .where(eq(recipes.active, true))
      .orderBy(recipes.name);
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    const [r] = await db.select().from(recipes).where(eq(recipes.id, id));
    return r;
  }

  async createRecipe(data: InsertRecipe): Promise<Recipe> {
    const [r] = await db.insert(recipes).values(data).returning();
    return r;
  }

  async updateRecipe(id: number, data: Partial<InsertRecipe>): Promise<Recipe> {
    const [r] = await db
      .update(recipes)
      .set(data)
      .where(eq(recipes.id, id))
      .returning();
    return r;
  }

  async getSimulations(): Promise<MixSimulation[]> {
    return db
      .select()
      .from(mixSimulations)
      .orderBy(desc(mixSimulations.createdAt));
  }

  async getSimulation(id: number): Promise<
    | (MixSimulation & {
        items?: (MixSimulationItem & {
          lot?: RawMaterialLot & {
            rawMaterial?: RawMaterial;
            nirAnalyses?: NirAnalysis[];
          };
        })[];
      })
    | undefined
  > {
    const [sim] = await db
      .select()
      .from(mixSimulations)
      .where(eq(mixSimulations.id, id));
    if (!sim) return undefined;

    const items = await db
      .select()
      .from(mixSimulationItems)
      .where(eq(mixSimulationItems.simulationId, id));
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const [lot] = await db
          .select()
          .from(rawMaterialLots)
          .where(eq(rawMaterialLots.id, item.lotId));
        let richLot: any = lot;
        if (lot) {
          const [rm] = await db
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.id, lot.rawMaterialId));
          const nirs = await db
            .select()
            .from(nirAnalyses)
            .where(eq(nirAnalyses.lotId, lot.id));
          richLot = { ...lot, rawMaterial: rm, nirAnalyses: nirs };
        }
        return { ...item, lot: richLot };
      }),
    );

    return { ...sim, items: enrichedItems };
  }

  async createSimulation(data: InsertMixSimulation): Promise<MixSimulation> {
    const [sim] = await db.insert(mixSimulations).values(data).returning();
    return sim;
  }

  async updateSimulation(
    id: number,
    data: Partial<InsertMixSimulation>,
  ): Promise<MixSimulation> {
    const [sim] = await db
      .update(mixSimulations)
      .set(data)
      .where(eq(mixSimulations.id, id))
      .returning();
    return sim;
  }

  async createSimulationItem(
    data: InsertMixSimulationItem,
  ): Promise<MixSimulationItem> {
    const [item] = await db.insert(mixSimulationItems).values(data).returning();
    return item;
  }

  async deleteSimulationItem(id: number): Promise<void> {
    await db.delete(mixSimulationItems).where(eq(mixSimulationItems.id, id));
  }

  async getSimulationItems(simulationId: number): Promise<
    (MixSimulationItem & {
      lot?: RawMaterialLot & { rawMaterial?: RawMaterial };
    })[]
  > {
    const items = await db
      .select()
      .from(mixSimulationItems)
      .where(eq(mixSimulationItems.simulationId, simulationId));
    return Promise.all(
      items.map(async (item) => {
        const [lot] = await db
          .select()
          .from(rawMaterialLots)
          .where(eq(rawMaterialLots.id, item.lotId));
        let richLot: any = lot;
        if (lot) {
          const [rm] = await db
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.id, lot.rawMaterialId));
          richLot = { ...lot, rawMaterial: rm };
        }
        return { ...item, lot: richLot };
      }),
    );
  }

  async getProductionBatches(): Promise<
    (ProductionBatch & { simulation?: MixSimulation })[]
  > {
    const batches = await db
      .select()
      .from(productionBatches)
      .orderBy(desc(productionBatches.producedAt));
    return Promise.all(
      batches.map(async (b) => {
        const [sim] = await db
          .select()
          .from(mixSimulations)
          .where(eq(mixSimulations.id, b.simulationId));
        return { ...b, simulation: sim };
      }),
    );
  }

  async getProductionBatch(
    id: number,
  ): Promise<(ProductionBatch & { simulation?: MixSimulation }) | undefined> {
    const [b] = await db
      .select()
      .from(productionBatches)
      .where(eq(productionBatches.id, id));
    if (!b) return undefined;
    const [sim] = await db
      .select()
      .from(mixSimulations)
      .where(eq(mixSimulations.id, b.simulationId));
    return { ...b, simulation: sim };
  }

  async createProductionBatch(
    data: InsertProductionBatch,
  ): Promise<ProductionBatch> {
    const [b] = await db.insert(productionBatches).values(data).returning();
    await db
      .update(mixSimulations)
      .set({ status: "fabricated" })
      .where(eq(mixSimulations.id, data.simulationId));
    return b;
  }

  async updateProductionBatch(
    id: number,
    data: Partial<InsertProductionBatch>,
  ): Promise<ProductionBatch> {
    const [b] = await db
      .update(productionBatches)
      .set(data)
      .where(eq(productionBatches.id, id))
      .returning();
    return b;
  }

  async getFinalAnalyses(): Promise<FinalProductAnalysis[]> {
    return db
      .select()
      .from(finalProductAnalyses)
      .orderBy(desc(finalProductAnalyses.analyzedAt));
  }

  async getFinalAnalysisByBatch(
    batchId: number,
  ): Promise<FinalProductAnalysis | undefined> {
    const [a] = await db
      .select()
      .from(finalProductAnalyses)
      .where(eq(finalProductAnalyses.batchId, batchId));
    return a;
  }

  async createFinalAnalysis(
    data: InsertFinalProductAnalysis,
  ): Promise<FinalProductAnalysis> {
    const [a] = await db.insert(finalProductAnalyses).values(data).returning();
    return a;
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return db
      .select()
      .from(recommendations)
      .orderBy(desc(recommendations.createdAt));
  }

  async getRecommendationsByBatch(batchId: number): Promise<Recommendation[]> {
    return db
      .select()
      .from(recommendations)
      .where(eq(recommendations.batchId, batchId));
  }

  async createRecommendation(
    data: InsertRecommendation,
  ): Promise<Recommendation> {
    const [r] = await db.insert(recommendations).values(data).returning();
    return r;
  }

  async updateRecommendation(
    id: number,
    data: Partial<InsertRecommendation>,
  ): Promise<Recommendation> {
    const [r] = await db
      .update(recommendations)
      .set(data)
      .where(eq(recommendations.id, id))
      .returning();
    return r;
  }

  async getAlerts(): Promise<(Alert & { zone?: Zone; sensor?: Sensor })[]> {
    const al = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
    return Promise.all(
      al.map(async (a) => {
        const [z] = a.zoneId
          ? await db.select().from(zones).where(eq(zones.id, a.zoneId))
          : [];
        const [s] = a.sensorId
          ? await db.select().from(sensors).where(eq(sensors.id, a.sensorId))
          : [];
        return { ...a, zone: z, sensor: s };
      }),
    );
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    const [a] = await db.select().from(alerts).where(eq(alerts.id, id));
    return a;
  }

  async createAlert(data: InsertAlert): Promise<Alert> {
    const [a] = await db.insert(alerts).values(data).returning();
    return a;
  }

  async updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert> {
    const [a] = await db
      .update(alerts)
      .set(data)
      .where(eq(alerts.id, id))
      .returning();
    return a;
  }

  async getTraceEvents(filters?: {
    lotId?: number;
    simulationId?: number;
    batchId?: number;
  }): Promise<TraceEvent[]> {
    let query = db.select().from(traceEvents);
    if (filters?.lotId) {
      return db
        .select()
        .from(traceEvents)
        .where(eq(traceEvents.lotId, filters.lotId))
        .orderBy(desc(traceEvents.occurredAt));
    }
    if (filters?.simulationId) {
      return db
        .select()
        .from(traceEvents)
        .where(eq(traceEvents.simulationId, filters.simulationId))
        .orderBy(desc(traceEvents.occurredAt));
    }
    if (filters?.batchId) {
      return db
        .select()
        .from(traceEvents)
        .where(eq(traceEvents.batchId, filters.batchId))
        .orderBy(desc(traceEvents.occurredAt));
    }
    return db
      .select()
      .from(traceEvents)
      .orderBy(desc(traceEvents.occurredAt))
      .limit(100);
  }

  async createTraceEvent(data: InsertTraceEvent): Promise<TraceEvent> {
    const [e] = await db.insert(traceEvents).values(data).returning();
    return e;
  }

  async getDashboardStats(): Promise<{
    lotsToday: number;
    activeAlerts: number;
    pendingSimulations: number;
    recentBatch: string | null;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allLots = await db
      .select()
      .from(rawMaterialLots)
      .where(gte(rawMaterialLots.receivedAt, today));
    const allAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.status, "active"));
    const allSims = await db
      .select()
      .from(mixSimulations)
      .where(eq(mixSimulations.status, "ready"));
    const lastBatch = await db
      .select()
      .from(productionBatches)
      .orderBy(desc(productionBatches.producedAt))
      .limit(1);

    return {
      lotsToday: allLots.length,
      activeAlerts: allAlerts.length,
      pendingSimulations: allSims.length,
      recentBatch: lastBatch[0]?.batchCode ?? null,
    };
  }

  // ─── Contactos de Notificación ──────────────────────────────────────────────

  async getNotificationContacts(): Promise<NotificationContact[]> {
    return db
      .select()
      .from(notificationContacts)
      .orderBy(desc(notificationContacts.createdAt));
  }

  async createNotificationContact(
    data: InsertNotificationContact,
  ): Promise<NotificationContact> {
    const [c] = await db.insert(notificationContacts).values(data).returning();
    return c;
  }

  async deleteNotificationContact(id: number): Promise<void> {
    await db
      .delete(notificationContacts)
      .where(eq(notificationContacts.id, id));
  }

  // ─── Lógica centralizada de Lectura de Sensores y Alertas ─────────────────
}

export const storage = new DatabaseStorage();
