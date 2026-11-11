import { sequelize, Bus, Route, Driver } from "../models/index.js";
import { runMigrations } from "./migrate.js";

export async function seedDatabase() {
  await runMigrations();

  const existingBuses = await Bus.count();
  if (existingBuses > 0) {
    console.log(`Database already has ${existingBuses} buses. Skipping seeding.`);
    return;
  }

  console.log("Seeding sample DTC routes, drivers, and buses...");

  // Seed sample DTC routes
  const route1 = await Route.create({
    routeNumber: "419",
    routeName: "Ambedkar Nagar to Old Delhi Railway Station",
    startPoint: "Ambedkar Nagar Terminal",
    endPoint: "Old Delhi Railway Station",
    totalDistanceKm: 24.5
  });

  const route2 = await Route.create({
    routeNumber: "502",
    routeName: "Mehrauli to Mori Gate Terminal",
    startPoint: "Mehrauli Terminal",
    endPoint: "Mori Gate Terminal",
    totalDistanceKm: 27.2
  });

  const route3 = await Route.create({
    routeNumber: "761",
    routeName: "Uttam Nagar to Manglapuri",
    startPoint: "Uttam Nagar Terminal",
    endPoint: "Manglapuri",
    totalDistanceKm: 18.0
  });

  const route4 = await Route.create({
    routeNumber: "Airport Exp-4",
    routeName: "ISBT Kashmere Gate to IGI Airport T3",
    startPoint: "ISBT Kashmere Gate",
    endPoint: "IGI Airport Terminal 3",
    totalDistanceKm: 31.8
  });

  // Seed sample DTC drivers
  const driver1 = await Driver.create({
    name: "Rajesh Kumar",
    badgeNumber: "DTC-D-4512",
    licenseNumber: "DL0420100098451",
    phone: "+91 98112 34567",
    status: "On Duty"
  });

  const driver2 = await Driver.create({
    name: "Sunil Verma",
    badgeNumber: "DTC-D-5104",
    licenseNumber: "DL0420120014782",
    phone: "+91 98734 56123",
    status: "On Duty"
  });

  const driver3 = await Driver.create({
    name: "Manoj Singh",
    badgeNumber: "DTC-D-3891",
    licenseNumber: "DL0420080034129",
    phone: "+91 99102 98456",
    status: "Available"
  });

  // Seed initial fleet of DTC buses
  const sampleBuses = [
    {
      busNumber: "DTC-1041",
      registrationNumber: "DL 01 EA 2041",
      busType: "Electric",
      capacity: 42,
      depot: "BBM Depot",
      modelYear: 2023,
      manufacturer: "Tata Motors",
      status: "Active",
      routeId: route1.id,
      driverId: driver1.id
    },
    {
      busNumber: "DTC-1042",
      registrationNumber: "DL 01 EA 2042",
      busType: "Electric",
      capacity: 42,
      depot: "BBM Depot",
      modelYear: 2023,
      manufacturer: "Tata Motors",
      status: "Active",
      routeId: route2.id,
      driverId: driver2.id
    },
    {
      busNumber: "DTC-2105",
      registrationNumber: "DL 01 PC 7812",
      busType: "AC",
      capacity: 38,
      depot: "Sarojini Nagar Depot",
      modelYear: 2022,
      manufacturer: "Ashok Leyland",
      status: "Active",
      routeId: route4.id,
      driverId: driver3.id
    },
    {
      busNumber: "DTC-3401",
      registrationNumber: "DL 01 PC 9014",
      busType: "Low Floor",
      capacity: 45,
      depot: "Rohini Depot-I",
      modelYear: 2021,
      manufacturer: "Tata Motors",
      status: "Maintenance",
      routeId: route3.id,
      driverId: null
    },
    {
      busNumber: "DTC-4089",
      registrationNumber: "DL 01 PC 5532",
      busType: "Non-AC",
      capacity: 50,
      depot: "Mayapuri Depot",
      modelYear: 2019,
      manufacturer: "Ashok Leyland",
      status: "Inactive",
      routeId: null,
      driverId: null
    },
    {
      busNumber: "DTC-5120",
      registrationNumber: "DL 01 EA 3120",
      busType: "Electric",
      capacity: 42,
      depot: "Kushak Nallah Depot",
      modelYear: 2024,
      manufacturer: "JBM Auto",
      status: "Active",
      routeId: route1.id,
      driverId: null
    }
  ];

  await Bus.bulkCreate(sampleBuses);
  console.log(`Successfully seeded ${sampleBuses.length} buses.`);
}

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase()
    .then(() => {
      console.log("Seeding complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
