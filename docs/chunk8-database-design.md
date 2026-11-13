# Chunk 8 Database Model Design (Subject: DE)

## 1. Entity-Relationship Design

The Route Overlap Detection module introduces four dedicated relational entities into the PostgreSQL database:

1. **`ProposedRoute` (`proposed_routes`)**:
   - Represents a route candidate drawn or submitted by transit planning administrators.
   - Primary key: `id` (UUID).
   - Attributes: `name`, `description`, `status` (Draft, Analyzed, Approved, Archived), `totalDistance` (in kilometers), `estimatedTravelTime` (in minutes).
   - Relations: One-to-many with `ProposedRouteCoordinate`, one-to-many with `RouteOverlapAnalysis`, many-to-one with `Admin`.

2. **`ProposedRouteCoordinate` (`proposed_route_coordinates`)**:
   - Stores the ordered geographic waypoints defining the polyline of the proposed route.
   - Attributes: `latitude` (Float, [-90, 90]), `longitude` (Float, [-180, 180]), `sequenceNumber` (Int >= 1), `name` (Optional waypoint description).
   - Constraints: Composite unique constraint `[proposedRouteId, sequenceNumber]` to enforce strict deterministic waypoint ordering.

3. **`RouteOverlapAnalysis` (`route_overlap_analyses`)**:
   - Stores the execution audit and quantitative outcome of an overlap detection calculation.
   - Attributes: `proposedRouteName`, `toleranceMeters` (Float, e.g. 50.0m), `proposedTotalDistance` (Float, meters/km), `overlappingDistance` (Float, meters/km), `overlapPercentage` (Float, 0.0 to 100.0), `status` (Completed, Failed), `summary` (Text).
   - Relations: Foreign key to `ProposedRoute` (nullable for ad-hoc evaluations), foreign key to `Admin` (audit trail), one-to-many with `OverlappingRouteSegment`.

4. **`OverlappingRouteSegment` (`overlapping_route_segments`)**:
   - Stores the discrete sub-segments where the proposed route overlaps with a specific existing bus route.
   - Attributes: `existingRouteNumber`, `existingRouteName`, `overlapDistance` (Float), `overlapPercentage` (Float), `segmentCoordinates` (JSON array of `[lat, lng]` points), `startPoint` (JSON `{latitude, longitude}`), `endPoint` (JSON `{latitude, longitude}`).
   - Relations: Foreign key to `RouteOverlapAnalysis` (cascade delete), foreign key to `Route` (on delete set null).
