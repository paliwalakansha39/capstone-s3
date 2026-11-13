import { sequelize, Bus, Route, Driver, Crew, Trip, Duty, DutyAssignment } from "../models/index.js";
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
  if (existingBuses === 0) {
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
  } else {
    console.log(`Database already has ${existingBuses} buses. Skipping bus seeding.`);
  }

  // Seed sample DTC trips
  const existingTrips = await Trip.count();
  if (existingTrips === 0) {
    console.log("Seeding sample DTC trip schedules...");
    const route419 = await Route.findOne({ where: { routeNumber: "419" } });
    const route502 = await Route.findOne({ where: { routeNumber: "502" } });
    const routeAirport = await Route.findOne({ where: { routeNumber: "Airport Exp-4" } });
    const route761 = await Route.findOne({ where: { routeNumber: "761" } });

    const bus1041 = await Bus.findOne({ where: { busNumber: "DTC-1041" } });
    const bus1042 = await Bus.findOne({ where: { busNumber: "DTC-1042" } });
    const bus2105 = await Bus.findOne({ where: { busNumber: "DTC-2105" } });
    const bus5120 = await Bus.findOne({ where: { busNumber: "DTC-5120" } });

    if (route419 && bus1041) {
      const today = new Date().toISOString().slice(0, 10);
      const sampleTrips = [
        {
          routeId: route419.id,
          busId: bus1041.id,
          tripDate: today,
          departureTime: "07:30",
          arrivalTime: "09:00",
          startingStop: route419.startPoint,
          destinationStop: route419.endPoint,
          status: "Scheduled"
        },
        {
          routeId: route419.id,
          busId: bus1041.id,
          tripDate: today,
          departureTime: "10:30",
          arrivalTime: "12:00",
          startingStop: route419.endPoint,
          destinationStop: route419.startPoint,
          status: "Scheduled"
        },
        ...(route502 && bus1042
          ? [
              {
                routeId: route502.id,
                busId: bus1042.id,
                tripDate: today,
                departureTime: "08:15",
                arrivalTime: "09:45",
                startingStop: route502.startPoint,
                destinationStop: route502.endPoint,
                status: "In Progress"
              }
            ]
          : []),
        ...(routeAirport && bus2105
          ? [
              {
                routeId: routeAirport.id,
                busId: bus2105.id,
                tripDate: today,
                departureTime: "06:00",
                arrivalTime: "07:30",
                startingStop: routeAirport.startPoint,
                destinationStop: routeAirport.endPoint,
                status: "Completed"
              }
            ]
          : []),
        ...(route761 && bus5120
          ? [
              {
                routeId: route761.id,
                busId: bus5120.id,
                tripDate: today,
                departureTime: "11:00",
                arrivalTime: "12:15",
                startingStop: route761.startPoint,
                destinationStop: route761.endPoint,
                status: "Cancelled"
              }
            ]
          : [])
      ];

      await Trip.bulkCreate(sampleTrips);
      console.log(`Successfully seeded ${sampleTrips.length} sample trips.`);
    }
  }

  // Seed Linked Duty Schedules (Chunk 6)
  const existingDuties = await Duty.count();
  if (existingDuties === 0) {
    console.log("Seeding sample DTC Linked Duty schedules...");

    const bus1041 = await Bus.findOne({ where: { busNumber: "DTC-1041" } });
    const bus1042 = await Bus.findOne({ where: { busNumber: "DTC-1042" } });
    const bus2105 = await Bus.findOne({ where: { busNumber: "DTC-2105" } });

    const driverRajesh = await Crew.findOne({ where: { crewId: "DTC-CRW-101" } });
    const driverSunil = await Crew.findOne({ where: { crewId: "DTC-CRW-102" } });
    const driverManoj = await Crew.findOne({ where: { crewId: "DTC-CRW-103" } });

    const conductorPriya = await Crew.findOne({ where: { crewId: "DTC-CRW-201" } });
    const conductorHarish = await Crew.findOne({ where: { crewId: "DTC-CRW-202" } });
    const conductorSuresh = await Crew.findOne({ where: { crewId: "DTC-CRW-205" } });

    const today = new Date().toISOString().split("T")[0];

    // Duty 1: Linked Morning Shift at BBM Depot (Bus DTC-1041 + Rajesh Kumar + Priya Sharma)
    if (bus1041 && driverRajesh && conductorPriya) {
      const duty1 = await Duty.create({
        dutyNumber: "DTC-LNK-20261113-001",
        shiftType: "Morning",
        shiftDate: today,
        startTime: "06:00",
        endTime: "14:00",
        depot: "BBM Depot",
        totalDurationHours: 8.0,
        status: "Active",
        schedulingType: "Linked"
      });

      await DutyAssignment.create({
        dutyId: duty1.id,
        busId: bus1041.id,
        driverId: driverRajesh.id,
        conductorId: conductorPriya.id,
        vehicleHandoverVerified: true,
        totalTripsCovered: 2,
        notes: "Linked Morning Shift: Crew remains permanently assigned to bus DTC-1041 for all trips."
      });
    }

    // Duty 2: Linked Evening Shift at BBM Depot (Bus DTC-1042 + Sunil Verma + Suresh Gupta)
    if (bus1042 && driverSunil && conductorSuresh) {
      const duty2 = await Duty.create({
        dutyNumber: "DTC-LNK-20261113-002",
        shiftType: "Evening",
        shiftDate: today,
        startTime: "14:00",
        endTime: "22:00",
        depot: "BBM Depot",
        totalDurationHours: 8.0,
        status: "Scheduled",
        schedulingType: "Linked"
      });

      await DutyAssignment.create({
        dutyId: duty2.id,
        busId: bus1042.id,
        driverId: driverSunil.id,
        conductorId: conductorSuresh.id,
        vehicleHandoverVerified: true,
        totalTripsCovered: 2,
        notes: "Linked Evening Shift: Crew remains bound to bus DTC-1042 on Route 502."
      });
    }

    // Duty 3: Linked Morning Shift at Sarojini Nagar Depot (Bus DTC-2105 + Manoj Singh + Harish Rawat)
    if (bus2105 && driverManoj && conductorHarish) {
      const duty3 = await Duty.create({
        dutyNumber: "DTC-LNK-20261113-003",
        shiftType: "Morning",
        shiftDate: today,
        startTime: "06:00",
        endTime: "13:30",
        depot: "Sarojini Nagar Depot",
        totalDurationHours: 7.5,
        status: "Completed",
        schedulingType: "Linked"
      });

      await DutyAssignment.create({
        dutyId: duty3.id,
        busId: bus2105.id,
        driverId: driverManoj.id,
        conductorId: conductorHarish.id,
        vehicleHandoverVerified: true,
        totalTripsCovered: 2,
        notes: "Linked Airport Express Shift: Dedicated crew-bus assignment for IGI Airport T3 rotation."
      });
    }

    console.log("Successfully seeded sample Linked Duty schedules.");
  }
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
