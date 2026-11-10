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

function makeActivity(message) {
  return { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
}

export function readWorkspace() {
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

export function saveWorkspace(workspace) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

export function addWorkspaceUser(workspace, details) {
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
  return {
    users: [user, ...workspace.users],
    activity: [makeActivity(`Added user ${user.name}`), ...workspace.activity].slice(0, 6)
  };
}

export function updateWorkspaceUser(workspace, id, details) {
  const email = details.email.trim().toLowerCase();
  if (workspace.users.some((user) => user.id !== id && user.email.toLowerCase() === email)) {
    throw new Error("A user with this email already exists.");
  }
  const existing = workspace.users.find((user) => user.id === id);
  if (!existing) throw new Error("This user no longer exists.");
  const user = { ...existing, name: details.name.trim(), email, role: details.role.trim() };
  return {
    users: workspace.users.map((item) => item.id === id ? user : item),
    activity: [makeActivity(`Updated user ${user.name}`), ...workspace.activity].slice(0, 6)
  };
}

export function deleteWorkspaceUser(workspace, id) {
  const user = workspace.users.find((item) => item.id === id);
  if (!user) throw new Error("This user no longer exists.");
  return {
    users: workspace.users.filter((item) => item.id !== id),
    activity: [makeActivity(`Removed user ${user.name}`), ...workspace.activity].slice(0, 6)
  };
}
