CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "badge_number" VARCHAR(50) NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(30),
    "status" VARCHAR(30) NOT NULL DEFAULT 'Available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "bus_number" VARCHAR(50) NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "bus_type" VARCHAR(50) NOT NULL DEFAULT 'Electric',
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "depot" VARCHAR(100) DEFAULT 'BBM Depot',
    "model_year" INTEGER,
    "manufacturer" VARCHAR(100) DEFAULT 'Tata Motors',
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "route_id" TEXT,
    "driver_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "crew_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'Driver',
    "badge_number" VARCHAR(50) NOT NULL,
    "license_number" VARCHAR(50),
    "qualification" VARCHAR(150) DEFAULT 'Standard Passenger Transport Certified',
    "experience_years" INTEGER NOT NULL DEFAULT 1,
    "assigned_depot" VARCHAR(100) NOT NULL DEFAULT 'BBM Depot',
    "status" VARCHAR(30) NOT NULL DEFAULT 'Available',
    "phone" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "trip_date" VARCHAR(15) NOT NULL,
    "departure_time" VARCHAR(10) NOT NULL,
    "arrival_time" VARCHAR(10) NOT NULL,
    "starting_stop" VARCHAR(120) NOT NULL,
    "destination_stop" VARCHAR(120) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    "is_overnight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duties" (
    "id" TEXT NOT NULL,
    "duty_number" VARCHAR(50) NOT NULL,
    "shift_type" VARCHAR(30) NOT NULL DEFAULT 'Morning',
    "shift_date" VARCHAR(15) NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "depot" VARCHAR(100) NOT NULL DEFAULT 'BBM Depot',
    "total_duration_hours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    "scheduling_type" VARCHAR(30) NOT NULL DEFAULT 'Linked',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "duty_assignments" (
    "id" TEXT NOT NULL,
    "duty_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "conductor_id" TEXT NOT NULL,
    "vehicle_handover_verified" BOOLEAN NOT NULL DEFAULT true,
    "total_trips_covered" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposed_routes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "total_distance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "estimated_travel_time" INTEGER,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposed_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposed_route_coordinates" (
    "id" TEXT NOT NULL,
    "proposed_route_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "name" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposed_route_coordinates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "route_overlap_analyses" (
    "id" TEXT NOT NULL,
    "proposed_route_id" TEXT,
    "proposed_route_name" VARCHAR(120) NOT NULL,
    "tolerance_meters" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "proposed_total_distance" DOUBLE PRECISION NOT NULL,
    "overlapping_distance" DOUBLE PRECISION NOT NULL,
    "overlap_percentage" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Completed',
    "summary" TEXT,
    "analyzed_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_overlap_analyses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "overlapping_route_segments" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "existing_route_id" TEXT,
    "existing_route_number" VARCHAR(30) NOT NULL,
    "existing_route_name" VARCHAR(120) NOT NULL,
    "overlap_distance" DOUBLE PRECISION NOT NULL,
    "overlap_percentage" DOUBLE PRECISION NOT NULL,
    "segment_coordinates" JSONB NOT NULL,
    "start_point" JSONB,
    "end_point" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overlapping_route_segments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drivers_badge_number_key" ON "drivers"("badge_number");
CREATE UNIQUE INDEX "buses_bus_number_key" ON "buses"("bus_number");
CREATE UNIQUE INDEX "buses_registration_number_key" ON "buses"("registration_number");
CREATE UNIQUE INDEX "crews_crew_id_key" ON "crews"("crew_id");
CREATE UNIQUE INDEX "crews_badge_number_key" ON "crews"("badge_number");
CREATE INDEX "crews_role_status_idx" ON "crews"("role", "status");
CREATE INDEX "crews_assigned_depot_idx" ON "crews"("assigned_depot");
CREATE INDEX "trips_bus_id_trip_date_idx" ON "trips"("bus_id", "trip_date");
CREATE INDEX "trips_trip_date_status_idx" ON "trips"("trip_date", "status");
CREATE UNIQUE INDEX "duties_duty_number_key" ON "duties"("duty_number");
CREATE INDEX "duties_shift_date_depot_idx" ON "duties"("shift_date", "depot");
CREATE INDEX "duties_status_idx" ON "duties"("status");
CREATE UNIQUE INDEX "duty_assignments_duty_id_key" ON "duty_assignments"("duty_id");
CREATE INDEX "duty_assignments_bus_id_idx" ON "duty_assignments"("bus_id");
CREATE INDEX "duty_assignments_driver_id_idx" ON "duty_assignments"("driver_id");
CREATE INDEX "duty_assignments_conductor_id_idx" ON "duty_assignments"("conductor_id");
CREATE INDEX "proposed_routes_status_idx" ON "proposed_routes"("status");
CREATE INDEX "proposed_routes_created_by_admin_id_idx" ON "proposed_routes"("created_by_admin_id");
CREATE INDEX "proposed_route_coordinates_proposed_route_id_sequence_numbe_idx" ON "proposed_route_coordinates"("proposed_route_id", "sequence_number");
CREATE UNIQUE INDEX "proposed_route_coordinates_proposed_route_id_sequence_numbe_key" ON "proposed_route_coordinates"("proposed_route_id", "sequence_number");
CREATE INDEX "route_overlap_analyses_proposed_route_id_idx" ON "route_overlap_analyses"("proposed_route_id");
CREATE INDEX "route_overlap_analyses_analyzed_by_admin_id_idx" ON "route_overlap_analyses"("analyzed_by_admin_id");
CREATE INDEX "route_overlap_analyses_created_at_idx" ON "route_overlap_analyses"("created_at");
CREATE INDEX "overlapping_route_segments_analysis_id_idx" ON "overlapping_route_segments"("analysis_id");
CREATE INDEX "overlapping_route_segments_existing_route_id_idx" ON "overlapping_route_segments"("existing_route_id");
CREATE INDEX "overlapping_route_segments_existing_route_number_idx" ON "overlapping_route_segments"("existing_route_number");

ALTER TABLE "buses"
ADD CONSTRAINT "buses_route_id_fkey"
FOREIGN KEY ("route_id") REFERENCES "routes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "buses"
ADD CONSTRAINT "buses_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trips"
ADD CONSTRAINT "trips_bus_id_fkey"
FOREIGN KEY ("bus_id") REFERENCES "buses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trips"
ADD CONSTRAINT "trips_route_id_fkey"
FOREIGN KEY ("route_id") REFERENCES "routes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "duty_assignments"
ADD CONSTRAINT "duty_assignments_duty_id_fkey"
FOREIGN KEY ("duty_id") REFERENCES "duties"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "duty_assignments"
ADD CONSTRAINT "duty_assignments_bus_id_fkey"
FOREIGN KEY ("bus_id") REFERENCES "buses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "duty_assignments"
ADD CONSTRAINT "duty_assignments_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "crews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "duty_assignments"
ADD CONSTRAINT "duty_assignments_conductor_id_fkey"
FOREIGN KEY ("conductor_id") REFERENCES "crews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposed_routes"
ADD CONSTRAINT "proposed_routes_created_by_admin_id_fkey"
FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposed_route_coordinates"
ADD CONSTRAINT "proposed_route_coordinates_proposed_route_id_fkey"
FOREIGN KEY ("proposed_route_id") REFERENCES "proposed_routes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "route_overlap_analyses"
ADD CONSTRAINT "route_overlap_analyses_proposed_route_id_fkey"
FOREIGN KEY ("proposed_route_id") REFERENCES "proposed_routes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "route_overlap_analyses"
ADD CONSTRAINT "route_overlap_analyses_analyzed_by_admin_id_fkey"
FOREIGN KEY ("analyzed_by_admin_id") REFERENCES "admins"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overlapping_route_segments"
ADD CONSTRAINT "overlapping_route_segments_analysis_id_fkey"
FOREIGN KEY ("analysis_id") REFERENCES "route_overlap_analyses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overlapping_route_segments"
ADD CONSTRAINT "overlapping_route_segments_existing_route_id_fkey"
FOREIGN KEY ("existing_route_id") REFERENCES "routes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
