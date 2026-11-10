const SESSION_KEY = "dtc-demo-admin";

export function readAdminSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Could not read the local demo session:", error);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveAdminSession(admin) {
  if (admin) localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
  else localStorage.removeItem(SESSION_KEY);
}

export function createDemoAdmin(email) {
  return {
    id: "local-admin",
    name: "Administrator",
    email: email.trim().toLowerCase(),
    role: "admin",
    createdAt: new Date().toISOString()
  };
}
