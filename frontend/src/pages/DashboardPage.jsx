import { Activity, ArrowUpRight, BusFront, CalendarCheck, Clock3, Map, UserCheck, Users, UserRoundCog } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getDashboardStats } from "../services/dashboardService";
import { getCrewStats } from "../services/crewService";
import { getDutyStats } from "../services/dutyService";

export default function DashboardPage() {
  const { admin, users, activity } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [crewStats, setCrewStats] = useState(null);
  const [dutyStats, setDutyStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDashboardStats()
      .then((dashboardData) => {
        if (mounted) setStats(dashboardData);
      })
      .catch((error) => {
        if (mounted) setStatsError(error.response?.data?.error || error.message);
      });
    getCrewStats()
      .then((crewData) => {
        if (mounted) setCrewStats(crewData);
      })
      .catch((error) => {
        if (mounted) console.error("Could not load crew availability:", error);
      });
    getDutyStats()
      .then((dutiesData) => {
        if (mounted) setDutyStats(dutiesData);
      })
      .catch((error) => {
        if (mounted) console.error("Could not load duty statistics:", error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata"
  }).format(new Date()).toUpperCase();

  return <div className="dashboard-page">
    <div className="welcome-row"><div><span className="eyebrow">{today} <i className="welcome-dot" /> ADMIN OVERVIEW</span><h1>Good day, {admin?.name?.split(" ")[0] || "Administrator"}.</h1><p>Here’s the latest overview of your DTC management workspace.</p></div><div className="welcome-mark"><span>DT</span></div></div>
    <div className="stats-grid">
      <StatCard icon={BusFront} label="Total buses" value={stats ? stats.totalBuses : "—"} note={stats ? "Connected to fleet DB" : "Loading dashboard data"} />
      <StatCard icon={UserRoundCog} label="Total admins" value={stats ? stats.totalAdmins : "—"} note={stats ? "Administrator accounts" : "Loading dashboard data"} />
      <StatCard icon={UserCheck} label="Active crew" value={crewStats ? crewStats.totalCrew : "..."} note={crewStats ? `${crewStats.totalAvailable} available for dispatch` : "Live crew availability"} />
      <StatCard icon={CalendarCheck} label="Linked duties" value={dutyStats ? dutyStats.total : "..."} note={dutyStats ? `${dutyStats.active} active shifts (${dutyStats.assignedBuses} buses bound)` : "Duty schedule"} accent />
      <StatCard icon={Users} label="Total users" value={stats ? stats.totalUsers : "—"} note={stats ? "Registered system users" : "Loading dashboard data"} />
      <StatCard icon={Map} label="Total routes" value={stats ? stats.totalRoutes : "—"} note={stats ? "Connected to route DB" : "Loading dashboard data"} />
    </div>
    {statsError && <div role="alert" className="form-alert">Could not load dashboard statistics: {statsError}</div>}
    <div className="dashboard-lower">
      <section className="content-card overview-card">
        <div className="card-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Dashboard overview</h2></div><span className="live-badge"><i /> LIVE DATA</span></div>
        <div className="overview-graphic"><div className="overview-orbit overview-orbit-one" /><div className="overview-orbit overview-orbit-two" /><div className="overview-center"><BusFront size={27} /><span>DTC</span></div><div className="orbit-node node-one"><Users size={15} /></div><div className="orbit-node node-two"><Map size={15} /></div><div className="orbit-node node-three"><Activity size={15} /></div><span className="orbit-label label-users">PEOPLE</span><span className="orbit-label label-routes">NETWORK</span><span className="orbit-label label-ops">OPERATIONS</span></div>
        <div className="overview-caption"><span>Administration workspace</span><span>03 / 04</span></div>
      </section>
      <section className="content-card activity-card">
        <div className="card-heading"><div><span className="eyebrow">WORKSPACE LOG</span><h2>Recent activity</h2></div><Clock3 size={18} className="muted-icon" /></div>
        {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.id}><span className="activity-item-dot" /><div><strong>{item.message}</strong><time>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div></div>)}</div> : <div className="activity-empty"><div className="empty-icon"><Activity size={20} /></div><strong>No recent activity yet</strong><p>As your team starts using the system, updates will appear here.</p></div>}
        <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
          <Link className="activity-link" to="/admin/buses">Bus fleet <ArrowUpRight size={15} /></Link>
          <Link className="activity-link" to="/admin/crew">Crew roster <ArrowUpRight size={15} /></Link>
          <Link className="activity-link" to="/admin/trips">Trips <ArrowUpRight size={15} /></Link>
          <Link className="activity-link" to="/admin/duties">Duty schedule <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </div>
    <div className="dashboard-note"><span className="note-accent" /><span><strong>Phase 2 Active</strong> &nbsp;Bus fleet, Crew availability, Route &amp; Trip management, and Linked Duty Scheduling are fully operational.</span></div>
  </div>;
}
