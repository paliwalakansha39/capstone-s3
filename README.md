# DTC Bus Management System

A comprehensive public transit operations and fleet management platform for Delhi Transport Corporation (DTC).

## Project Modules & Breakdown
- **Chunk 1 — Core Portal & User Management (Member 1)**: DTC landing page, JWT administrator authentication, protected dashboard, profile management, and PostgreSQL-backed user management.
- **Chunk 2 — Bus Management System (Member 2)**: Fullstack fleet management featuring Bus database models, database migrations, RESTful APIs, and responsive admin UI with complete CRUD operations, search, filters, modal inspector, and validation.
- **Chunk 3 — Crew Management System (Member 3)**: Fullstack crew roster and duty availability platform featuring Crew database models, qualifications storage, availability validation middleware, RESTful APIs, and responsive admin UI with live availability KPI cards, role filtering (Drivers vs. Conductors), and modal inspector.
- **Chunk 5 — Trip Management (Member 5)**: Fullstack bus trip scheduling and operations platform featuring Trip database models, Route and Bus Sequelize associations, SQLite migrations and indexes, time and bus conflict validation middleware, RESTful CRUD APIs with bus availability checking, and responsive admin UI with trip schedule table, statistics cards, route/date/status filters, trip creation and editing forms, and automated integration tests.
- **Route Management**: PostgreSQL-backed routes and ordered bus stops with interactive OpenStreetMap display.
- **Future Chunks**: Duty Scheduling.

## Technology Stack
- **Frontend**: React 19, Vite, React Router DOM 7, Lucide React, Custom Responsive CSS (DTC Design System).
- **Backend**: Node.js, Express, JWT, bcrypt, Prisma ORM, Sequelize ORM, CORS, Dotenv.
- **Database**: PostgreSQL for administrators and users; SQLite for the existing bus and crew modules.

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

# Step 1: Install all backend dependencies (Express, Sequelize, Prisma, JWT, Bcrypt, PG)
npm install

# Step 2: Configure environment variables
# Copy .env.example to .env (adjust DATABASE_URL with your local PostgreSQL user if needed)
cp .env.example .env

# Step 3: Create the PostgreSQL database (if not already created)
createdb dtc_bus_management

# Step 4: Generate Prisma Client & apply PostgreSQL migrations
npm run db:generate
npm run db:migrate

# Step 5: Initialize SQLite database (Buses, Crews, Trips) and seed data
npm run migrate
npm run seed
npm run seed:admin

# Step 6: Start the backend server (runs on http://localhost:5001)
npm run dev
```

> **Note:** The backend operates with dual database capabilities:
> - **PostgreSQL (via Prisma)**: Stores system administrators, users, routes, and geographic bus stops.
> - **SQLite (via Sequelize)**: Stores bus fleet assets, crew rosters, trips, and duty schedules for zero-latency operations.

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

Route fields are `routeNumber`, `routeName`, `startingPoint`, `destination`, `totalDistance` (km), and `estimatedTravelTime` (minutes). Stop fields are `stopName`, `latitude`, `longitude`, and positive integer `sequenceNumber`; coordinates are range-checked and sequence numbers must be unique within a route. The existing bus assignment UI continues using its original SQLite route records through `GET /api/legacy-routes`.

### Run and test

From the project root, run `npm run dev:backend` and `npm run dev:frontend` in separate terminals. To verify the module, run `npm run db:generate --prefix backend`, `npm run db:migrate --prefix backend`, `npm test --prefix backend`, and `npm run build --prefix frontend`. PostgreSQL must be reachable and configured in `backend/.env` for migrations and route data operations.
