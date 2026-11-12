import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAdminSession, getCurrentAdmin, loginAdmin, saveAdminSession } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getAdminSession);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session) {
      setAdmin(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    getCurrentAdmin()
      .then((currentAdmin) => {
        if (active) setAdmin(currentAdmin);
      })
      .catch((error) => {
        if (active) {
          saveAdminSession(null);
          setSession(null);
          setAdmin(null);
          if (error.response?.status !== 401) console.error("Could not restore administrator session:", error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [session?.token]);

  const login = useCallback(async (email, password) => {
    const authenticatedSession = await loginAdmin(email, password);
    saveAdminSession(authenticatedSession);
    setSession(authenticatedSession);
    setAdmin(authenticatedSession.admin);
    return authenticatedSession.admin;
  }, []);

  const logout = useCallback(() => {
    saveAdminSession(null);
    setSession(null);
    setAdmin(null);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({ admin, login, logout, loading }), [admin, login, logout, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
