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









