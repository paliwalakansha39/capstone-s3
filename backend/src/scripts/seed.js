import { prisma } from "../config/prisma.js";
import { runMigrations } from "./migrate.js";

export async function seedDatabase() {
  await runMigrations();

  // 1. Seed Crew Members
  const existingCrew = await prisma.crew.count();
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
        qualification: "Commercial Conductor License + Cash Management",
        experienceYears: 7,
        assignedDepot: "BBM Depot",
        status: "On Duty",
        phone: "+91 98711 23490"
      },
      {
        crewId: "DTC-CRW-203",
        name: "Deepak Mehra",
        role: "Conductor",
        badgeNumber: "DTC-C-9043",
        licenseNumber: "COND-DL-2021-9043",
        qualification: "Commercial Conductor License",
        experienceYears: 3,
        assignedDepot: "Sarojini Nagar Depot",
        status: "Available",
        phone: "+91 99118 76543"
      },
      {
        crewId: "DTC-CRW-204",
        name: "Neeraj Tiwari",
        role: "Conductor",
        badgeNumber: "DTC-C-6512",
        licenseNumber: "COND-DL-2015-6512",
        qualification: "Senior Conductor + Passenger Safety Certified",
        experienceYears: 11,
        assignedDepot: "Rohini Depot-I",
        status: "Available",
        phone: "+91 98188 12345"
      },
      {
        crewId: "DTC-CRW-205",
        name: "Sanjay Kumar",
        role: "Conductor",
        badgeNumber: "DTC-C-4109",
        licenseNumber: "COND-DL-2013-4109",
        qualification: "Commercial Conductor License",
        experienceYears: 13,
        assignedDepot: "Sukhdev Vihar Depot",
        status: "On Rest",
        phone: "+91 98223 34455"
      },
      {
        crewId: "DTC-CRW-206",
        name: "Kavita Devi",
        role: "Conductor",
        badgeNumber: "DTC-C-9302",
        licenseNumber: "COND-DL-2022-9302",
        qualification: "Commercial Conductor License + E-Ticketing Certified",
        experienceYears: 2,
        assignedDepot: "Mayapuri Depot",
        status: "On Leave",
        phone: "+91 98765 43210"
      }
    ];

    for (const crew of sampleCrew) {
      await prisma.crew.create({ data: crew });
    }
    console.log(`Successfully seeded ${sampleCrew.length} crew members.`);
  }

  // 2. Seed Default Routes if none exist
  const existingRoutes = await prisma.route.count();
  if (existingRoutes === 0) {
    console.log("Seeding sample DTC routes...");
    const sampleRoutes = [
      {
        routeNumber: "104",
        routeName: "Kashmere Gate ISBT to BBM Depot",
        startingPoint: "Kashmere Gate ISBT",
        destination: "BBM Depot",
        totalDistance: 14.5,
        estimatedTravelTime: 45
      },
      {
        routeNumber: "108",
        routeName: "Nehru Place Terminal to Rohini Sector 22",
        startingPoint: "Nehru Place Terminal",
        destination: "Rohini Sector 22",
        totalDistance: 32.8,
        estimatedTravelTime: 95
      },
      {
        routeNumber: "212",
        routeName: "Anand Vihar ISBT to Uttam Nagar Terminal",
        startingPoint: "Anand Vihar ISBT",
        destination: "Uttam Nagar Terminal",
        totalDistance: 28.0,
        estimatedTravelTime: 80
      }
    ];

    for (const r of sampleRoutes) {
      await prisma.route.create({ data: r });
    }
  }

  // 3. Seed Buses
  const existingBuses = await prisma.bus.count();
  if (existingBuses === 0) {
    console.log("Seeding sample DTC buses...");
    const routes = await prisma.route.findMany();
    const route104 = routes.find((r) => r.routeNumber === "104") || routes[0];
    const route108 = routes.find((r) => r.routeNumber === "108") || routes[1] || routes[0];

    const sampleBuses = [
      {
        busNumber: "DTC-1041",
        registrationNumber: "DL-1PC-1041",
        busType: "Electric",
        capacity: 45,
        depot: "BBM Depot",
        modelYear: 2023,
        manufacturer: "Tata Motors",
        status: "Active",
        routeId: route104?.id
      },
      {
        busNumber: "DTC-1042",
        registrationNumber: "DL-1PC-1042",
        busType: "Electric",
        capacity: 45,
        depot: "BBM Depot",
        modelYear: 2023,
        manufacturer: "Tata Motors",
        status: "Active",
        routeId: route104?.id
      },
      {
        busNumber: "DTC-2105",
        registrationNumber: "DL-1PC-2105",
        busType: "Low Floor",
        capacity: 50,
        depot: "Sarojini Nagar Depot",
        modelYear: 2021,
        manufacturer: "Ashok Leyland",
        status: "Active",
        routeId: route108?.id
      },
      {
        busNumber: "DTC-3101",
        registrationNumber: "DL-1PC-3101",
        busType: "AC",
        capacity: 40,
        depot: "Rohini Depot-I",
        modelYear: 2022,
        manufacturer: "Tata Motors",
        status: "Active"
      },
      {
        busNumber: "DTC-4102",
        registrationNumber: "DL-1PC-4102",
        busType: "Standard",
        capacity: 55,
        depot: "Sukhdev Vihar Depot",
        modelYear: 2019,
        manufacturer: "Ashok Leyland",
        status: "Maintenance"
      },
      {
        busNumber: "DTC-5011",
        registrationNumber: "DL-1PC-5011",
        busType: "Non-AC",
        capacity: 60,
        depot: "Mayapuri Depot",
        modelYear: 2018,
        manufacturer: "Tata Motors",
        status: "Inactive"
      }
    ];

    for (const b of sampleBuses) {
      await prisma.bus.create({ data: b });
    }
    console.log(`Successfully seeded ${sampleBuses.length} buses.`);
  }

  // 4. Seed Trips
  const existingTrips = await prisma.trip.count();
  if (existingTrips === 0) {
    console.log("Seeding sample DTC trips...");
    const buses = await prisma.bus.findMany();
    const routes = await prisma.route.findMany();
    const bus1 = buses.find((b) => b.busNumber === "DTC-1041") || buses[0];
    const bus2 = buses.find((b) => b.busNumber === "DTC-1042") || buses[1] || buses[0];
    const route = routes[0];

    if (bus1 && route) {
      const today = new Date().toISOString().slice(0, 10);
      const sampleTrips = [
        {
          routeId: route.id,
          busId: bus1.id,
          tripDate: today,
          departureTime: "06:30",
          arrivalTime: "07:30",
          startingStop: route.startingPoint,
          destinationStop: route.destination,
          status: "Scheduled"
        },
        {
          routeId: route.id,
          busId: bus1.id,
          tripDate: today,
          departureTime: "08:00",
          arrivalTime: "09:00",
          startingStop: route.destination,
          destinationStop: route.startingPoint,
          status: "Scheduled"
        },
        {
          routeId: route.id,
          busId: bus2.id,
          tripDate: today,
          departureTime: "07:00",
          arrivalTime: "08:15",
          startingStop: route.startingPoint,
          destinationStop: route.destination,
          status: "Scheduled"
        }
      ];

      for (const t of sampleTrips) {
        await prisma.trip.create({ data: t });
      }
      console.log(`Successfully seeded ${sampleTrips.length} trips.`);
    }
  }

  // 5. Seed Linked Duties
  const existingDuties = await prisma.duty.count();
  if (existingDuties === 0) {
    console.log("Seeding sample DTC Linked Duties...");
    const buses = await prisma.bus.findMany();
    const drivers = await prisma.crew.findMany({ where: { role: "Driver" } });
    const conductors = await prisma.crew.findMany({ where: { role: "Conductor" } });

    const bus1 = buses.find((b) => b.busNumber === "DTC-1041");
    const driver1 = drivers.find((d) => d.badgeNumber === "DTC-D-4512") || drivers[0];
    const conductor1 = conductors.find((c) => c.badgeNumber === "DTC-C-8812") || conductors[0];

    if (bus1 && driver1 && conductor1) {
      const today = new Date().toISOString().slice(0, 10);
      const duty = await prisma.duty.create({
        data: {
          dutyNumber: `DTC-LNK-${today.replace(/-/g, "")}-BBM-001`,
          shiftType: "Morning",
          shiftDate: today,
          startTime: "06:00",
          endTime: "14:00",
          depot: "BBM Depot",
          totalDurationHours: 8.0,
          status: "Active",
          schedulingType: "Linked"
        }
      });

      await prisma.dutyAssignment.create({
        data: {
          dutyId: duty.id,
          busId: bus1.id,
          driverId: driver1.id,
          conductorId: conductor1.id,
          vehicleHandoverVerified: true,
          totalTripsCovered: 2,
          notes: `Linked Shift: ${driver1.name} (Driver) & ${conductor1.name} (Conductor) permanently bound to Bus ${bus1.busNumber}.`
        }
      });
      console.log("Successfully seeded Linked Duty schedules.");
    }
  }

  return true;
}

// Run directly if invoked via node
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase()
    .then(() => {
      console.log("Seeding complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
