import { BadgeCheck, CalendarDays, Mail, ShieldCheck } from "lucide-react";
import { useOutletContext } from "react-router-dom";

export default function ProfilePage() {
  const { admin } = useOutletContext();
  return <section className="profile-page">
    <div className="page-heading"><span className="eyebrow">ACCOUNT</span><h1>Admin profile</h1><p>Your administrator account information.</p></div>
    <article className="content-card profile-card">
      <div className="profile-banner"><div className="profile-avatar">{admin?.name?.slice(0, 1).toUpperCase()}</div><div><h2>{admin?.name}</h2><span className="role-pill"><ShieldCheck size={14} /> Administrator</span></div><BadgeCheck className="profile-verified" size={23} /></div>
      <div className="profile-details"><div className="profile-detail"><span><Mail size={16} /> EMAIL ADDRESS</span><strong>{admin?.email}</strong></div><div className="profile-detail"><span><CalendarDays size={16} /> ACCOUNT CREATED</span><strong>{admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</strong></div></div>
    </article>
  </section>;
}
