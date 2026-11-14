import {
  BusFront,
  CalendarCheck,
  CalendarDays,
  ArrowRightLeft,
  ChevronRight,
  CircleUserRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/profile", label: "Admin Profile", icon: CircleUserRound },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/buses", label: "Bus Management", icon: BusFront },
  { to: "/admin/crew", label: "Crew Management", icon: UserCheck },
  { to: "/admin/routes", label: "Route Management", icon: Map },
  { to: "/admin/route-overlap", label: "Route Overlap", icon: Layers },
  { to: "/admin/trips", label: "Trip Management", icon: CalendarDays },
  { to: "/admin/duties", label: "Duty Scheduling", icon: CalendarCheck },
  { to: "/admin/unlinked-duties", label: "Unlinked Duty & Rest", icon: ArrowRightLeft }
];

export default function AdminLayout({ admin, logout, context }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Admin navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label.includes("Management") || label.includes("Scheduling")
                ? <ChevronRight className="nav-chevron" size={15} />
                : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className="status-dot" /> Secure admin session</div>
          <button className="nav-link logout-link" onClick={handleLogout}>
            <LogOut size={18} /><span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <div className="topbar-context">
            <span className="topbar-kicker">DTC ADMINISTRATION</span>
            <span className="topbar-divider">/</span>
            <span>Management portal</span>
          </div>
          <div className="topbar-user">
            <div className="avatar">{admin?.name?.slice(0, 1).toUpperCase() || "A"}</div>
            <div className="topbar-user-copy"><strong>{admin?.name}</strong><span>Administrator</span></div>
          </div>
        </header>
        <div className="admin-content"><Outlet context={context} /></div>
        <footer className="admin-footer">
          <span>Delhi Transport Corporation</span>
          <span>Administration portal · Chunk 1</span>
        </footer>
      </main>
      {open && <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button>}
    </div>
  );
}
