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




