const VALID_BUS_TYPES = ["AC", "Non-AC", "Electric", "Low Floor", "Standard"];
const VALID_STATUSES = ["Active", "Inactive", "Maintenance"];

export function validateCreateBus(req, res, next) {
  const { busNumber, registrationNumber, busType, capacity, status, modelYear } = req.body;

  const errors = [];

  if (!busNumber || typeof busNumber !== "string" || !busNumber.trim()) {
    errors.push("Bus number is required.");
  }

  if (!registrationNumber || typeof registrationNumber !== "string" || !registrationNumber.trim()) {
    errors.push("Registration number is required.");
  }

  if (busType && !VALID_BUS_TYPES.includes(busType)) {
    errors.push(`Invalid bus type. Must be one of: ${VALID_BUS_TYPES.join(", ")}`);
  }

  if (capacity !== undefined && capacity !== null && capacity !== "") {
    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum < 10 || capNum > 120) {
      errors.push("Capacity must be an integer between 10 and 120 seats.");
    }
  }

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (modelYear !== undefined && modelYear !== null && modelYear !== "") {
    const yearNum = Number(modelYear);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > maxYear) {
      errors.push(`Model year must be between 1990 and ${maxYear}.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0],
      errors
    });
  }

  next();
}

export function validateUpdateBus(req, res, next) {
  const { busNumber, registrationNumber, busType, capacity, status, modelYear } = req.body;

  const errors = [];

  if (busNumber !== undefined && (typeof busNumber !== "string" || !busNumber.trim())) {
    errors.push("Bus number cannot be empty.");
  }

  if (registrationNumber !== undefined && (typeof registrationNumber !== "string" || !registrationNumber.trim())) {
    errors.push("Registration number cannot be empty.");
  }

  if (busType && !VALID_BUS_TYPES.includes(busType)) {
    errors.push(`Invalid bus type. Must be one of: ${VALID_BUS_TYPES.join(", ")}`);
  }

  if (capacity !== undefined && capacity !== null && capacity !== "") {
    const capNum = Number(capacity);
    if (!Number.isInteger(capNum) || capNum < 10 || capNum > 120) {
      errors.push("Capacity must be an integer between 10 and 120 seats.");
    }
  }

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (modelYear !== undefined && modelYear !== null && modelYear !== "") {
    const yearNum = Number(modelYear);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > maxYear) {
      errors.push(`Model year must be between 1990 and ${maxYear}.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0],
      errors
    });
  }

  next();
}
