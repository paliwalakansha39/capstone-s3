import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const WorkspaceContext = createContext(null);
const WORKSPACE_KEY = "dtc-demo-workspace";

function initialWorkspace() {
  const now = Date.now();
  return {
    users: [
      { id: "user-1", name: "Aarav Sharma", email: "aarav.sharma@example.com", role: "operator", createdAt: new Date(now - 86400000 * 2).toISOString() },
      { id: "user-2", name: "Meera Singh", email: "meera.singh@example.com", role: "planner", createdAt: new Date(now - 86400000 * 5).toISOString() },
      { id: "user-3", name: "Kabir Verma", email: "kabir.verma@example.com", role: "viewer", createdAt: new Date(now - 86400000 * 8).toISOString() }
    ],
    activity: []
  };
}

function readWorkspace() {
  try {
    const stored = localStorage.getItem(WORKSPACE_KEY);
    if (!stored) return initialWorkspace();
    const workspace = JSON.parse(stored);
    if (!Array.isArray(workspace.users) || !Array.isArray(workspace.activity)) {
      throw new Error("Saved demo workspace has an invalid format");
    }
    return workspace;
  } catch (error) {
    console.error("Could not read the local demo workspace:", error);
    localStorage.removeItem(WORKSPACE_KEY);
    return initialWorkspace();
  }
}

function makeActivity(message) {
  return { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
}

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(readWorkspace);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const addUser = useCallback((details) => {
    const email = details.email.trim().toLowerCase();
    if (workspace.users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error("A user with this email already exists.");
    }
    const user = {
      id: crypto.randomUUID(),
      name: details.name.trim(),
      email,
      role: details.role.trim(),
      createdAt: new Date().toISOString()
    };
    setWorkspace((current) => ({
      users: [user, ...current.users],
      activity: [makeActivity(`Added user ${user.name}`), ...current.activity].slice(0, 6)
    }));
  }, [workspace.users]);

  const updateUser = useCallback((id, details) => {
    const email = details.email.trim().toLowerCase();
    if (workspace.users.some((user) => user.id !== id && user.email.toLowerCase() === email)) {
      throw new Error("A user with this email already exists.");
    }
    const existing = workspace.users.find((user) => user.id === id);
    if (!existing) throw new Error("This user no longer exists.");
    const user = { ...existing, name: details.name.trim(), email, role: details.role.trim() };
    setWorkspace((current) => ({
      users: current.users.map((item) => item.id === id ? user : item),
      activity: [makeActivity(`Updated user ${user.name}`), ...current.activity].slice(0, 6)
    }));
  }, [workspace.users]);

  const deleteUser = useCallback((id) => {
    const user = workspace.users.find((item) => item.id === id);
    if (!user) throw new Error("This user no longer exists.");
    setWorkspace((current) => ({
      users: current.users.filter((item) => item.id !== id),
      activity: [makeActivity(`Removed user ${user.name}`), ...current.activity].slice(0, 6)
    }));
  }, [workspace.users]);

  const value = useMemo(() => ({
    users: workspace.users,
    activity: workspace.activity,
    addUser,
    updateUser,
    deleteUser
  }), [workspace, addUser, updateUser, deleteUser]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
