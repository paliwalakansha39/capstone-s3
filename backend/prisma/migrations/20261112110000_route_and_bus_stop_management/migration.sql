CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "routeNumber" VARCHAR(30) NOT NULL,
    "routeName" VARCHAR(120) NOT NULL,
    "startingPoint" VARCHAR(120) NOT NULL,
    "destination" VARCHAR(120) NOT NULL,
    "totalDistance" DOUBLE PRECISION NOT NULL,
    "estimatedTravelTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bus_stops" (
    "id" TEXT NOT NULL,
    "stopName" VARCHAR(120) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_stops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "routes_routeNumber_key" ON "routes"("routeNumber");
CREATE UNIQUE INDEX "bus_stops_routeId_sequenceNumber_key" ON "bus_stops"("routeId", "sequenceNumber");
CREATE INDEX "bus_stops_routeId_sequenceNumber_idx" ON "bus_stops"("routeId", "sequenceNumber");

ALTER TABLE "bus_stops"
ADD CONSTRAINT "bus_stops_routeId_fkey"
FOREIGN KEY ("routeId") REFERENCES "routes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
