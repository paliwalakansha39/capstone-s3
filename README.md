# DTC Bus Management System

A comprehensive public transit operations and fleet management platform for Delhi Transport Corporation (DTC).

## Project Modules & Breakdown
- **Chunk 1 — Core Portal & User Management (Member 1)**: DTC landing page, JWT administrator authentication, protected dashboard, profile management, and PostgreSQL-backed user management.
- **Chunk 2 — Bus Management System (Member 2)**: Fullstack fleet management featuring Bus database models, database migrations, RESTful APIs, and responsive admin UI with complete CRUD operations, search, filters, modal inspector, and validation.
- **Chunk 3 — Crew Management System (Member 3)**: Fullstack crew roster and duty availability platform featuring Crew database models, qualifications storage, availability validation middleware, RESTful APIs, and responsive admin UI with live availability KPI cards, role filtering (Drivers vs. Conductors), and modal inspector.
- **Chunk 5 — Trip Management (Member 5)**: Fullstack bus trip scheduling and operations platform featuring Trip database models, Route and Bus associations, PostgreSQL migrations and indexes, time and bus conflict validation middleware, RESTful CRUD APIs with bus availability checking, and responsive admin UI with trip schedule table, statistics cards, route/date/status filters, trip creation and editing forms, and automated integration tests.
- **Chunk 6 — Linked Duty Scheduling (Member 3)**: Automated and manual linked duty scheduling adhering to permanent 1:1 crew-bus binding (&le; 8.0 hr shifts, dedicated driver-conductor pairs without vehicle handover), collision-free scheduling engine, duty assignment matrix, and full lifecycle management.
- **Chunk 7 — Unlinked Duty Scheduling & Rest Management**: Admin-protected crew availability and rest APIs, configurable rest enforcement, conflict-checked bus handovers, assignment/rest history, and a responsive schedule, handover, rest, and availability-calendar dashboard.
- **Route & Stop Management**: PostgreSQL-backed routes and ordered bus stops with interactive OpenStreetMap display.

## Technology Stack
- **Frontend**: React 19, Vite, React Router DOM 7, Lucide React, Leaflet, Custom Responsive CSS (DTC Design System).
- **Backend**: Node.js, Express, JWT, bcrypt, Prisma ORM, CORS, Dotenv.
- **Database**: Single, unified PostgreSQL database powered by Prisma ORM for all entities (Buses, Crews, Trips, Duties, Routes, Stops, Admins, Users).

---

## Getting Started

### System Prerequisites
- **Node.js**: v20+ (`node -v`)
- **npm**: v10+ (`npm -v`)
- **PostgreSQL**: v14+ running locally (`psql -U $(whoami) -d postgres`)

---

### 1. Backend Installation & Setup

Open a terminal and navigate to the project directory:

```sh
cd backend

# Step 1: Install all backend dependencies (Express, Prisma, JWT, Bcrypt, PG)
npm install

# Step 2: Configure environment variables
# Copy .env.example to .env (adjust DATABASE_URL with your local PostgreSQL user if needed)
cp .env.example .env

# Step 3: Create the PostgreSQL database (if not already created)
createdb dtc_bus_management

# Step 4: Generate Prisma Client & push schema to PostgreSQL
npm run db:generate
npx prisma db push

# Step 5: Seed initial operational data (Buses, Crews, Routes, Trips, Duties, Admins)
npm run seed
npm run seed:admin

# Step 6: Start the backend server (runs on http://localhost:5001)
npm start
```

> **Note:** The backend operates on a **single, unified PostgreSQL database** using **Prisma ORM**, eliminating dual-database complexity and guaranteeing referential integrity across all operational entities.

---

### 2. Frontend Installation & Setup

In a separate terminal window:

```sh
cd frontend

# Step 1: Install all frontend dependencies (React 19, Leaflet, Lucide icons, Axios)
npm install

# Step 2: Start the frontend Vite development server (runs on http://localhost:5173)
npm run dev
```

The frontend runs at **`http://localhost:5173`** and automatically proxies `/api` requests to `http://localhost:5001`.

---

### 3. Run Automated Tests

To run the complete automated test suite (71+ tests across 6 test suites):

```sh
cd backend
npm test
```

Sign in using the administrator credentials set in `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Administrator registration is not open: `POST /api/auth/register` requires the `x-admin-setup-key` header matching `ADMIN_SETUP_KEY`.

### Chunk 1 API
- `POST /api/auth/login` — Authenticate an administrator and return a JWT.
- `GET /api/auth/me` — Return the current authenticated administrator.
- `POST /api/auth/register` — Create an administrator only with the setup key.
- `GET /api/users` and `GET /api/users/:id` — List or retrieve users (admin only).
- `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` — Manage users (admin only).
- `GET /api/dashboard/stats` — Return user, admin, bus, and route counts (admin only).

Send `Authorization: Bearer <token>` for protected API requests. The browser clears its stored session on logout; JWTs expire according to `JWT_EXPIRES_IN`.

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

## Trip Management API Endpoints
- `GET /api/trips` — List all trips (supports search, status/route/bus/date filters, pagination)
- `GET /api/trips/stats` — Real-time trip statistics (total, scheduled, completed, cancelled)
- `GET /api/trips/bus-availability` — Check if a bus is available for a specified date and time window
- `GET /api/trips/available-buses` — List all active buses available for a given departure/arrival slot
- `GET /api/trips/:id` — Retrieve trip details including populated Route and Bus models
- `POST /api/trips` — Schedule a new trip with validation and bus conflict prevention (Admin only)
- `PUT /api/trips/:id` — Update trip details, schedule, or status with conflict checking (Admin only)
- `DELETE /api/trips/:id` — Safely remove scheduled trip (Admin only)

## Linked Duty Scheduling API Endpoints (Chunk 6)
- `GET /api/duties` — List duties (supports search, shiftType, shiftDate, depot, status filters, and pagination)
- `GET /api/duties/stats` — Aggregate metrics (total, scheduled, active, completed, cancelled, bound buses, linked drivers)
- `GET /api/duties/:id` — Retrieve full duty details with populated bus, driver, and conductor assignments
- `POST /api/duties/generate-linked` — Automated Linked Duty Scheduling Engine (groups scheduled trips into &le; 8.0 hr shifts and binds dedicated 1:1 crew pairs without mid-shift vehicle handover)
- `POST /api/duties` — Create manual linked duty schedule (with &le; 8.0 hr duration, qualification, and double-booking collision guards)
- `PUT /api/duties/:id` — Update duty shift status, times, or notes
- `DELETE /api/duties/:id` — Safely remove duty schedule (deletion of active on-road duties is blocked)

## Unlinked Duty Scheduling & Rest Management (Chunk 7)

The protected dashboard is available at `/admin/unlinked-duties`. The module records each driver/conductor assignment independently, prevents overlapping assignments, requires previous trips to be completed before handover, and records the configured post-duty rest period. All new APIs require an administrator JWT (`Authorization: Bearer <token>`).

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/crew/available?at=<ISO-date-time>&role=Driver` | List crew available/resting at a requested time; `includeAll=true` includes all statuses |
| `GET` | `/api/crew/:id/availability?at=<ISO-date-time>` | Inspect one crew member's calculated status, active/last assignment, and rest time |
| `GET` | `/api/crew/:id/rest-periods` | Read a crew member's rest history |
| `GET` | `/api/crew/availability-calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Read duty and rest timelines with overlap flags |
| `GET` | `/api/schedules/unlinked` | List unlinked duties (supports date, status, and bus filters) |
| `POST` | `/api/schedules/unlinked` | Create an unlinked duty after bus, role, overlap, completion, and rest checks |
| `GET` | `/api/schedules/unlinked/rest-config` | Read the configured minimum rest duration |
| `POST` | `/api/handovers` | Complete a previous duty, assign replacement driver/conductor, and record both handover events atomically |
| `GET` | `/api/handovers` | Read paginated handover history |

Set `UNLINKED_DUTY_REST_MINUTES` in `backend/.env` to a whole number from 1 to 1440 (default `480`). The migration backfills assignment history and completed-duty rest history from existing schedules using the default eight-hour rest period.

Apply the additive migration without dropping data, then regenerate Prisma Client:

```sh
cd backend
npm run db:generate
npm run db:migrate
npm test
```

The migration adds `crew_assignments`, `duty_handovers`, and `rest_periods` with foreign keys/indexes and backfills existing duty assignments. It does not delete existing operational records.

## Route and Bus Stop Management

The admin Route Management page is available at `/admin/routes`. It plots only bus stop coordinates entered by administrators; no sample or synthetic bus-stop coordinates are seeded. The route line follows stops in `sequenceNumber` order. Map tiles are provided by OpenStreetMap and require an internet connection.

All route and stop endpoints require `Authorization: Bearer <token>` from `/api/auth/login`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/routes` | Create route; optional `stops` array to add stops atomically |
| `GET` | `/api/routes` | List routes, each with ordered stops; optional `?search=` |
| `GET` | `/api/routes/:id` | Get route details and stops |
| `PUT` | `/api/routes/:id` | Update route fields and/or replace its stop list |
| `DELETE` | `/api/routes/:id` | Delete route and cascade-delete its stops |
| `POST` | `/api/routes/:id/stops` | Add one bus stop to a route |
| `PUT` | `/api/stops/:id` | Update a bus stop |
| `DELETE` | `/api/stops/:id` | Delete a bus stop |

Route fields are `routeNumber`, `routeName`, `startingPoint`, `destination`, `totalDistance` (km), and `estimatedTravelTime` (minutes). Stop fields are `stopName`, `latitude`, `longitude`, and positive integer `sequenceNumber`; coordinates are range-checked and sequence numbers must be unique within a route. Bus assignment workflows leverage these routes via `GET /api/legacy-routes` backed by the unified PostgreSQL database.

### Run and test

From the project root, run `npm run dev:backend` and `npm run dev:frontend` in separate terminals. To verify the module, run `npm run db:generate --prefix backend`, `npm run db:migrate --prefix backend`, `npm test --prefix backend`, and `npm run build --prefix frontend`. PostgreSQL must be reachable and configured in `backend/.env` for migrations and route data operations.
