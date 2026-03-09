import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "resolved"]);
export const sensorTypeEnum = pgEnum("sensor_type", ["dust", "temperature", "humidity", "co2", "other"]);
export const sensorStatusEnum = pgEnum("sensor_status", ["online", "offline", "warning", "error"]);
export const simulationStatusEnum = pgEnum("simulation_status", ["draft", "ready", "fabricated"]);
export const lotStatusEnum = pgEnum("lot_status", ["received", "in_storage", "in_use", "consumed"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ─── Raw Materials ────────────────────────────────────────────────────────────

export const rawMaterials = pgTable("raw_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  unit: text("unit").notNull().default("kg"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({ id: true, createdAt: true });
export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// ─── Zones ────────────────────────────────────────────────────────────────────

export const zones = pgTable("zones", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertZoneSchema = createInsertSchema(zones).omit({ id: true, createdAt: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zones.$inferSelect;

// ─── Raw Material Lots ────────────────────────────────────────────────────────

export const rawMaterialLots = pgTable("raw_material_lots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lotCode: text("lot_code").notNull().unique(),
  rawMaterialId: integer("raw_material_id").notNull().references(() => rawMaterials.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("kg"),
  status: lotStatusEnum("status").notNull().default("received"),
  receivedAt: timestamp("received_at").notNull(),
  truckPlate: text("truck_plate"),
  driverName: text("driver_name"),
  destinationBin: text("destination_bin"),
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRawMaterialLotSchema = createInsertSchema(rawMaterialLots).omit({ id: true, createdAt: true });
export type InsertRawMaterialLot = z.infer<typeof insertRawMaterialLotSchema>;
export type RawMaterialLot = typeof rawMaterialLots.$inferSelect;

// ─── NIR Analysis ─────────────────────────────────────────────────────────────

export const nirAnalyses = pgTable("nir_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lotId: integer("lot_id").references(() => rawMaterialLots.id),
  productionBatchId: integer("production_batch_id"),
  moisture: real("moisture"),
  protein: real("protein"),
  fat: real("fat"),
  starch: real("starch"),
  fiber: real("fiber"),
  ash: real("ash"),
  notes: text("notes"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNirAnalysisSchema = createInsertSchema(nirAnalyses).omit({ id: true, createdAt: true });
export type InsertNirAnalysis = z.infer<typeof insertNirAnalysisSchema>;
export type NirAnalysis = typeof nirAnalyses.$inferSelect;

// ─── Sensors ──────────────────────────────────────────────────────────────────

export const sensors = pgTable("sensors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: sensorTypeEnum("type").notNull(),
  zoneId: integer("zone_id").notNull().references(() => zones.id),
  unit: text("unit").notNull(),
  status: sensorStatusEnum("status").notNull().default("offline"),
  batteryLevel: integer("battery_level"),
  alertThresholdMin: real("alert_threshold_min"),
  alertThresholdMax: real("alert_threshold_max"),
  warningThresholdMin: real("warning_threshold_min"),
  warningThresholdMax: real("warning_threshold_max"),
  active: boolean("active").notNull().default(true),
  lastReadingAt: timestamp("last_reading_at"),
  lastValue: real("last_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSensorSchema = createInsertSchema(sensors).omit({ id: true, createdAt: true });
export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Sensor = typeof sensors.$inferSelect;

// ─── Sensor Readings ──────────────────────────────────────────────────────────

export const sensorReadings = pgTable("sensor_readings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sensorId: integer("sensor_id").notNull().references(() => sensors.id),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({ id: true, createdAt: true });
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  targetMoistureMax: real("target_moisture_max"),
  targetProteinMin: real("target_protein_min"),
  targetFatMin: real("target_fat_min"),
  targetFatMax: real("target_fat_max"),
  targetFiberMax: real("target_fiber_max"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// ─── Mix Simulations ──────────────────────────────────────────────────────────

export const mixSimulations = pgTable("mix_simulations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id),
  status: simulationStatusEnum("status").notNull().default("draft"),
  totalQuantity: real("total_quantity").notNull().default(0),
  estimatedMoisture: real("estimated_moisture"),
  estimatedProtein: real("estimated_protein"),
  estimatedFat: real("estimated_fat"),
  estimatedStarch: real("estimated_starch"),
  estimatedFiber: real("estimated_fiber"),
  estimatedAsh: real("estimated_ash"),
  targetMoistureMax: real("target_moisture_max"),
  targetProteinMin: real("target_protein_min"),
  targetFatMin: real("target_fat_min"),
  targetFatMax: real("target_fat_max"),
  targetFiberMax: real("target_fiber_max"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMixSimulationSchema = createInsertSchema(mixSimulations).omit({ id: true, createdAt: true });
export type InsertMixSimulation = z.infer<typeof insertMixSimulationSchema>;
export type MixSimulation = typeof mixSimulations.$inferSelect;

// ─── Mix Simulation Items ─────────────────────────────────────────────────────

export const mixSimulationItems = pgTable("mix_simulation_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  simulationId: integer("simulation_id").notNull().references(() => mixSimulations.id),
  lotId: integer("lot_id").notNull().references(() => rawMaterialLots.id),
  quantity: real("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMixSimulationItemSchema = createInsertSchema(mixSimulationItems).omit({ id: true, createdAt: true });
export type InsertMixSimulationItem = z.infer<typeof insertMixSimulationItemSchema>;
export type MixSimulationItem = typeof mixSimulationItems.$inferSelect;

// ─── Production Batches ───────────────────────────────────────────────────────

export const productionBatches = pgTable("production_batches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  batchCode: text("batch_code").notNull().unique(),
  simulationId: integer("simulation_id").notNull().references(() => mixSimulations.id),
  producedAt: timestamp("produced_at").notNull(),
  quantity: real("quantity").notNull(),
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({ id: true, createdAt: true });
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

// ─── Final Product Analyses ───────────────────────────────────────────────────

export const finalProductAnalyses = pgTable("final_product_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  batchId: integer("batch_id").notNull().references(() => productionBatches.id),
  moisture: real("moisture"),
  protein: real("protein"),
  fat: real("fat"),
  starch: real("starch"),
  fiber: real("fiber"),
  ash: real("ash"),
  moistureDeviation: real("moisture_deviation"),
  proteinDeviation: real("protein_deviation"),
  fatDeviation: real("fat_deviation"),
  starchDeviation: real("starch_deviation"),
  fiberDeviation: real("fiber_deviation"),
  ashDeviation: real("ash_deviation"),
  notes: text("notes"),
  analyzedAt: timestamp("analyzed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFinalProductAnalysisSchema = createInsertSchema(finalProductAnalyses).omit({ id: true, createdAt: true });
export type InsertFinalProductAnalysis = z.infer<typeof insertFinalProductAnalysisSchema>;
export type FinalProductAnalysis = typeof finalProductAnalyses.$inferSelect;

// ─── Recommendations ──────────────────────────────────────────────────────────

export const recommendations = pgTable("recommendations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  batchId: integer("batch_id").references(() => productionBatches.id),
  simulationId: integer("simulation_id").references(() => mixSimulations.id),
  type: text("type").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  applied: boolean("applied").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  status: alertStatusEnum("status").notNull().default("active"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  zoneId: integer("zone_id").references(() => zones.id),
  sensorId: integer("sensor_id").references(() => sensors.id),
  lotId: integer("lot_id").references(() => rawMaterialLots.id),
  batchId: integer("batch_id").references(() => productionBatches.id),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// ─── Trace Events ─────────────────────────────────────────────────────────────

export const traceEvents = pgTable("trace_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  lotId: integer("lot_id").references(() => rawMaterialLots.id),
  simulationId: integer("simulation_id").references(() => mixSimulations.id),
  batchId: integer("batch_id").references(() => productionBatches.id),
  metadata: jsonb("metadata"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTraceEventSchema = createInsertSchema(traceEvents).omit({ id: true, createdAt: true });
export type InsertTraceEvent = z.infer<typeof insertTraceEventSchema>;
export type TraceEvent = typeof traceEvents.$inferSelect;

// ─── Relations ────────────────────────────────────────────────────────────────

export const rawMaterialLotsRelations = relations(rawMaterialLots, ({ one, many }) => ({
  rawMaterial: one(rawMaterials, { fields: [rawMaterialLots.rawMaterialId], references: [rawMaterials.id] }),
  supplier: one(suppliers, { fields: [rawMaterialLots.supplierId], references: [suppliers.id] }),
  nirAnalyses: many(nirAnalyses),
  traceEvents: many(traceEvents),
}));

export const nirAnalysesRelations = relations(nirAnalyses, ({ one }) => ({
  lot: one(rawMaterialLots, { fields: [nirAnalyses.lotId], references: [rawMaterialLots.id] }),
}));

export const sensorsRelations = relations(sensors, ({ one, many }) => ({
  zone: one(zones, { fields: [sensors.zoneId], references: [zones.id] }),
  readings: many(sensorReadings),
}));

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  sensor: one(sensors, { fields: [sensorReadings.sensorId], references: [sensors.id] }),
}));

export const mixSimulationsRelations = relations(mixSimulations, ({ one, many }) => ({
  recipe: one(recipes, { fields: [mixSimulations.recipeId], references: [recipes.id] }),
  items: many(mixSimulationItems),
  productionBatches: many(productionBatches),
  traceEvents: many(traceEvents),
}));

export const mixSimulationItemsRelations = relations(mixSimulationItems, ({ one }) => ({
  simulation: one(mixSimulations, { fields: [mixSimulationItems.simulationId], references: [mixSimulations.id] }),
  lot: one(rawMaterialLots, { fields: [mixSimulationItems.lotId], references: [rawMaterialLots.id] }),
}));

export const productionBatchesRelations = relations(productionBatches, ({ one, many }) => ({
  simulation: one(mixSimulations, { fields: [productionBatches.simulationId], references: [mixSimulations.id] }),
  finalAnalyses: many(finalProductAnalyses),
  traceEvents: many(traceEvents),
}));

export const finalProductAnalysesRelations = relations(finalProductAnalyses, ({ one }) => ({
  batch: one(productionBatches, { fields: [finalProductAnalyses.batchId], references: [productionBatches.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  zone: one(zones, { fields: [alerts.zoneId], references: [zones.id] }),
  sensor: one(sensors, { fields: [alerts.sensorId], references: [sensors.id] }),
}));

export const traceEventsRelations = relations(traceEvents, ({ one }) => ({
  lot: one(rawMaterialLots, { fields: [traceEvents.lotId], references: [rawMaterialLots.id] }),
  simulation: one(mixSimulations, { fields: [traceEvents.simulationId], references: [mixSimulations.id] }),
  batch: one(productionBatches, { fields: [traceEvents.batchId], references: [productionBatches.id] }),
}));
