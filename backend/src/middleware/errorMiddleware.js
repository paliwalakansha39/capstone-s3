export function errorHandler(err, req, res, next) {
  console.error("Backend Error:", err);

  if (err.code === "P2002") {
    return res.status(409).json({ success: false, error: "A record with that email already exists." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, error: "The requested record was not found." });
  }
  // Sequelize Unique Constraint Error (e.g. duplicate busNumber or registrationNumber)
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "field";
    const value = err.errors?.[0]?.value || "";
    return res.status(409).json({
      success: false,
      error: `Duplicate entry: A bus with ${field} '${value}' already exists.`,
      field
    });
  }

  // Sequelize Validation Error
  if (err.name === "SequelizeValidationError") {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: messages[0] || "Validation failed.",
      errors: messages
    });
  }

  // Sequelize Foreign Key Error
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      error: "Referenced route or driver does not exist."
    });
  }

  // Custom or status-defined errors
  const status = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected internal server error occurred.";

  return res.status(status).json({
    success: false,
    error: message
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}
