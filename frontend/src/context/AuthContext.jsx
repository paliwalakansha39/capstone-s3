import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createDemoAdmin, readAdminSession, saveAdminSession } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(readAdminSession);

  useEffect(() => {
    saveAdminSession(admin);
  }, [admin]);

  function login(email) {
    setAdmin(createDemoAdmin(email));
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
