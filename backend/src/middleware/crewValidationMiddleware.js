const VALID_ROLES = ["Driver", "Conductor"];
const VALID_STATUSES = ["Available", "On Duty", "On Rest", "On Leave"];

function isValidIndianPhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(cleaned);
}

export function validateCreateCrew(req, res, next) {
  const {
    crewId,
    name,
    role,
    badgeNumber,
    licenseNumber,
    experienceYears,
    assignedDepot,
    status,
    phone
  } = req.body;

  const errors = [];

  if (!crewId || typeof crewId !== "string" || !crewId.trim()) {
    errors.push("Crew ID is required.");
  }

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Full name is required and must be at least 2 characters.");
  }

  if (!role || !VALID_ROLES.includes(role)) {
    errors.push(`Role is required and must be one of: ${VALID_ROLES.join(", ")}`);
  }

  if (!badgeNumber || typeof badgeNumber !== "string" || !badgeNumber.trim()) {
    errors.push("Badge number is required.");
  }

  // Drivers must have a valid commercial driving license
  if (role === "Driver" && (!licenseNumber || typeof licenseNumber !== "string" || !licenseNumber.trim())) {
    errors.push("Commercial driving license number is required for drivers.");
  }

  if (experienceYears !== undefined && experienceYears !== null && experienceYears !== "") {
    const exp = Number(experienceYears);
    if (!Number.isInteger(exp) || exp < 0 || exp > 50) {
      errors.push("Experience years must be an integer between 0 and 50.");
    }
  }

  if (!assignedDepot || typeof assignedDepot !== "string" || !assignedDepot.trim()) {
    errors.push("Assigned depot is required.");
  }

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (phone && typeof phone === "string" && phone.trim()) {
    if (!isValidIndianPhone(phone)) {
      errors.push("Phone number must be a valid 10-digit Indian mobile number.");
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

export function validateUpdateCrew(req, res, next) {
  const {
    crewId,
    name,
    role,
    badgeNumber,
    licenseNumber,
    experienceYears,
    assignedDepot,
    status,
    phone
  } = req.body;

  const errors = [];

  if (crewId !== undefined && (typeof crewId !== "string" || !crewId.trim())) {
    errors.push("Crew ID cannot be empty.");
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
    errors.push("Name must be at least 2 characters.");
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  if (badgeNumber !== undefined && (typeof badgeNumber !== "string" || !badgeNumber.trim())) {
    errors.push("Badge number cannot be empty.");
  }

  if (role === "Driver" && licenseNumber !== undefined && (!licenseNumber || !licenseNumber.trim())) {
    errors.push("Commercial driving license cannot be empty for drivers.");
  }

  if (experienceYears !== undefined && experienceYears !== null && experienceYears !== "") {
    const exp = Number(experienceYears);
    if (!Number.isInteger(exp) || exp < 0 || exp > 50) {
      errors.push("Experience years must be an integer between 0 and 50.");
    }
  }

  if (assignedDepot !== undefined && (typeof assignedDepot !== "string" || !assignedDepot.trim())) {
    errors.push("Assigned depot cannot be empty.");
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (phone !== undefined && phone !== null && phone.trim() !== "") {
    if (!isValidIndianPhone(phone)) {
      errors.push("Phone number must be a valid 10-digit Indian mobile number.");
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
