CREATE TABLE "crew_assignments" (
    "id" TEXT NOT NULL,
    "crew_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "duty_id" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "assignment_start_time" TIMESTAMPTZ(3) NOT NULL,
    "assignment_end_time" TIMESTAMPTZ(3) NOT NULL,
    "assignment_status" VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crew_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crew_assignments_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crew_assignments_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crew_assignments_duty_id_fkey" FOREIGN KEY ("duty_id") REFERENCES "duties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crew_assignments_role_check" CHECK ("role" IN ('Driver', 'Conductor')),
    CONSTRAINT "crew_assignments_status_check" CHECK ("assignment_status" IN ('Scheduled', 'Active', 'Completed', 'Cancelled'))
);

CREATE TABLE "duty_handovers" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "previous_crew_member_id" TEXT NOT NULL,
    "new_crew_member_id" TEXT NOT NULL,
    "previous_duty_id" TEXT NOT NULL,
    "new_duty_id" TEXT NOT NULL,
    "handover_timestamp" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duty_handovers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "duty_handovers_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duty_handovers_previous_crew_member_id_fkey" FOREIGN KEY ("previous_crew_member_id") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duty_handovers_new_crew_member_id_fkey" FOREIGN KEY ("new_crew_member_id") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duty_handovers_previous_duty_id_fkey" FOREIGN KEY ("previous_duty_id") REFERENCES "duties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duty_handovers_new_duty_id_fkey" FOREIGN KEY ("new_duty_id") REFERENCES "duties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duty_handovers_distinct_crew_check" CHECK ("previous_crew_member_id" <> "new_crew_member_id")
);

CREATE TABLE "rest_periods" (
    "id" TEXT NOT NULL,
    "crew_id" TEXT NOT NULL,
    "previous_duty_id" TEXT NOT NULL,
    "rest_start_time" TIMESTAMPTZ(3) NOT NULL,
    "required_rest_duration_minutes" INTEGER NOT NULL,
    "rest_end_time" TIMESTAMPTZ(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Resting',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rest_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rest_periods_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rest_periods_previous_duty_id_fkey" FOREIGN KEY ("previous_duty_id") REFERENCES "duties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rest_periods_duration_check" CHECK ("required_rest_duration_minutes" > 0),
    CONSTRAINT "rest_periods_status_check" CHECK ("status" IN ('Resting', 'Completed'))
);

CREATE UNIQUE INDEX "crew_assignments_duty_id_crew_id_key" ON "crew_assignments"("duty_id", "crew_id");
CREATE UNIQUE INDEX "crew_assignments_duty_id_role_key" ON "crew_assignments"("duty_id", "role");
CREATE INDEX "crew_assignments_crew_id_assignment_start_time_assignment_end_time_idx" ON "crew_assignments"("crew_id", "assignment_start_time", "assignment_end_time");
CREATE INDEX "crew_assignments_bus_id_assignment_start_time_assignment_end_time_idx" ON "crew_assignments"("bus_id", "assignment_start_time", "assignment_end_time");
CREATE INDEX "crew_assignments_assignment_status_assignment_start_time_idx" ON "crew_assignments"("assignment_status", "assignment_start_time");
CREATE INDEX "duty_handovers_bus_id_handover_timestamp_idx" ON "duty_handovers"("bus_id", "handover_timestamp");
CREATE INDEX "duty_handovers_previous_crew_member_id_handover_timestamp_idx" ON "duty_handovers"("previous_crew_member_id", "handover_timestamp");
CREATE INDEX "duty_handovers_new_crew_member_id_handover_timestamp_idx" ON "duty_handovers"("new_crew_member_id", "handover_timestamp");
CREATE INDEX "duty_handovers_previous_duty_id_idx" ON "duty_handovers"("previous_duty_id");
CREATE INDEX "duty_handovers_new_duty_id_idx" ON "duty_handovers"("new_duty_id");
CREATE UNIQUE INDEX "rest_periods_crew_id_previous_duty_id_key" ON "rest_periods"("crew_id", "previous_duty_id");
CREATE INDEX "rest_periods_crew_id_rest_start_time_rest_end_time_idx" ON "rest_periods"("crew_id", "rest_start_time", "rest_end_time");
CREATE INDEX "rest_periods_status_rest_end_time_idx" ON "rest_periods"("status", "rest_end_time");

INSERT INTO "crew_assignments" (
    "id", "crew_id", "bus_id", "duty_id", "role",
    "assignment_start_time", "assignment_end_time", "assignment_status", "completed_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    assignments."driver_id",
    assignments."bus_id",
    assignments."duty_id",
    'Driver',
    (duties."shift_date" || ' ' || duties."start_time")::timestamp AT TIME ZONE 'Asia/Kolkata',
    (
        (duties."shift_date" || ' ' || duties."end_time")::timestamp
        + CASE WHEN duties."end_time" <= duties."start_time" THEN interval '1 day' ELSE interval '0 day' END
    ) AT TIME ZONE 'Asia/Kolkata',
    CASE duties."status"
      WHEN 'Completed' THEN 'Completed'
      WHEN 'Active' THEN 'Active'
      WHEN 'Cancelled' THEN 'Cancelled'
      ELSE 'Scheduled'
    END,
    CASE WHEN duties."status" = 'Completed' THEN (
        (
            (duties."shift_date" || ' ' || duties."end_time")::timestamp
            + CASE WHEN duties."end_time" <= duties."start_time" THEN interval '1 day' ELSE interval '0 day' END
        ) AT TIME ZONE 'Asia/Kolkata'
    ) ELSE NULL END,
    CURRENT_TIMESTAMP
FROM "duty_assignments" assignments
JOIN "duties" duties ON duties."id" = assignments."duty_id"
WHERE assignments."driver_id" IS NOT NULL
ON CONFLICT ("duty_id", "crew_id") DO NOTHING;

INSERT INTO "crew_assignments" (
    "id", "crew_id", "bus_id", "duty_id", "role",
    "assignment_start_time", "assignment_end_time", "assignment_status", "completed_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    assignments."conductor_id",
    assignments."bus_id",
    assignments."duty_id",
    'Conductor',
    (duties."shift_date" || ' ' || duties."start_time")::timestamp AT TIME ZONE 'Asia/Kolkata',
    (
        (duties."shift_date" || ' ' || duties."end_time")::timestamp
        + CASE WHEN duties."end_time" <= duties."start_time" THEN interval '1 day' ELSE interval '0 day' END
    ) AT TIME ZONE 'Asia/Kolkata',
    CASE duties."status"
      WHEN 'Completed' THEN 'Completed'
      WHEN 'Active' THEN 'Active'
      WHEN 'Cancelled' THEN 'Cancelled'
      ELSE 'Scheduled'
    END,
    CASE WHEN duties."status" = 'Completed' THEN (
        (
            (duties."shift_date" || ' ' || duties."end_time")::timestamp
            + CASE WHEN duties."end_time" <= duties."start_time" THEN interval '1 day' ELSE interval '0 day' END
        ) AT TIME ZONE 'Asia/Kolkata'
    ) ELSE NULL END,
    CURRENT_TIMESTAMP
FROM "duty_assignments" assignments
JOIN "duties" duties ON duties."id" = assignments."duty_id"
WHERE assignments."conductor_id" IS NOT NULL
ON CONFLICT ("duty_id", "crew_id") DO NOTHING;

INSERT INTO "rest_periods" (
    "id", "crew_id", "previous_duty_id", "rest_start_time",
    "required_rest_duration_minutes", "rest_end_time", "status"
)
SELECT
    gen_random_uuid()::text,
    assignments."crew_id",
    assignments."duty_id",
    assignments."completed_at",
    480,
    assignments."completed_at" + interval '480 minutes',
    CASE WHEN assignments."completed_at" + interval '480 minutes' > CURRENT_TIMESTAMP THEN 'Resting' ELSE 'Completed' END
FROM "crew_assignments" assignments
WHERE assignments."assignment_status" = 'Completed'
  AND assignments."completed_at" IS NOT NULL
ON CONFLICT ("crew_id", "previous_duty_id") DO NOTHING;
