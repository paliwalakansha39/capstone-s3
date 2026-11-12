# DTC Bus Management System

A comprehensive public transit operations and fleet management platform for Delhi Transport Corporation (DTC).

## Project Modules & Breakdown
- **Chunk 1 — Core Portal & User Management (Member 1)**: DTC landing page, JWT administrator authentication, protected dashboard, profile management, and PostgreSQL-backed user management.
- **Chunk 2 — Bus Management System (Member 2)**: Fullstack fleet management featuring Bus database models, database migrations, RESTful APIs, and responsive admin UI with complete CRUD operations, search, filters, modal inspector, and validation.
- **Chunk 3 — Crew Management System (Member 3)**: Fullstack crew roster and duty availability platform featuring Crew database models, qualifications storage, availability validation middleware, RESTful APIs, and responsive admin UI with live availability KPI cards, role filtering (Drivers vs. Conductors), and modal inspector.
- **Future Chunks**: Route Management & Duty Scheduling.

## Technology Stack
- **Frontend**: React 19, Vite, React Router DOM 7, Lucide React, Custom Responsive CSS (DTC Design System).
- **Backend**: Node.js, Express, JWT, bcrypt, Prisma ORM, Sequelize ORM, CORS, Dotenv.
- **Database**: PostgreSQL for administrators and users; SQLite for the existing bus and crew modules.

---

## Getting Started

### Requirements
- Node.js 20+
- npm
- PostgreSQL

### 1. Backend Setup
```sh
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run migrate
npm run seed
npm run seed:admin
npm run dev
```

Before starting, copy `.env.example` to `.env` only if you do not already have a `.env`; otherwise merge the example variables into your existing file without overwriting it. Set `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, `ADMIN_SETUP_KEY`, and the seed administrator's name, email, and strong password. Create the PostgreSQL database named in `DATABASE_URL` first. The Prisma migration creates the PostgreSQL `admins` and `users` tables; the existing migration and seed commands initialize the SQLite bus/crew database. The seed administrator password is hashed with bcrypt before storage.

Backend runs on `http://localhost:5001`. Keep `.env` private and never commit it.

### 2. Frontend Setup
```sh
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` (proxies `/api` requests to `http://localhost:5001`).

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
