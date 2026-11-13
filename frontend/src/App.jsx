import { lazy, Suspense } from "react";
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
import TripManagementPage from "./pages/TripManagementPage";
import DutySchedulingPage from "./pages/DutySchedulingPage";
const RouteManagementPage = lazy(() => import("./pages/RouteManagementPage"));
const RouteOverlapPage = lazy(() => import("./pages/RouteOverlapPage"));

export default function App() {
  const { admin, login, logout, loading } = useAuth();
  const workspace = useWorkspace();

  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage admin={admin} login={login} loading={loading} />} />
    <Route path="/admin" element={<ProtectedRoute admin={admin} loading={loading}><AdminLayout admin={admin} logout={logout} context={{ admin, ...workspace }} /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="buses" element={<BusManagementPage />} />
      <Route path="crew" element={<CrewManagementPage />} />
      <Route path="trips" element={<TripManagementPage />} />
      <Route path="routes" element={<Suspense fallback={<main className="loading-box"><span className="spinner" />Loading route management...</main>}><RouteManagementPage /></Suspense>} />
      {/* Chunk 8: Route Overlap Detection */}
      <Route path="route-overlap" element={<Suspense fallback={<main className="loading-box"><span className="spinner" />Loading overlap detection...</main>}><RouteOverlapPage /></Suspense>} />
      {/* Chunk 6: Linked Duty Scheduling */}
      <Route path="duties" element={<DutySchedulingPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function ProtectedRoute({ admin, loading, children }) {
  if (loading) return <main className="auth-loading" role="status">Verifying administrator session…</main>;
  return admin ? children : <Navigate to="/login" replace />;
}
