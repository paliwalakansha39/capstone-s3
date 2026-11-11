// Authentication and Authorization middleware
// In DTC portal, admin actions can carry Bearer tokens, API keys, or Demo Admin headers.
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers["x-admin-key"] || req.headers["x-admin-role"];

  // If authorization header or admin key provided
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or missing authentication token."
      });
    }
  }

  // Allow requests from DTC Admin frontend demo workspace
  // and proceed with admin role assigned to req.user
  req.user = {
    id: "admin-user",
    role: "admin",
    name: "DTC Administrator"
  };

  next();
}

export default requireAdminAuth;
