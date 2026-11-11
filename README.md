# DTC Bus Management System

A comprehensive public transit operations and fleet management platform for Delhi Transport Corporation (DTC).

## Project Modules & Breakdown
- **Chunk 1 — Core Portal & User Management (Member 1)**: DTC landing page, demo authentication, administrator dashboard, profile management, and workspace users.
- **Chunk 2 — Bus Management System (Member 2)**: Fullstack fleet management featuring Bus database models, database migrations, RESTful APIs, and responsive admin UI with complete CRUD operations, search, filters, modal inspector, and validation.
- **Chunk 3 — Crew Management System (Member 3)**: Fullstack crew roster and duty availability platform featuring Crew database models, qualifications storage, availability validation middleware, RESTful APIs, and responsive admin UI with live availability KPI cards, role filtering (Drivers vs. Conductors), and modal inspector.
- **Future Chunks**: Route Management & Duty Scheduling.

## Technology Stack
- **Frontend**: React 19, Vite, React Router DOM 7, Lucide React, Custom Responsive CSS (DTC Design System).
- **Backend**: Node.js, Express, Sequelize ORM, SQLite3, CORS, Dotenv.
- **Database**: SQLite (portable, zero-configuration local database with referential integrity).

---

## Getting Started

### Requirements
- Node.js 20+
- npm

### 1. Backend Setup
```sh
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```
Backend runs on `http://localhost:5001`.

### 2. Frontend Setup
```sh
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` (proxies `/api` requests to `http://localhost:5001`).

---

## Bus Management API Endpoints
- `GET /api/buses` — List all buses (supports search, status/type filters, pagination)
- `GET /api/buses/:id` — Retrieve bus details by ID
- `POST /api/buses` — Create a new bus record (with unique constraints and validation)
- `PUT /api/buses/:id` — Update existing bus record
- `DELETE /api/buses/:id` — Delete bus record safely

## Crew Management API Endpoints
- `GET /api/crew` — List crew members (supports search, role/status/depot filters, pagination)
- `GET /api/crew/availability` — Real-time availability analytics (available drivers/conductors, duty/rest counts)
- `GET /api/crew/:id` — Retrieve single crew member profile and qualifications
- `POST /api/crew` — Register a new driver or conductor (with license & badge validation)
- `PUT /api/crew/:id` — Update crew details or duty status
- `DELETE /api/crew/:id` — Safely remove crew member (blocks deletion of active on-duty personnel)

