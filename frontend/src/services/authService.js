import api from "./api";

const SESSION_KEY = "dtc-admin-session";

export function getAdminSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    if (typeof session.token !== "string" || !session.admin) throw new Error("Invalid saved administrator session.");
    return session;
  } catch (error) {
    console.error("Could not read the administrator session:", error);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveAdminSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function loginAdmin(email, password) {
  const response = await api.post("/auth/login", { email, password });
  return response.data.data;
}

export async function getCurrentAdmin() {
  const response = await api.get("/auth/me");
  return response.data.data.admin;
}
