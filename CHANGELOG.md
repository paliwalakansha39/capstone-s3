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
