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


## 2. Map Integration and Route Coordinate Data Structures

### 2.1 Existing Map Technology Stack
- **Library**: `leaflet` (v1.9.4) & `react-leaflet` (v5.0.0).
- **Base Tile Provider**: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Default Viewport**: Delhi Metropolitan Region (`[28.6139, 77.209]`, zoom level 11-14).
- **Marker Styling**: Custom CSS HTML divIcons (`route-marker`, `route-marker-terminal`).
- **Polyline Rendering**: Leaflet `Polyline` component with geodesic coordinate arrays `[[lat, lng], ...]`.

### 2.2 Route Representation and Coordinate Structures
- **Existing Routes**: Represented as an ordered sequence of bus stops $\mathcal{S} = [S_1, S_2, \dots, S_n]$ where each stop $S_i = (\text{lat}_i, \text{lon}_i)$. The route path is a piecewise linear polyline formed by segments $[S_i, S_{i+1}]$.
- **Proposed Routes**: Represented as a sequence of user-drawn waypoints $\mathcal{P} = [P_1, P_2, \dots, P_m]$ where $P_k = (\text{lat}_k, \text{lon}_k)$.
- **Segment Breakdown**:
  - Proposed segment $j$: $Seg_j = (P_j, P_{j+1})$ with length $L_j = \text{haversine}(P_j, P_{j+1})$.
  - Existing segment $k$: $Seg_k = (S_k, S_{k+1})$ with length $L_k = \text{haversine}(S_k, S_{k+1})$.
- **Color Coding Specification**:
  - **Proposed Route**: Blue (`#2563eb`, weight 4, opacity 0.9).
  - **Existing Routes**: Grey (`#94a3b8`, weight 3, opacity 0.7).
  - **Overlapping Sections**: Red (`#ef4444`, weight 6, opacity 0.95).
  - **Non-Overlapping Sections**: Green (`#10b981`, weight 4, opacity 0.9).
