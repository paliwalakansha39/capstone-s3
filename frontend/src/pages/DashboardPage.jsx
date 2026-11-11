import { Activity, ArrowUpRight, BusFront, Clock3, Map, UserCheck, Users, UserRoundCog } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getBusStats } from "../services/busService";
import { getCrewStats } from "../services/crewService";

export default function DashboardPage() {
  const { admin, users, activity } = useOutletContext();
  const [busCount, setBusCount] = useState(null);
  const [crewStats, setCrewStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getBusStats().catch(() => null),
      getCrewStats().catch(() => null)
    ]).then(([busData, crewData]) => {
      if (mounted) {
        if (busData) setBusCount(busData.total);
        if (crewData) setCrewStats(crewData);
      }
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
      <StatCard icon={BusFront} label="Total buses" value={busCount !== null ? busCount : "..."} note={busCount !== null ? "Connected to fleet DB" : "Fetching fleet data..."} />
      <StatCard icon={UserCheck} label="Active crew" value={crewStats ? crewStats.totalCrew : "..."} note={crewStats ? `${crewStats.totalAvailable} available for dispatch` : "Live crew availability"} accent />
      <StatCard icon={Users} label="Total users" value={users.length} note="Saved in workspace" />
      <StatCard icon={Map} label="Total routes" value="—" note="Route data · future project chunk" />
    </div>
    <div className="dashboard-lower">
      <section className="content-card overview-card">
        <div className="card-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Dashboard overview</h2></div><span className="live-badge"><i /> LOCAL DEMO</span></div>
        <div className="overview-graphic"><div className="overview-orbit overview-orbit-one" /><div className="overview-orbit overview-orbit-two" /><div className="overview-center"><BusFront size={27} /><span>DTC</span></div><div className="orbit-node node-one"><Users size={15} /></div><div className="orbit-node node-two"><Map size={15} /></div><div className="orbit-node node-three"><Activity size={15} /></div><span className="orbit-label label-users">PEOPLE</span><span className="orbit-label label-routes">NETWORK</span><span className="orbit-label label-ops">OPERATIONS</span></div>
        <div className="overview-caption"><span>Administration workspace</span><span>03 / 04</span></div>
      </section>
      <section className="content-card activity-card">
        <div className="card-heading"><div><span className="eyebrow">WORKSPACE LOG</span><h2>Recent activity</h2></div><Clock3 size={18} className="muted-icon" /></div>
        {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.id}><span className="activity-item-dot" /><div><strong>{item.message}</strong><time>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div></div>)}</div> : <div className="activity-empty"><div className="empty-icon"><Activity size={20} /></div><strong>No recent activity yet</strong><p>As your team starts using the system, updates will appear here.</p></div>}
        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
          <Link className="activity-link" to="/admin/buses">Bus fleet <ArrowUpRight size={15} /></Link>
          <Link className="activity-link" to="/admin/crew">Crew roster <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </div>
    <div className="dashboard-note"><span className="note-accent" /><span><strong>Chunk 3 Active</strong> &nbsp;Bus fleet management and Crew availability management are fully operational.</span></div>
  </div>;
}
