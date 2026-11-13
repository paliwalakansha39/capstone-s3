# DTC Bus Scheduling and Management System — Project Changelog

This document tracks all project contributions across the three core academic subjects:
- **ISD**: Information Systems Design
- **ASD**: Advanced Software Design / Agile Software Development
- **DE**: Data Engineering / Database Engineering

---

## [Unreleased] - Chunk 3: Crew Management System

### Commit 1: Database Model & Schema Definition (Subject: DE)
- **Files Created**:
  - `backend/src/models/Crew.js`: Defined Sequelize model for `Crew` (supporting both Drivers and Conductors) with fields: `crewId`, `name`, `role`, `badgeNumber`, `licenseNumber`, `qualification`, `experienceYears`, `assignedDepot`, `status` (Available, On Duty, On Rest, On Leave), and `phone`.
- **Files Modified**:
  - `backend/src/models/index.js`: Registered and exported `Crew` model within centralized Sequelize model exports.

### Commit 2: Migration & Sample DTC Crew Seeding (Subject: DE)
- **Files Modified**:
  - `backend/src/scripts/migrate.js`: Added `crews` table to database synchronization routine.
  - `backend/src/scripts/seed.js`: Added 12 realistic DTC crew members (6 Drivers and 6 Conductors) with licenses, qualifications, depot allocations, and duty statuses across Delhi depots.

### Commit 3: Crew Input Validation & Availability Rules (Subject: ASD)
- **Files Created**:
  - `backend/src/middleware/crewValidationMiddleware.js`: Implemented validation middleware for `createCrew` and `updateCrew` requests, enforcing role constraints (Driver vs. Conductor), license presence for drivers, badge uniqueness validation, phone format checking, and status verification (`Available`, `On Duty`, `On Rest`, `On Leave`).

### Commit 4: Crew Management & Availability REST APIs (Subject: ASD)
- **Files Created**:
  - `backend/src/controllers/crewController.js`: Implemented `getAllCrew` (with search and filters for role, depot, status, and pagination), `getCrewAvailabilityStats` (analytics on available drivers/conductors and on-duty/rest ratios), `getCrewById`, `createCrew`, `updateCrew`, and `deleteCrew` (blocking deletion of on-duty crew).
  - `backend/src/routes/crewRoutes.js`: Defined REST routes for `/api/crew`, connecting admin authorization and validation middlewares.
- **Files Modified**:
  - `backend/src/routes/index.js`: Mounted `/api/crew` route hierarchy into main Express API router.

### Commit 5: Automated Testing Suite for Crew APIs (Subject: ASD)
- **Files Created**:
  - `backend/tests/crew.test.js`: Added 12 automated unit and integration tests covering crew listing, role filtering (Driver vs. Conductor), availability statistics, CRUD operations, license requirement enforcement for drivers, duplicate badge rejection (409 Conflict), and duty-state safety checks (blocking deletion of on-duty crew members).
  - Validated test suite: 30/30 tests passing across all backend modules.

### Commit 6: Crew Management Interface, Availability Dashboard & API Service (Subject: ISD)
- **Files Created**:
  - `frontend/src/services/crewService.js`: API client integration with backend `/api/crew` endpoints (listing, availability stats, single retrieval, add, update, delete).
  - `frontend/src/pages/CrewManagementPage.jsx`: Full-featured responsive crew management page with live KPI availability cards (Total crew, Available drivers/conductors, On-duty count), role/status/depot filters, search bar, crew roster table, quick status toggle, modal inspector, add/edit form with license validation, and delete safety checks.
- **Files Modified**:
  - `frontend/src/App.jsx`: Registered `/admin/crew` route in administrative router hierarchy.
  - `frontend/src/layouts/AdminLayout.jsx`: Added Crew Management navigation link with `UserCheck` icon and responsive active state in admin sidebar.
  - `frontend/src/pages/DashboardPage.jsx`: Connected live crew availability metrics and quick link to crew roster on the main admin dashboard.
  - `README.md`: Documented Chunk 3 specifications and crew management API endpoints.

---

## [Unreleased] - Setup & Phase 2 Preparations

### Documentation & Startup Resilience
- **Files Modified**:
  - `README.md`: Added comprehensive, step-by-step installation and setup guide detailing prerequisites, dual-database setup (PostgreSQL + SQLite), Prisma migration steps, and automated testing instructions.
  - `backend/src/server.js`: Added graceful database connection handling so backend services run reliably across varied development environments.

---

## Chunk 6: Linked Duty Scheduling (Phase 2 - Member 3)

### Commit 1: Duty and DutyAssignment Database Models & Associations (Subject: DE)
- **Files Created**:
  - `backend/src/models/Duty.js`: Defined Sequelize model for `Duty` with fields: `dutyNumber`, `shiftType` (Morning, Evening, Full-Day, Night), `shiftDate`, `startTime`, `endTime`, `depot`, `totalDurationHours`, `status` (Scheduled, Active, Completed, Cancelled), and `schedulingType` (Linked).
  - `backend/src/models/DutyAssignment.js`: Defined Sequelize model for `DutyAssignment` establishing linked crew-to-bus binding: `dutyId`, `busId`, `driverId`, `conductorId`, `vehicleHandoverVerified`, and `totalTripsCovered`.
- **Files Modified**:
  - `backend/src/models/index.js`: Registered `Duty` and `DutyAssignment` models and established 1:1 duty assignment, bus, driver, and conductor associations.

### Commit 2: Duty Migrations & Sample DTC Linked Duty Seeding (Subject: DE)
- **Files Modified**:
  - `backend/src/scripts/migrate.js`: Added `duties` and `duty_assignments` database migration synchronization with optimized composite indexes on `(shift_date, depot)`, `status`, `bus_id`, `driver_id`, and `conductor_id`.
  - `backend/src/scripts/seed.js`: Seeded realistic DTC linked duty shifts pairing active fleet buses (e.g. `DTC-1041`, `DTC-1042`, `DTC-2105`) permanently with dedicated driver-conductor crew pairs for their full shifts without mid-shift vehicle swaps.

### Commit 3: Linked Duty Input Validation & Constraint Middleware (Subject: ASD)
- **Files Created**:
  - `backend/src/middleware/dutyValidationMiddleware.js`: Implemented validation and constraint checks enforcing:
    - Permanent 1:1 linked crew-bus assignment throughout shift.
    - Maximum shift duration constraint (<= 8.0 hours).
    - Asynchronous collision detection preventing bus double-booking during overlapping intervals.
    - Driver and conductor schedule overlap detection preventing double-booking.
    - Role and qualification verification (rejects non-drivers as driver, non-conductors as conductor, and inactive/leave crew).

### Commit 4: Automated Linked Duty Scheduling Algorithm Engine (Subject: ASD)
- **Files Created**:
  - `backend/src/services/dutySchedulerEngine.js`: Developed the core automated Linked Duty Scheduling algorithm:
    - Analyzes daily trips per bus and groups them into contiguous shifts.
    - Matches available, qualified driver-conductor pairs from the crew pool based on depot and conflict checks.
    - Enforces strict 1:1 permanent crew-to-bus binding across the shift window with vehicle handover verification.
    - Atomically creates `Duty` and `DutyAssignment` records with transaction rollback protection.

### Commit 5: Duty Management REST APIs & Automated Test Suite (Subject: ASD)
- **Files Created**:
  - `backend/src/controllers/dutyController.js`: Implemented `getDuties` (with pagination, search, status/depot/shiftType filters), `getDutyStats` (metrics for scheduled, active, and linked crew/bus counts), `getDutyById` (deep association eager loading), `generateLinkedDutiesHandler` (automated algorithm endpoint), `createDuty` (manual linked duty scheduling), `updateDuty`, and `deleteDuty` (with active shift deletion protection).
  - `backend/src/routes/dutyRoutes.js`: Defined REST routing hierarchy for `/api/duties` with authentication guards and validation middlewares.
  - `backend/tests/duty.test.js`: Comprehensive 12-test automated suite verifying pagination, stats, shift duration limits (<= 8.0 hrs), role integrity, duplicate time conflict rejection, full linked duty creation, status lifecycle, automated scheduling generation, and deletion safety checks.
- **Files Modified**:
  - `backend/src/routes/index.js`: Mounted `/api/duties` route into main Express API router.
  - `backend/src/services/dutySchedulerEngine.js`: Refined automated scheduling engine database operations for resilient concurrency.
  - Test validation: 71/71 tests passing across all 6 test suites.

### Commit 6: Frontend Duty API Service & Admin Navigation Routing (Subject: ISD)
- **Files Created**:
  - `frontend/src/services/dutyService.js`: Implemented client API service interfacing with backend Duty Management REST endpoints:
    - `getDuties`: Supports pagination and multi-parameter filtering (search, shiftType, shiftDate, depot, status, busId).
    - `getDutyStats`: Fetches real-time duty status counts and linked fleet bindings.
    - `getDutyById`: Fetches duty shift details with associated bus, driver, and conductor assignments.
    - `generateLinkedDuties`: Calls automated linked duty generation engine.
    - `createDuty`, `updateDuty`, `deleteDuty`: Full CRUD operations.
- **Files Modified**:
  - `frontend/src/App.jsx`: Registered administrative `/admin/duties` routing.
  - `frontend/src/layouts/AdminLayout.jsx`: Configured sidebar navigation link with dedicated `CalendarCheck` icon and active navigation indicators.

### Commit 7: Interactive Linked Duty Scheduling Dashboard & Assignment Matrix UI (Subject: ISD)
- **Files Created**:
  - `frontend/src/pages/DutySchedulingPage.jsx`: Developed comprehensive administrative interface for Linked Duty Scheduling:
    - Live KPI metric cards for total duties, active shifts, assigned buses, and bound crew pairs.
    - "Auto-Generate Shifts" modal integrating the automated scheduling engine with real-time feedback and warning summaries.
    - Comprehensive filter toolbar: Search box, date picker, shift type dropdown, depot selector, status filter, and live refresh.
    - Duty Assignment Matrix Table: Displays permanent 1:1 linked relationships (`Duty Number ⇄ Shift Time ⇄ Bus ⇄ Driver & Conductor ⇄ Status`).
    - Manual Duty Scheduling Modal: Interactive form with live duration calculation and instant DTC &le; 8.0 hr maximum shift constraint enforcement.
    - Duty Inspector Modal: Detailed view of permanent vehicle allocation, crew certifications, and one-click shift status update controls (`Mark Active`, `Complete Shift`, `Cancel Duty`).
    - Safe Deletion Modal: Deletion safeguard blocking the accidental removal of active on-road duties.
- **Files Modified**:
  - `frontend/src/App.jsx`: Mounted `DutySchedulingPage` onto `/admin/duties` route.
  - `frontend/src/pages/DashboardPage.jsx`: Integrated live linked duty metrics and quick-access navigation link.
  - `README.md`: Documented Chunk 6 endpoints, dual-database architecture, and updated automated test verification counts (71/71 tests).

---

## Architectural Migration: Unified PostgreSQL & Prisma ORM

### Database Schema Consolidation & Relations (Subject: DE)
- **Files Modified**:
  - `backend/prisma/schema.prisma`: Unified the entire DTC relational schema into PostgreSQL via Prisma:
    - Added operational models: `Bus`, `Crew`, `Trip`, `Duty`, `DutyAssignment`, and `Driver`.
    - Preserved existing portal models: `Admin`, `User`, `Route`, and `BusStop`.
    - Defined explicit relations, foreign keys, unique constraints, and composite indexes (`shift_date`, `depot`, `status`, `bus_id`, `driver_id`, `conductor_id`).
    - Configured `@map` decorators to align camelCase JavaScript properties with clean PostgreSQL snake_case column names.
  - `backend/src/scripts/migrate.js`: Updated migration routine to verify and sync PostgreSQL via Prisma.
  - `backend/src/scripts/seed.js`: Rewritten using Prisma Client to seed complete operational DTC dataset (12 crew members, 6 buses, routes, trips, and linked duty schedules) directly into PostgreSQL.
  - `backend/package.json`: Removed legacy `sequelize` and `sqlite3` dependencies, solidifying a 100% Prisma ORM backend.
- **Files Deleted**:
  - Removed obsolete Sequelize model definitions: `backend/src/models/Bus.js`, `backend/src/models/Crew.js`, `backend/src/models/Driver.js`, `backend/src/models/Duty.js`, `backend/src/models/DutyAssignment.js`, `backend/src/models/Route.js`, and `backend/src/models/Trip.js`.

### Controller, Middleware & Automated Engine Refactoring (Subject: ASD)
- **Files Modified**:
  - `backend/src/models/index.js`: Refactored to re-export Prisma Client and model delegates (`Bus`, `Crew`, `Trip`, `Duty`, `DutyAssignment`, `Route`, `BusStop`, `Driver`, `Admin`, `User`).
  - `backend/src/config/database.js`: Unified database connection interface to use Prisma.
  - `backend/src/server.js`: Updated server startup to initialize and verify single PostgreSQL connection.
  - `backend/src/controllers/busController.js`: Migrated all CRUD operations, search filters, and fleet stats to `prisma.bus`.
  - `backend/src/controllers/crewController.js`: Migrated crew roster, availability stats, and role filtering to `prisma.crew`.
  - `backend/src/controllers/tripController.js`: Migrated trip scheduling, bus conflict queries, and availability checks to `prisma.trip`.
  - `backend/src/controllers/dutyController.js`: Migrated linked duty management, metrics, and automated scheduling handler to `prisma.duty` and `prisma.dutyAssignment`.
  - `backend/src/controllers/auxController.js`: Migrated legacy route and driver lookup endpoints to Prisma.
  - `backend/src/controllers/dashboardController.js`: Updated administrative dashboard metrics to query Prisma models.
  - `backend/src/middleware/tripValidationMiddleware.js`: Migrated `findBusTripConflict` to Prisma.
  - `backend/src/middleware/dutyValidationMiddleware.js`: Migrated bus and crew duty conflict detection to Prisma.
  - `backend/src/services/dutySchedulerEngine.js`: Rewrote automated shift generator to perform Prisma atomic transactions with sequence number collision avoidance.

### Test Suite Verification & Documentation (Subject: ISD & ASD)
- **Files Modified**:
  - `backend/tests/bus.test.js`, `backend/tests/crew.test.js`, `backend/tests/trips.test.js`, `backend/tests/duty.test.js`: Updated test fixtures and setup routines to initialize against PostgreSQL with Prisma.
  - Test validation: **71/71 tests passing** across all 6 test suites with 0 failures.
  - `backend/.env.example`: Removed obsolete `DB_STORAGE` variable and streamlined configuration for PostgreSQL.
  - `README.md`: Updated architecture documentation, tech stack overview, and setup steps reflecting the unified PostgreSQL and Prisma ORM foundation.











