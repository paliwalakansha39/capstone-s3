import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useWorkspace } from "./context/WorkspaceContext";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import BusManagementPage from "./pages/BusManagementPage";
import CrewManagementPage from "./pages/CrewManagementPage";

export default function App() {
  const { admin, login, logout } = useAuth();
  const workspace = useWorkspace();

  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage admin={admin} login={login} />} />
    <Route path="/admin" element={<ProtectedRoute admin={admin}><AdminLayout admin={admin} logout={logout} context={{ admin, ...workspace }} /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="buses" element={<BusManagementPage />} />
      <Route path="crew" element={<CrewManagementPage />} />
      <Route path="routes" element={<PlaceholderPage title="Route Management" />} />
      <Route path="duties" element={<PlaceholderPage title="Duty Scheduling" />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function ProtectedRoute({ admin, children }) {
  return admin ? children : <Navigate to="/login" replace />;
}
