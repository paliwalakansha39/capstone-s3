import { Activity, ArrowUpRight, BusFront, Clock3, Map, Users, UserRoundCog } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import StatCard from "../components/StatCard";

export default function DashboardPage() {
  const { admin, users, activity } = useOutletContext();
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata"
  }).format(new Date()).toUpperCase();

  return <div className="dashboard-page">
    <div className="welcome-row"><div><span className="eyebrow">{today} <i className="welcome-dot" /> ADMIN OVERVIEW</span><h1>Good day, {admin?.name?.split(" ")[0] || "Administrator"}.</h1><p>Here’s the latest overview of your DTC management workspace.</p></div><div className="welcome-mark"><span>DT</span></div></div>
    <div className="stats-grid">
      <StatCard icon={Users} label="Total users" value={users.length} note="Saved in this browser" />
      <StatCard icon={UserRoundCog} label="Total admins" value={1} note="Demo administrator" accent />
      <StatCard icon={BusFront} label="Total buses" value="—" note="Fleet data · future project chunk" />
      <StatCard icon={Map} label="Total routes" value="—" note="Route data · future project chunk" />
    </div>
    <div className="dashboard-lower">
      <section className="content-card overview-card">
        <div className="card-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Dashboard overview</h2></div><span className="live-badge"><i /> LOCAL DEMO</span></div>
        <div className="overview-graphic"><div className="overview-orbit overview-orbit-one" /><div className="overview-orbit overview-orbit-two" /><div className="overview-center"><BusFront size={27} /><span>DTC</span></div><div className="orbit-node node-one"><Users size={15} /></div><div className="orbit-node node-two"><Map size={15} /></div><div className="orbit-node node-three"><Activity size={15} /></div><span className="orbit-label label-users">PEOPLE</span><span className="orbit-label label-routes">NETWORK</span><span className="orbit-label label-ops">OPERATIONS</span></div>
        <div className="overview-caption"><span>Administration workspace</span><span>01 / 04</span></div>
      </section>
      <section className="content-card activity-card">
        <div className="card-heading"><div><span className="eyebrow">WORKSPACE LOG</span><h2>Recent activity</h2></div><Clock3 size={18} className="muted-icon" /></div>
        {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.id}><span className="activity-item-dot" /><div><strong>{item.message}</strong><time>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div></div>)}</div> : <div className="activity-empty"><div className="empty-icon"><Activity size={20} /></div><strong>No recent activity yet</strong><p>As your team starts using the system, updates will appear here.</p></div>}
        <Link className="activity-link" to="/admin/users">Manage system users <ArrowUpRight size={15} /></Link>
      </section>
    </div>
    <div className="dashboard-note"><span className="note-accent" /><span><strong>Chunk 1 workspace</strong> &nbsp;User administration is ready. Bus, route, and duty data will be added in future project chunks.</span></div>
  </div>;
}
