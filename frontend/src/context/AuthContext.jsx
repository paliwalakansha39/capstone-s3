import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const SESSION_KEY = "dtc-demo-admin";

function readAdmin() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Could not read the local demo session:", error);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(readAdmin);

  useEffect(() => {
    if (admin) localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    else localStorage.removeItem(SESSION_KEY);
  }, [admin]);

  function login(email) {
    setAdmin({
      id: "local-admin",
      name: "Administrator",
      email: email.trim().toLowerCase(),
      role: "admin",
      createdAt: new Date().toISOString()
    });
  }

  function logout() {
    setAdmin(null);
  }

  const value = useMemo(() => ({ admin, login, logout }), [admin]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
