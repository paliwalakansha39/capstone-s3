DTC Bus Management System — Data Engineering ER Model
Route Overlap Detection Module (Chunk 8)
This ER model is based on the Prisma schema in backend/prisma/schema.prisma and the design notes in docs/chunk8-database-design.md.

erDiagram
    ADMIN {
        String id PK
        String name
        String email UK
        String password
    }

    ROUTE {
        String id PK
        String routeNumber UK
        String routeName
    }

    PROPOSED_ROUTE {
        String id PK
        String routeName
        String status
        String createdByAdminId FK
        DateTime createdAt
    }

    PROPOSED_ROUTE_COORDINATE {
        String id PK
        String proposedRouteId FK
        Float latitude
        Float longitude
        Int sequenceNumber
    }

    ROUTE_OVERLAP_ANALYSIS {
        String id PK
        String proposedRouteId FK
        String analyzedByAdminId FK
        String proposedRouteName
        DateTime createdAt
    }

    OVERLAPPING_ROUTE_SEGMENT {
        String id PK
        String analysisId FK
        String existingRouteId FK
        String existingRouteNumber
        String existingRouteName
        Json segmentCoordinates
        Json startPoint
        Json endPoint
    }

    ADMIN o|--o{ PROPOSED_ROUTE : creates
    ADMIN o|--o{ ROUTE_OVERLAP_ANALYSIS : analyzes

    PROPOSED_ROUTE ||--o{ PROPOSED_ROUTE_COORDINATE : contains
    PROPOSED_ROUTE o|--o{ ROUTE_OVERLAP_ANALYSIS : evaluated_in

    ROUTE_OVERLAP_ANALYSIS ||--o{ OVERLAPPING_ROUTE_SEGMENT : produces
    ROUTE o|--o{ OVERLAPPING_ROUTE_SEGMENT : referenced_by
    
2. Entities and Attributes
ADMIN (admins)
- Primary key: id
- Unique attribute: email
- Relationship: An admin may create multiple proposed routes and may be recorded as the admin who ran multiple overlap analyses.
- createdByAdminId and analyzedByAdminId are nullable foreign keys. If the referenced admin is deleted, the foreign key is set to NULL (onDelete: SetNull).
ROUTE (routes)
- Primary key: id
- Unique attribute: routeNumber
- Represents an existing operational bus route.
- An existing route may be referenced by multiple overlapping route segments.
- OverlappingRouteSegment.existingRouteId is nullable and uses onDelete: SetNull.
PROPOSED_ROUTE (proposed_routes)
- Primary key: id
- Foreign key: createdByAdminId references Admin.id (nullable).
- Stores a route proposal, its name, description, status, distance and estimated travel time.
- One proposed route can contain multiple coordinates and can have multiple overlap analyses.
PROPOSED_ROUTE_COORDINATE (proposed_route_coordinates)
- Primary key: id
- Foreign key: proposedRouteId references ProposedRoute.id.
- Stores each ordered geographic waypoint using latitude, longitude, sequenceNumber and optional name.
- The pair (proposedRouteId, sequenceNumber) is unique, so a waypoint sequence number cannot be repeated within the same proposed route.
- Deleting a proposed route cascades to its coordinates (onDelete: Cascade).
ROUTE_OVERLAP_ANALYSIS (route_overlap_analyses)
- Primary key: id
- Foreign keys:
  - proposedRouteId references ProposedRoute.id (nullable; supports an ad-hoc analysis without a saved proposed route).
  - analyzedByAdminId references Admin.id (nullable).
- Stores the analysis name snapshot, tolerance, proposed distance, overlapping distance, overlap percentage, status and optional summary.
- One analysis can produce multiple overlapping route segments.
- Deleting the referenced proposed route cascades to its linked analyses. Deleting the admin sets analyzedByAdminId to NULL.
OVERLAPPING_ROUTE_SEGMENT (overlapping_route_segments)
- Primary key: id
- Foreign keys:
  - analysisId references RouteOverlapAnalysis.id (required).
  - existingRouteId references Route.id (nullable).
- Stores the overlap result for one existing route, including route number/name snapshots, overlap distance/percentage and geographic segment data.
- segmentCoordinates, startPoint and endPoint use PostgreSQL JSON storage through Prisma's Json type.
- Deleting an analysis cascades to its segments. Deleting an existing route sets existingRouteId to NULL, while the stored route number/name snapshots remain available.
3. Relationship Cardinalities
Relationship	Cardinality	Explanation
Admin → ProposedRoute	One-to-many (1:N), optional on the proposed-route side	One admin can create zero or many proposed routes. A proposed route can have zero or one creator admin.
Admin → RouteOverlapAnalysis	One-to-many (1:N), optional on the analysis side	One admin can be associated with zero or many analyses. An analysis can have zero or one analyzing admin.
ProposedRoute → ProposedRouteCoordinate	One-to-many (1:N)	One proposed route has zero or many ordered coordinates. Each coordinate belongs to exactly one proposed route.
ProposedRoute → RouteOverlapAnalysis	One-to-many (1:N), optional on the analysis side	A proposed route can have zero or many analyses. An analysis may have no linked proposed route for an ad-hoc evaluation.
RouteOverlapAnalysis → OverlappingRouteSegment	One-to-many (1:N)	One analysis produces zero or many overlapping segments. Each segment belongs to exactly one analysis.
Route → OverlappingRouteSegment	One-to-many (1:N), optional on the segment side	An existing route can be referenced by zero or many segments. A segment may have no linked existing route if that route is deleted.


4. Primary Keys, Foreign Keys and Constraints
- Every entity has a UUID id primary key.
- Admin.email and Route.routeNumber are unique.
- ProposedRouteCoordinate has a composite unique constraint on (proposedRouteId, sequenceNumber).
- Required relations are represented by non-null foreign keys, such as ProposedRouteCoordinate.proposedRouteId and OverlappingRouteSegment.analysisId.
- Optional relations use nullable foreign keys, such as ProposedRoute.createdByAdminId, RouteOverlapAnalysis.proposedRouteId, RouteOverlapAnalysis.analyzedByAdminId and OverlappingRouteSegment.existingRouteId.
- Referential actions are defined in the Prisma schema: Cascade for dependent coordinates, analyses and segments; SetNull for optional admin and existing-route references.
5. Notes on the Model
- This ER model documents the four DE/Chunk 8 entities and the existing Admin and Route entities that they reference.
- The diagram uses the model/table names and relationships from the project's Prisma schema. Prisma's @@map declarations map these models to the snake_case PostgreSQL table names shown above.
- Geographic waypoint coordinates are stored as separate rows in proposed_route_coordinates, preserving their order through sequenceNumber.
- Overlap segment geometry is stored in JSON fields in overlapping_route_segments.
- Route number and route name are also stored as snapshot attributes in OverlappingRouteSegment, so the analysis can retain the identifying details even if the linked existing route is later removed.