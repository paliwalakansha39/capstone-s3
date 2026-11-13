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


## 3. Chunk 8 Implementation Structure

### 3.1 Subject-Wise Component Breakdown

#### A. Information Systems Design (ISD) — Frontend
- **Route Overlap Detection Page (`frontend/src/pages/RouteOverlapPage.jsx`)**:
  - Interactive map canvas supporting click-to-add waypoint, marker drag-to-edit, and right-click or popup point deletion.
  - Layer controls for toggling existing routes and proposed routes.
  - Multi-colored path renderer: Proposed (Blue), Existing (Grey), Overlaps (Red), Non-overlapping (Green).
  - Analytical Results Panel displaying total proposed distance, overlapping distance, unique overlap percentage, list of affected existing routes, and route comparison metrics.
  - Analysis History Drawer for inspecting and loading previous evaluations.
  - Action controls: "Draw Route", "Add Point", "Clear Route", "Analyze Overlap", "Save Proposed Route".
- **API Client Service (`frontend/src/services/routeOverlapService.js`)**:
  - `analyzeRouteOverlap(payload)`
  - `saveProposedRoute(payload)`
  - `getProposedRoutes()`
  - `getOverlapAnalysis(id)`
  - `getOverlapHistory()`
  - `deleteProposedRoute(id)`

#### B. Advanced Software Design (ASD) — Backend
- **Geographical Calculation Engine (`backend/src/services/geoDistance.js`)**:
  - Haversine great-circle distance computation.
  - Point-to-segment projection and cross-track distance.
  - Angular alignment detection to separate corridor overlaps from perpendicular/crossing intersections.
- **Route Overlap Detection Algorithm (`backend/src/services/routeOverlapEngine.js`)**:
  - Configurable tolerance $\epsilon$ in meters (default 50m).
  - Subsegment interpolation and corridor sampling.
  - Direction-independent overlap detection (bi-directional transit corridors).
  - 1D interval union algorithm for duplicate overlap prevention across multiple overlapping routes.
  - Overlap percentage formula:
    $$\text{Overlap Percentage} = \min\left(100, \max\left(0, \frac{\text{Overlapping Distance}}{\text{Proposed Total Distance}} \times 100\right)\right)$$
- **Controllers and Routers (`backend/src/controllers/routeOverlapController.js`, `backend/src/routes/routeOverlapRoutes.js`)**:
  - Full input validation (handling empty routes, malformed coordinates, out-of-range lat/long).
  - Admin JWT authentication via `requireAdminAuth`.

#### C. Database Engineering (DE) — Schema & Migrations
- **Proposed Routes Model (`proposed_routes`)**: Stores proposed route drafts with metadata.
- **Proposed Route Coordinates Model (`proposed_route_coordinates`)**: Ordered coordinates with sequence index.
- **Route Overlap Analysis Model (`route_overlap_analyses`)**: Historical analysis records with metrics and admin reference.
- **Overlapping Route Segments Model (`overlapping_route_segments`)**: Extracted overlapping sections with JSON coordinate sequences.
