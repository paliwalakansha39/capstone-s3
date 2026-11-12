import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { addWorkspaceUser, deleteWorkspaceUser, readWorkspace, updateWorkspaceUser } from "../services/workspaceService";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { admin } = useAuth();
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!admin) {
      setUsers([]);
      setActivity([]);
      setError("");
      return () => { active = false; };
    }
    setLoading(true);
    readWorkspace()
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [admin?.id]);

  const addUser = useCallback(async (details) => {
    await addWorkspaceUser(details);
    setUsers(await readWorkspace());
    setActivity((items) => [{ id: crypto.randomUUID(), message: `Added user ${details.name}`, createdAt: new Date().toISOString() }, ...items].slice(0, 6));
  }, []);

  const updateUser = useCallback(async (id, details) => {
    await updateWorkspaceUser(id, details);
    setUsers(await readWorkspace());
    setActivity((items) => [{ id: crypto.randomUUID(), message: `Updated user ${details.name}`, createdAt: new Date().toISOString() }, ...items].slice(0, 6));
  }, []);

  const deleteUser = useCallback(async (id) => {
    const user = users.find((item) => item.id === id);
    await deleteWorkspaceUser(id);
    setUsers(await readWorkspace());
    setActivity((items) => [{ id: crypto.randomUUID(), message: `Removed user ${user?.name || "account"}`, createdAt: new Date().toISOString() }, ...items].slice(0, 6));
  }, [users]);

  const value = useMemo(() => ({
    users,
    activity,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser
  }), [users, activity, loading, error, addUser, updateUser, deleteUser]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
