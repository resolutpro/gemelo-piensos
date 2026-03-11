import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import {
  insertSupplierSchema,
  insertRawMaterialSchema,
  insertZoneSchema,
  insertRawMaterialLotSchema,
  insertNirAnalysisSchema,
  insertSensorSchema,
  insertSensorReadingSchema,
  insertRecipeSchema,
  insertMixSimulationSchema,
  insertMixSimulationItemSchema,
  insertProductionBatchSchema,
  insertFinalProductAnalysisSchema,
  insertAlertSchema,
  rawMaterialLots,
  insertTraceEventSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  setupAuth(app);

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  app.get("/api/dashboard/stats", requireAuth, async (req, res, next) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // ─── Suppliers ──────────────────────────────────────────────────────────────

  app.get("/api/suppliers", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getSuppliers());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res, next) => {
    try {
      const s = await storage.getSupplier(Number(req.params.id));
      if (!s) return res.sendStatus(404);
      res.json(s);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res, next) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      res.status(201).json(await storage.createSupplier(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.updateSupplier(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteSupplier(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // ─── Raw Materials ──────────────────────────────────────────────────────────

  app.get("/api/raw-materials", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getRawMaterials());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/raw-materials/:id", requireAuth, async (req, res, next) => {
    try {
      const m = await storage.getRawMaterial(Number(req.params.id));
      if (!m) return res.sendStatus(404);
      res.json(m);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/raw-materials", requireAuth, async (req, res, next) => {
    try {
      // Clonamos el cuerpo de la petición
      const body = { ...req.body };
      // Si el código está vacío, lo transformamos en null para evitar el error unique
      if (!body.code) body.code = null;

      const data = insertRawMaterialSchema.parse(body);
      res.status(201).json(await storage.createRawMaterial(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/raw-materials/:id", requireAuth, async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (body.code === "") body.code = null;

      res.json(await storage.updateRawMaterial(Number(req.params.id), body));
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/raw-materials/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteRawMaterial(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // ─── Zones ──────────────────────────────────────────────────────────────────

  app.get("/api/zones", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getZones());
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/zones", requireAuth, async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (!body.code) body.code = null;

      const data = insertZoneSchema.parse(body);
      res.status(201).json(await storage.createZone(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/zones/:id", requireAuth, async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (body.code === "") body.code = null;

      res.json(await storage.updateZone(Number(req.params.id), body));
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/zones/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteZone(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // ─── Lots ───────────────────────────────────────────────────────────────────

  app.get("/api/lots", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getLots());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/lots/:id", requireAuth, async (req, res, next) => {
    try {
      const l = await storage.getLot(Number(req.params.id));
      if (!l) return res.sendStatus(404);
      res.json(l);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/lots", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        receivedAt: req.body.receivedAt
          ? new Date(req.body.receivedAt)
          : new Date(),
        quantity: parseFloat(req.body.quantity),
        rawMaterialId: parseInt(req.body.rawMaterialId),
        supplierId: req.body.supplierId ? parseInt(req.body.supplierId) : null,
      };
      const data = insertRawMaterialLotSchema.parse(body);
      const lot = await storage.createLot(data);
      await storage.createTraceEvent({
        eventType: "lot_received",
        description: `Lote ${lot.lotCode} recibido`,
        lotId: lot.id,
        occurredAt: new Date(),
      });
      res.status(201).json(lot);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/lots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

      const data = { ...req.body };

      // Convertir la fecha de string a Date
      if (data.receivedAt) {
        data.receivedAt = new Date(data.receivedAt);
      }

      // Usar tu clase storage en lugar de db directamente (si tienes este método creado)
      const updatedLot = await storage.updateLot(id, data);

      if (!updatedLot)
        return res.status(404).json({ message: "Lote no encontrado" });

      res.json(updatedLot);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // ─── NIR Analyses ───────────────────────────────────────────────────────────

  app.get("/api/nir-analyses", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getNirAnalyses());
    } catch (err) {
      next(err);
    }
  });

  app.get(
    "/api/nir-analyses/lot/:lotId",
    requireAuth,
    async (req, res, next) => {
      try {
        res.json(await storage.getNirAnalysesByLot(Number(req.params.lotId)));
      } catch (err) {
        next(err);
      }
    },
  );

  app.post("/api/nir-analyses", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        analyzedAt: req.body.analyzedAt
          ? new Date(req.body.analyzedAt)
          : new Date(),
        lotId: req.body.lotId ? parseInt(req.body.lotId) : null,
        productionBatchId: req.body.productionBatchId
          ? parseInt(req.body.productionBatchId)
          : null,
        moisture: req.body.moisture ? parseFloat(req.body.moisture) : null,
        protein: req.body.protein ? parseFloat(req.body.protein) : null,
        fat: req.body.fat ? parseFloat(req.body.fat) : null,
        starch: req.body.starch ? parseFloat(req.body.starch) : null,
        fiber: req.body.fiber ? parseFloat(req.body.fiber) : null,
        ash: req.body.ash ? parseFloat(req.body.ash) : null,
      };
      const data = insertNirAnalysisSchema.parse(body);
      const analysis = await storage.createNirAnalysis(data);
      if (body.lotId) {
        await storage.createTraceEvent({
          eventType: "nir_analysis",
          description: `Análisis NIR registrado para lote`,
          lotId: body.lotId,
          occurredAt: new Date(),
        });
      }
      res.status(201).json(analysis);
    } catch (err) {
      next(err);
    }
  });

  // ─── Sensors ────────────────────────────────────────────────────────────────

  app.get("/api/sensors", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getSensors());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/sensors/:id", requireAuth, async (req, res, next) => {
    try {
      const s = await storage.getSensor(Number(req.params.id));
      if (!s) return res.sendStatus(404);
      res.json(s);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/sensors", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        zoneId: parseInt(req.body.zoneId),
        batteryLevel: req.body.batteryLevel
          ? parseInt(req.body.batteryLevel)
          : null,
        alertThresholdMin: req.body.alertThresholdMin
          ? parseFloat(req.body.alertThresholdMin)
          : null,
        alertThresholdMax: req.body.alertThresholdMax
          ? parseFloat(req.body.alertThresholdMax)
          : null,
        warningThresholdMin: req.body.warningThresholdMin
          ? parseFloat(req.body.warningThresholdMin)
          : null,
        warningThresholdMax: req.body.warningThresholdMax
          ? parseFloat(req.body.warningThresholdMax)
          : null,
      };
      const data = insertSensorSchema.parse(body);
      res.status(201).json(await storage.createSensor(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/sensors/:id", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.updateSensor(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/sensors/:id", requireAuth, async (req, res, next) => {
    try {
      await storage.deleteSensor(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // ─── Sensor Readings ─────────────────────────────────────────────────────────

  app.get("/api/sensors/:id/readings", requireAuth, async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      res.json(await storage.getSensorReadings(Number(req.params.id), limit));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/sensors/:id/readings", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        sensorId: Number(req.params.id),
        value: parseFloat(req.body.value),
        recordedAt: req.body.recordedAt
          ? new Date(req.body.recordedAt)
          : new Date(),
      };
      const data = insertSensorReadingSchema.parse(body);
      const reading = await storage.createSensorReading(data);

      const sensor = await storage.getSensor(reading.sensorId);
      if (sensor) {
        const exceedsMax =
          sensor.alertThresholdMax !== null &&
          reading.value > sensor.alertThresholdMax;
        const belowMin =
          sensor.alertThresholdMin !== null &&
          reading.value < sensor.alertThresholdMin;
        if (exceedsMax || belowMin) {
          await storage.createAlert({
            type: "sensor_threshold",
            severity: "critical",
            status: "active",
            title: `Alerta crítica: ${sensor.name}`,
            description: `Valor ${reading.value} ${sensor.unit} ${exceedsMax ? "supera el umbral máximo de " + sensor.alertThresholdMax : "cae bajo el umbral mínimo de " + sensor.alertThresholdMin}`,
            sensorId: sensor.id,
            zoneId: sensor.zoneId,
          });
        } else {
          const exceedsWarningMax =
            sensor.warningThresholdMax !== null &&
            reading.value > sensor.warningThresholdMax;
          const belowWarningMin =
            sensor.warningThresholdMin !== null &&
            reading.value < sensor.warningThresholdMin;
          if (exceedsWarningMax || belowWarningMin) {
            await storage.createAlert({
              type: "sensor_threshold",
              severity: "warning",
              status: "active",
              title: `Advertencia: ${sensor.name}`,
              description: `Valor ${reading.value} ${sensor.unit} ${exceedsWarningMax ? "cerca del umbral máximo de " + sensor.warningThresholdMax : "cerca del umbral mínimo de " + sensor.warningThresholdMin}`,
              sensorId: sensor.id,
              zoneId: sensor.zoneId,
            });
          }
        }
      }

      res.status(201).json(reading);
    } catch (err) {
      next(err);
    }
  });

  // Public endpoint for IoT devices
  app.post("/api/iot/readings", async (req, res, next) => {
    try {
      const { sensorCode, value, unit, recordedAt } = req.body;
      if (!sensorCode || value === undefined)
        return res
          .status(400)
          .json({ message: "sensorCode and value required" });
      const allSensors = await storage.getSensors();
      const sensor = allSensors.find((s) => s.code === sensorCode);
      if (!sensor) return res.status(404).json({ message: "Sensor not found" });
      const reading = await storage.createSensorReading({
        sensorId: sensor.id,
        value: parseFloat(value),
        unit: unit || sensor.unit,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      });
      res.status(201).json(reading);
    } catch (err) {
      next(err);
    }
  });

  // ─── Recipes ────────────────────────────────────────────────────────────────

  app.get("/api/recipes", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getRecipes());
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/recipes", requireAuth, async (req, res, next) => {
    try {
      const data = insertRecipeSchema.parse(req.body);
      res.status(201).json(await storage.createRecipe(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/recipes/:id", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.updateRecipe(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  });

  // ─── Simulations ────────────────────────────────────────────────────────────

  app.get("/api/simulations", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getSimulations());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/simulations/:id", requireAuth, async (req, res, next) => {
    try {
      const sim = await storage.getSimulation(Number(req.params.id));
      if (!sim) return res.sendStatus(404);
      res.json(sim);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/simulations", requireAuth, async (req, res, next) => {
    try {
      const data = insertMixSimulationSchema.parse(req.body);
      const sim = await storage.createSimulation(data);
      await storage.createTraceEvent({
        eventType: "simulation_created",
        description: `Simulación de mezcla "${sim.name}" creada`,
        simulationId: sim.id,
        occurredAt: new Date(),
      });
      res.status(201).json(sim);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/simulations/:id", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        totalQuantity: req.body.totalQuantity
          ? parseFloat(req.body.totalQuantity)
          : undefined,
        estimatedMoisture:
          req.body.estimatedMoisture !== undefined
            ? parseFloat(req.body.estimatedMoisture)
            : undefined,
        estimatedProtein:
          req.body.estimatedProtein !== undefined
            ? parseFloat(req.body.estimatedProtein)
            : undefined,
        estimatedFat:
          req.body.estimatedFat !== undefined
            ? parseFloat(req.body.estimatedFat)
            : undefined,
        estimatedStarch:
          req.body.estimatedStarch !== undefined
            ? parseFloat(req.body.estimatedStarch)
            : undefined,
        estimatedFiber:
          req.body.estimatedFiber !== undefined
            ? parseFloat(req.body.estimatedFiber)
            : undefined,
        estimatedAsh:
          req.body.estimatedAsh !== undefined
            ? parseFloat(req.body.estimatedAsh)
            : undefined,
      };
      res.json(await storage.updateSimulation(Number(req.params.id), body));
    } catch (err) {
      next(err);
    }
  });

  // Simulation Items
  app.get("/api/simulations/:id/items", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getSimulationItems(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  });

  app.post(
    "/api/simulations/:id/items",
    requireAuth,
    async (req, res, next) => {
      try {
        const body = {
          simulationId: Number(req.params.id),
          lotId: parseInt(req.body.lotId),
          quantity: parseFloat(req.body.quantity),
        };
        const data = insertMixSimulationItemSchema.parse(body);
        const item = await storage.createSimulationItem(data);

        // Recalculate simulation totals
        await recalculateSimulation(Number(req.params.id));

        res.status(201).json(item);
      } catch (err) {
        next(err);
      }
    },
  );

  app.delete(
    "/api/simulation-items/:id",
    requireAuth,
    async (req, res, next) => {
      try {
        const items = await storage.getSimulationItems(0);
        await storage.deleteSimulationItem(Number(req.params.id));
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─── Production Batches ──────────────────────────────────────────────────────

  app.get("/api/production-batches", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getProductionBatches());
    } catch (err) {
      next(err);
    }
  });

  app.get(
    "/api/production-batches/:id",
    requireAuth,
    async (req, res, next) => {
      try {
        const b = await storage.getProductionBatch(Number(req.params.id));
        if (!b) return res.sendStatus(404);
        res.json(b);
      } catch (err) {
        next(err);
      }
    },
  );

  app.post("/api/production-batches", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        producedAt: new Date(req.body.producedAt),
        quantity: parseFloat(req.body.quantity),
        simulationId: parseInt(req.body.simulationId),
      };
      const data = insertProductionBatchSchema.parse(body);
      const batch = await storage.createProductionBatch(data);
      await storage.createTraceEvent({
        eventType: "batch_produced",
        description: `Lote de producción ${batch.batchCode} registrado`,
        simulationId: batch.simulationId,
        batchId: batch.id,
        occurredAt: new Date(),
      });
      res.status(201).json(batch);
    } catch (err) {
      next(err);
    }
  });

  // ─── Final Product Analyses ───────────────────────────────────────────────────

  app.get("/api/final-analyses", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getFinalAnalyses());
    } catch (err) {
      next(err);
    }
  });

  app.get(
    "/api/final-analyses/batch/:batchId",
    requireAuth,
    async (req, res, next) => {
      try {
        res.json(
          await storage.getFinalAnalysisByBatch(Number(req.params.batchId)),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  app.post("/api/final-analyses", requireAuth, async (req, res, next) => {
    try {
      const batch = await storage.getProductionBatch(
        parseInt(req.body.batchId),
      );
      if (!batch)
        return res
          .status(404)
          .json({ message: "Lote de producción no encontrado" });

      const simulation = await storage.getSimulation(batch.simulationId);
      if (!simulation)
        return res.status(404).json({ message: "Simulación no encontrada" });

      const moisture = req.body.moisture ? parseFloat(req.body.moisture) : null;
      const protein = req.body.protein ? parseFloat(req.body.protein) : null;
      const fat = req.body.fat ? parseFloat(req.body.fat) : null;
      const starch = req.body.starch ? parseFloat(req.body.starch) : null;
      const fiber = req.body.fiber ? parseFloat(req.body.fiber) : null;
      const ash = req.body.ash ? parseFloat(req.body.ash) : null;

      const body = {
        batchId: parseInt(req.body.batchId),
        moisture,
        protein,
        fat,
        starch,
        fiber,
        ash,
        moistureDeviation:
          moisture !== null && simulation.estimatedMoisture
            ? moisture - simulation.estimatedMoisture
            : null,
        proteinDeviation:
          protein !== null && simulation.estimatedProtein
            ? protein - simulation.estimatedProtein
            : null,
        fatDeviation:
          fat !== null && simulation.estimatedFat
            ? fat - simulation.estimatedFat
            : null,
        starchDeviation:
          starch !== null && simulation.estimatedStarch
            ? starch - simulation.estimatedStarch
            : null,
        fiberDeviation:
          fiber !== null && simulation.estimatedFiber
            ? fiber - simulation.estimatedFiber
            : null,
        ashDeviation:
          ash !== null && simulation.estimatedAsh
            ? ash - simulation.estimatedAsh
            : null,
        notes: req.body.notes,
        analyzedAt: new Date(req.body.analyzedAt),
      };

      const analysis = await storage.createFinalAnalysis(body as any);

      await storage.createTraceEvent({
        eventType: "final_analysis",
        description: `Análisis NIR final registrado para lote ${batch.batchCode}`,
        batchId: batch.id,
        occurredAt: new Date(),
      });

      // Generate recommendations based on deviations
      await generateRecommendations(batch.id, simulation, analysis);

      res.status(201).json(analysis);
    } catch (err) {
      next(err);
    }
  });

  // ─── Recommendations ─────────────────────────────────────────────────────────

  app.get("/api/recommendations", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getRecommendations());
    } catch (err) {
      next(err);
    }
  });

  app.get(
    "/api/recommendations/batch/:batchId",
    requireAuth,
    async (req, res, next) => {
      try {
        res.json(
          await storage.getRecommendationsByBatch(Number(req.params.batchId)),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  app.patch("/api/recommendations/:id", requireAuth, async (req, res, next) => {
    try {
      res.json(
        await storage.updateRecommendation(Number(req.params.id), req.body),
      );
    } catch (err) {
      next(err);
    }
  });

  // ─── Alerts ──────────────────────────────────────────────────────────────────

  app.get("/api/alerts", requireAuth, async (req, res, next) => {
    try {
      res.json(await storage.getAlerts());
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/alerts", requireAuth, async (req, res, next) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      res.status(201).json(await storage.createAlert(data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/alerts/:id", requireAuth, async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        resolvedAt: req.body.status === "resolved" ? new Date() : undefined,
      };
      res.json(await storage.updateAlert(Number(req.params.id), body));
    } catch (err) {
      next(err);
    }
  });

  // ─── Trace Events ────────────────────────────────────────────────────────────

  app.get("/api/trace-events", requireAuth, async (req, res, next) => {
    try {
      const filters: any = {};
      if (req.query.lotId) filters.lotId = Number(req.query.lotId);
      if (req.query.simulationId)
        filters.simulationId = Number(req.query.simulationId);
      if (req.query.batchId) filters.batchId = Number(req.query.batchId);
      res.json(
        await storage.getTraceEvents(
          Object.keys(filters).length ? filters : undefined,
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}

async function recalculateSimulation(simulationId: number) {
  const items = await storage.getSimulationItems(simulationId);
  if (items.length === 0) {
    await storage.updateSimulation(simulationId, {
      totalQuantity: 0,
      estimatedMoisture: null,
      estimatedProtein: null,
      estimatedFat: null,
      estimatedStarch: null,
      estimatedFiber: null,
      estimatedAsh: null,
    });
    return;
  }

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  let wMoisture = 0,
    wProtein = 0,
    wFat = 0,
    wStarch = 0,
    wFiber = 0,
    wAsh = 0;
  let hasNir = false;

  for (const item of items) {
    const nirs = (item.lot as any)?.nirAnalyses;
    if (nirs && nirs.length > 0) {
      const nir = nirs[nirs.length - 1];
      const weight = item.quantity / totalQty;
      if (nir.moisture !== null) {
        wMoisture += nir.moisture * weight;
        hasNir = true;
      }
      if (nir.protein !== null) {
        wProtein += nir.protein * weight;
        hasNir = true;
      }
      if (nir.fat !== null) {
        wFat += nir.fat * weight;
        hasNir = true;
      }
      if (nir.starch !== null) {
        wStarch += nir.starch * weight;
        hasNir = true;
      }
      if (nir.fiber !== null) {
        wFiber += nir.fiber * weight;
        hasNir = true;
      }
      if (nir.ash !== null) {
        wAsh += nir.ash * weight;
        hasNir = true;
      }
    }
  }

  const simItems = await storage.getSimulation(simulationId);

  await storage.updateSimulation(simulationId, {
    totalQuantity: totalQty,
    estimatedMoisture: hasNir ? parseFloat(wMoisture.toFixed(2)) : null,
    estimatedProtein: hasNir ? parseFloat(wProtein.toFixed(2)) : null,
    estimatedFat: hasNir ? parseFloat(wFat.toFixed(2)) : null,
    estimatedStarch: hasNir ? parseFloat(wStarch.toFixed(2)) : null,
    estimatedFiber: hasNir ? parseFloat(wFiber.toFixed(2)) : null,
    estimatedAsh: hasNir ? parseFloat(wAsh.toFixed(2)) : null,
    status: "ready",
  });
}

async function generateRecommendations(
  batchId: number,
  simulation: any,
  analysis: any,
) {
  const recommendations: any[] = [];

  const TOLERANCE = 0.5;
  const HIGH_TOLERANCE = 1.0;

  if (analysis.proteinDeviation !== null) {
    const dev = analysis.proteinDeviation;
    if (Math.abs(dev) > HIGH_TOLERANCE) {
      recommendations.push({
        batchId,
        simulationId: simulation.id,
        type: "quality_deviation",
        severity: "warning" as const,
        title: `Desviación de proteína: ${dev > 0 ? "+" : ""}${dev.toFixed(2)}%`,
        description:
          dev < 0
            ? `La proteína real (${analysis.protein}%) quedó por debajo de la predicción (${simulation.estimatedProtein}%). Considere revisar la calidad de los lotes de materias proteicas o aumentar el porcentaje de fuentes proteicas en la próxima mezcla.`
            : `La proteína real (${analysis.protein}%) supera la predicción (${simulation.estimatedProtein}%). Los lotes de ingredientes proteicos tienen mayor concentración de la esperada.`,
      });
    }
  }

  if (analysis.moistureDeviation !== null) {
    const dev = analysis.moistureDeviation;
    if (Math.abs(dev) > TOLERANCE) {
      recommendations.push({
        batchId,
        simulationId: simulation.id,
        type: "moisture_deviation",
        severity:
          Math.abs(dev) > HIGH_TOLERANCE
            ? ("warning" as const)
            : ("info" as const),
        title: `Desviación de humedad: ${dev > 0 ? "+" : ""}${dev.toFixed(2)}%`,
        description:
          dev > 0
            ? `La humedad real (${analysis.moisture}%) supera la predicción (${simulation.estimatedMoisture}%). Revisar condiciones de almacenamiento y estado del secado.`
            : `La humedad real (${analysis.moisture}%) está por debajo de la predicción (${simulation.estimatedMoisture}%). Posible sobredesecado del material.`,
      });
    }
  }

  if (analysis.fatDeviation !== null) {
    const dev = analysis.fatDeviation;
    if (Math.abs(dev) > TOLERANCE) {
      recommendations.push({
        batchId,
        simulationId: simulation.id,
        type: "fat_deviation",
        severity: "info" as const,
        title: `Desviación de grasa: ${dev > 0 ? "+" : ""}${dev.toFixed(2)}%`,
        description: `La grasa real (${analysis.fat}%) difiere de la predicción (${simulation.estimatedFat}%). Revisar los lotes de materias con alto contenido graso.`,
      });
    }
  }

  for (const rec of recommendations) {
    await storage.createRecommendation(rec);
  }
}
