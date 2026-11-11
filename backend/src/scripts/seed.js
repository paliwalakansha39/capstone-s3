import { sequelize, Bus, Route, Driver, Crew } from "../models/index.js";
import { runMigrations } from "./migrate.js";

export async function seedDatabase() {
  await runMigrations();

  // Seed Crew Members
  const existingCrew = await Crew.count();
  if (existingCrew === 0) {
    console.log("Seeding sample DTC crew members (Drivers & Conductors)...");
    const sampleCrew = [
      {
        crewId: "DTC-CRW-101",
        name: "Rajesh Kumar",
        role: "Driver",
        badgeNumber: "DTC-D-4512",
        licenseNumber: "DL0420100098451",
        qualification: "HTV Heavy Vehicle + PSV Badge",
        experienceYears: 12,
        assignedDepot: "BBM Depot",
        status: "On Duty",
        phone: "+91 98112 34567"
      },
      {
        crewId: "DTC-CRW-102",
        name: "Sunil Verma",
        role: "Driver",
        badgeNumber: "DTC-D-5104",
        licenseNumber: "DL0420120014782",
        qualification: "HTV Heavy Vehicle + EV Certified",
        experienceYears: 9,
        assignedDepot: "BBM Depot",
        status: "On Duty",
        phone: "+91 98734 56123"
      },
      {
        crewId: "DTC-CRW-103",
        name: "Manoj Singh",
        role: "Driver",
        badgeNumber: "DTC-D-3891",
        licenseNumber: "DL0420080034129",
        qualification: "HTV Commercial + First Aid",
        experienceYears: 15,
        assignedDepot: "Sarojini Nagar Depot",
        status: "Available",
        phone: "+91 99102 98456"
      },
      {
        crewId: "DTC-CRW-104",
        name: "Amit Yadav",
        role: "Driver",
        badgeNumber: "DTC-D-6219",
        licenseNumber: "DL0420160087123",
        qualification: "HTV Heavy Vehicle",
        experienceYears: 6,
        assignedDepot: "Rohini Depot-I",
        status: "On Rest",
        phone: "+91 98101 23456"
      },
      {
        crewId: "DTC-CRW-105",
        name: "Vikram Solanki",
        role: "Driver",
        badgeNumber: "DTC-D-4902",
        licenseNumber: "DL0420140023891",
        qualification: "HTV Commercial + Defensive Driving",
        experienceYears: 8,
        assignedDepot: "Sukhdev Vihar Depot",
        status: "Available",
        phone: "+91 98213 45678"
      },
      {
        crewId: "DTC-CRW-106",
        name: "Ramesh Chand",
        role: "Driver",
        badgeNumber: "DTC-D-2101",
        licenseNumber: "DL0420050011223",
        qualification: "Senior HTV Master Driver",
        experienceYears: 19,
        assignedDepot: "Mayapuri Depot",
        status: "On Leave",
        phone: "+91 99991 23456"
      },
      {
        crewId: "DTC-CRW-201",
        name: "Priya Sharma",
        role: "Conductor",
        badgeNumber: "DTC-C-8812",
        licenseNumber: "COND-DL-2019-8812",
        qualification: "Commercial Conductor License + E-Ticketing",
        experienceYears: 5,
        assignedDepot: "BBM Depot",
        status: "On Duty",
        phone: "+91 98119 87654"
      },
      {
        crewId: "DTC-CRW-202",
        name: "Harish Rawat",
        role: "Conductor",
        badgeNumber: "DTC-C-7201",
        licenseNumber: "COND-DL-2017-7201",
        qualification: "Conductor License + First Aid Certified",
        experienceYears: 8,
        assignedDepot: "Sarojini Nagar Depot",
        status: "Available",
        phone: "+91 98711 23901"
      },
      {
        crewId: "DTC-CRW-203",
        name: "Meena Kumari",
        role: "Conductor",
        badgeNumber: "DTC-C-9410",
        licenseNumber: "COND-DL-2021-9410",
        qualification: "E-Ticketing & Public Safety Certified",
        experienceYears: 4,
        assignedDepot: "Rohini Depot-I",
        status: "Available",
        phone: "+91 99100 87654"
      },
      {
        crewId: "DTC-CRW-204",
        name: "Devendra Negi",
        role: "Conductor",
        badgeNumber: "DTC-C-6311",
        licenseNumber: "COND-DL-2012-6311",
        qualification: "Senior Conductor + Cash Handling Certified",
        experienceYears: 14,
        assignedDepot: "Sukhdev Vihar Depot",
        status: "On Rest",
        phone: "+91 98990 12345"
      },
      {
        crewId: "DTC-CRW-205",
        name: "Suresh Gupta",
        role: "Conductor",
        badgeNumber: "DTC-C-5542",
        licenseNumber: "COND-DL-2015-5542",
        qualification: "Commercial Conductor License",
        experienceYears: 11,
        assignedDepot: "BBM Depot",
        status: "On Duty",
        phone: "+91 98188 76543"
      },
      {
        crewId: "DTC-CRW-206",
        name: "Kavita Joshi",
        role: "Conductor",
        badgeNumber: "DTC-C-8120",
        licenseNumber: "COND-DL-2022-8120",
        qualification: "Commercial Conductor License + First Aid",
        experienceYears: 3,
        assignedDepot: "Mayapuri Depot",
        status: "On Leave",
        phone: "+91 97171 23456"
      }
    ];

    await Crew.bulkCreate(sampleCrew);
    console.log(`Successfully seeded ${sampleCrew.length} crew members.`);
  }

  const existingBuses = await Bus.count();
  if (existingBuses > 0) {
    console.log(`Database already has ${existingBuses} buses. Skipping bus seeding.`);
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
