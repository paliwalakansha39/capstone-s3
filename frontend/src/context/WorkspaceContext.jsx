import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addWorkspaceUser,
  deleteWorkspaceUser,
  readWorkspace,
  saveWorkspace,
  updateWorkspaceUser
} from "../services/workspaceService";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(readWorkspace);

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  const addUser = useCallback((details) => {
    setWorkspace(addWorkspaceUser(workspace, details));
  }, [workspace]);

  const updateUser = useCallback((id, details) => {
    setWorkspace(updateWorkspaceUser(workspace, id, details));
  }, [workspace]);

  const deleteUser = useCallback((id) => {
    setWorkspace(deleteWorkspaceUser(workspace, id));
  }, [workspace]);

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
