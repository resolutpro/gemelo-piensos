# Shadow Pilot — Fábrica de Piensos Digital

## Overview
A comprehensive industrial web application in Spanish for digitalizing a feed factory (fábrica de piensos). Full-stack TypeScript with React + Express + Drizzle ORM + PostgreSQL.

## Architecture

### Stack
- **Frontend**: React + Vite + TypeScript, TanStack Query, Wouter (routing), shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js + TypeScript, Passport.js (local auth with scrypt), Drizzle ORM
- **Database**: PostgreSQL (Replit-managed)

### Key Files
- `shared/schema.ts` — 16 database tables: users, suppliers, rawMaterials, zones, rawMaterialLots, nirAnalyses, sensors, sensorReadings, recipes, mixSimulations, mixSimulationItems, productionBatches, finalProductAnalyses, recommendations, alerts, traceEvents
- `server/auth.ts` — Passport-local authentication with scrypt password hashing; requires SESSION_SECRET env var
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface with all CRUD operations
- `server/routes.ts` — All REST API endpoints + IoT endpoint + auto-alert generation + recommendation engine
- `client/src/App.tsx` — App router with all 13 protected routes
- `client/src/components/app-sidebar.tsx` — Dark navy sidebar with all navigation items

### Pages
1. `/` — Dashboard with KPIs
2. `/recepcion` — Raw material reception with NIR analysis (in-dialog)
3. `/recepcion/:id` — Lot detail with NIR history and trace timeline
4. `/sensores` — IoT sensor monitoring with threshold alerts
5. `/simulaciones` — Mix simulation list (digital twin)
6. `/simulaciones/nueva` — New simulation with ingredient builder and nutritional preview
7. `/simulaciones/:id` — Simulation detail with production registration
8. `/produccion` — Physical production batch tracking
9. `/verificacion` — Final NIR analysis with deviation comparison
10. `/trazabilidad` — Full traceability timeline
11. `/alertas` — Alert management with severity filtering
12. `/configuracion` — Catalog management (raw materials, zones, suppliers)

## Design System
- Orange industrial theme: `--primary: 22 90% 50%` 
- Dark navy sidebar: `--sidebar: 220 25% 14%` (light) / `220 25% 8%` (dark)
- Inter font, full Spanish UI
- Dark mode supported

## Authentication
- Custom passport-local with scrypt hashing (NOT Replit Auth)
- Requires `SESSION_SECRET` environment variable (already configured)
- Register at `/auth` with username + password

## Environment Variables
- `SESSION_SECRET` — Required for session encryption
- `DATABASE_URL` — PostgreSQL connection string (auto-configured by Replit)

## Business Logic
- **NIR Analysis**: Nutritional data captured at reception and compared at final verification
- **Digital Twin**: Weighted average of NIR values by ingredient quantity proportions
- **Auto-alerts**: Generated when sensor readings exceed configured thresholds
- **Recommendations**: Generated after final product analysis by comparing real vs. predicted values
- **Traceability**: Events auto-created for lot reception, NIR analysis, simulation creation, production, final analysis
