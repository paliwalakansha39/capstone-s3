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


