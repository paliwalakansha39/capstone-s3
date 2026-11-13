# Chunk 8: Route Overlap Detection and Visualization — Architecture Specification

## 1. Analysis of Existing Route Management Architecture

### 1.1 Existing Route Models and Schemas
In the unified DTC platform (PostgreSQL + Prisma ORM):
- **`Route` Model (`routes` table)**:
  - `id`: UUID (Primary Key)
  - `routeNumber`: VarChar(30), unique
  - `routeName`: VarChar(120)
  - `startingPoint`: VarChar(120)
  - `destination`: VarChar(120)
  - `totalDistance`: Float (km)
  - `estimatedTravelTime`: Int (minutes)
  - Associated with ordered `BusStop[]`, `Trip[]`, and `Bus[]`.
- **`BusStop` Model (`bus_stops` table)**:
  - `id`: UUID (Primary Key)
  - `stopName`: VarChar(120)
  - `latitude`: Float (-90 to 90)
  - `longitude`: Float (-180 to 180)
  - `sequenceNumber`: Positive Integer
  - `routeId`: Foreign key to `Route` with cascade deletion
  - Unique constraint on `[routeId, sequenceNumber]` and index.

### 1.2 Existing Route Controller and APIs
- `GET /api/routes`: Lists all routes with nested stops ordered by `sequenceNumber ASC`.
- `GET /api/routes/:id`: Retrieves route details with nested stops.
- `POST /api/routes`: Creates route with optional atomic stop creation.
- `PUT /api/routes/:id`: Updates route fields and/or reorders/updates stops.
- `DELETE /api/routes/:id`: Deletes route and cascade-deletes stops.
- `GET /api/legacy-routes`: Provides compact route summary for operational modules.

### 1.3 Architectural Requirements for Chunk 8
Chunk 8 introduces the ability for administrators to draw proposed routes and detect geographical overlaps with existing routes:
1. Proposed routes need persistence and versioning without corrupting production routes.
2. Overlap analysis records need to be stored with timestamps, administrative audit trails, overlap distances, and overlap percentages.
3. Overlapping segments must be saved with coordinate geometries for map overlay rendering.
4. Existing route management and scheduling modules (Chunks 1–6) must remain completely unaffected.
