import { useEffect, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  BusFront, CalendarDays, ClipboardList, Clock3, LockKeyhole, Mail, Map,
  Pencil, Plus, Search, ShieldCheck, Trash2, UserRoundCog, Users, X
} from "lucide-react";
import {
  Link, Navigate, Route, Routes, useNavigate, useOutletContext
} from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import Brand from "./components/Brand";
import StatCard from "./components/StatCard";

const SESSION_KEY = "dtc-demo-admin";
const WORKSPACE_KEY = "dtc-demo-workspace";
const features = [
  { icon: ShieldCheck, title: "Administrator workspace", text: "A dedicated dashboard preview for DTC administrative workflows." },
  { icon: BusFront, title: "Fleet visibility", text: "A single place to build visibility across public transport operations." },
  { icon: ClipboardList, title: "Organized operations", text: "Manage users and prepare for consistent, accountable workflows." },
  { icon: BarChart3, title: "Operational insights", text: "A clear dashboard for key administrative information and activity." }
];

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

function readStoredValue(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback();
  } catch (error) {
    console.error(`Could not read local demo data (${key}):`, error);
    localStorage.removeItem(key);
    return fallback();
  }
}

function makeActivity(message) {
  return { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
}

export default function App() {
  const [admin, setAdmin] = useState(() => readStoredValue(SESSION_KEY, () => null));
  const [workspace, setWorkspace] = useState(() => readStoredValue(WORKSPACE_KEY, initialWorkspace));

  useEffect(() => {
    if (admin) localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    else localStorage.removeItem(SESSION_KEY);
  }, [admin]);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  function login(email) {
    setAdmin({
      id: "local-admin",
      name: "Administrator",
      email: email.trim().toLowerCase(),
      role: "admin",
      createdAt: new Date().toISOString()
    });
  }

  function addUser(details) {
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
  }

  function updateUser(id, details) {
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
  }

  function deleteUser(id) {
    const user = workspace.users.find((item) => item.id === id);
    if (!user) throw new Error("This user no longer exists.");
    setWorkspace((current) => ({
      users: current.users.filter((item) => item.id !== id),
      activity: [makeActivity(`Removed user ${user.name}`), ...current.activity].slice(0, 6)
    }));
  }

  function logout() {
    setAdmin(null);
  }

  const outletContext = {
    admin,
    users: workspace.users,
    activity: workspace.activity,
    addUser,
    updateUser,
    deleteUser
  };

  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage admin={admin} login={login} />} />
    <Route path="/admin" element={<ProtectedRoute admin={admin}><AdminLayout admin={admin} logout={logout} context={outletContext} /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="buses" element={<PlaceholderPage title="Bus Management" />} />
      <Route path="routes" element={<PlaceholderPage title="Route Management" />} />
      <Route path="duties" element={<PlaceholderPage title="Duty Scheduling" />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function ProtectedRoute({ admin, children }) {
  return admin ? children : <Navigate to="/login" replace />;
}

function LandingPage() {
  return <div className="landing">
    <header className="site-header"><div className="site-header-inner">
      <Link to="/" className="brand-link"><Brand /></Link>
      <nav className="landing-nav"><a href="#about">About</a><a href="#features">Features</a><Link className="button button-outline" to="/login">Admin login <ArrowRight size={16} /></Link></nav>
    </div></header>
    <main>
      <section className="hero" id="home">
        <div className="hero-pattern" />
        <div className="hero-content">
          <div className="hero-tag"><span className="tag-dot" /> PUBLIC TRANSPORT · DELHI</div>
          <h1>Moving Delhi.<br /><span>Managing better.</span></h1>
          <p>A centralized management platform supporting the people and operations behind Delhi’s public bus network.</p>
          <div className="hero-actions"><Link className="button button-primary" to="/login">Admin portal <ArrowRight size={17} /></Link><a className="text-link" href="#about">Explore the system <span>↓</span></a></div>
          <div className="hero-caption"><span className="caption-line" /> A smarter foundation for public mobility</div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-sun" />
          <div className="visual-building building-one" /><div className="visual-building building-two" /><div className="visual-building building-three" />
          <div className="visual-road"><span /><span /></div>
          <div className="illustration-bus"><div className="bus-window" /><div className="bus-window" /><div className="bus-window" /><div className="bus-front" /><i /><i /></div>
          <div className="visual-label label-top">DTC <span>·</span> DELHI</div><div className="visual-label label-bottom">PUBLIC SERVICE / 01</div>
        </div>
      </section>
      <section className="about-section section-wrap" id="about">
        <div className="section-index">01 <span>/ ABOUT</span></div>
        <div className="about-content"><span className="eyebrow">A connected public service</span><h2>Built to support the teams<br />that keep Delhi moving.</h2><p>The DTC Bus Management System is an administrative foundation for organizing essential transport operations. This first release focuses on secure administration, user management, and a clear operational overview.</p><Link className="inline-link" to="/login">Enter the admin portal <ArrowRight size={16} /></Link></div>
        <div className="about-stamp"><span>DELHI</span><strong>गतिमान</strong><small>PUBLIC TRANSPORT</small></div>
      </section>
      <section className="features-section" id="features"><div className="section-wrap">
        <div className="features-heading"><div><div className="section-index">02 <span>/ CAPABILITIES</span></div><h2>One platform.<br />A clearer picture.</h2></div><p>Designed for day-to-day administrative clarity, with secure access and room to grow as the system evolves.</p></div>
        <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className="feature-number">0{index + 1}</span><div className="feature-icon"><Icon size={21} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>
      <section className="cta-section"><div><span className="eyebrow">ADMINISTRATOR ACCESS</span><h2>Ready to get to work?</h2><p>Sign in to the DTC administration portal.</p></div><Link className="button button-light" to="/login">Admin login <ArrowRight size={17} /></Link></section>
    </main>
    <footer className="site-footer"><Brand /><span>© Delhi Transport Corporation · Administration system</span><a href="#home">Back to top ↑</a></footer>
  </div>;
}

function LoginPage({ admin, login }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (admin) return <Navigate to="/admin" replace />;

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!email.trim() || password.length < 8) {
      setError("Enter a valid email address and a password of at least 8 characters.");
      return;
    }
    login(email);
    navigate("/admin", { replace: true });
  }

  return <div className="login-page">
    <div className="login-left">
      <Link to="/" className="brand-link"><Brand /></Link>
      <div className="login-message"><span className="eyebrow">DTC ADMINISTRATION</span><h1>Welcome back<br />to your workspace.</h1><p>Manage access and stay informed with the DTC bus management system.</p></div>
      <span className="login-legal">DELHI TRANSPORT CORPORATION <i /> FRONTEND DEMO</span>
    </div>
    <div className="login-right">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>
      <div className="login-form-wrap">
        <div className="login-icon"><LockKeyhole size={21} /></div>
        <span className="eyebrow">ADMINISTRATOR SIGN IN</span>
        <h2>Sign in to continue</h2><p className="form-intro">Open the local DTC dashboard preview.</p>
        <div className="demo-notice" role="note">Frontend demo only. Any valid email and password with at least 8 characters will open a local session. This is not real authentication.</div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" placeholder="name@dtc.gov.in" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          {error && <div role="alert" className="form-alert">{error}</div>}
          <button type="submit" className="button button-primary login-submit">Open demo workspace <ArrowRight size={17} /></button>
        </form>
        <div className="login-security"><LockKeyhole size={14} /><span>Demo session is stored in this browser only.</span></div>
      </div>
      <span className="login-copyright">© Delhi Transport Corporation</span>
    </div>
  </div>;
}

function DashboardPage() {
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

function ProfilePage() {
  const { admin } = useOutletContext();
  return <section className="profile-page">
    <div className="page-heading"><span className="eyebrow">ACCOUNT</span><h1>Admin profile</h1><p>Your administrator account information.</p></div>
    <article className="content-card profile-card">
      <div className="profile-banner"><div className="profile-avatar">{admin?.name?.slice(0, 1).toUpperCase()}</div><div><h2>{admin?.name}</h2><span className="role-pill"><ShieldCheck size={14} /> Administrator</span></div><BadgeCheck className="profile-verified" size={23} /></div>
      <div className="profile-details"><div className="profile-detail"><span><Mail size={16} /> EMAIL ADDRESS</span><strong>{admin?.email}</strong></div><div className="profile-detail"><span><CalendarDays size={16} /> ACCOUNT CREATED</span><strong>{admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</strong></div></div>
    </article>
  </section>;
}

function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useOutletContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function openCreate() {
    setEditing("new");
    setForm({ name: "", email: "", role: "user" });
    setError("");
    setNotice("");
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role });
    setError("");
    setNotice("");
  }

  function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (editing === "new") addUser(form);
      else updateUser(editing.id, form);
      setEditing(null);
      setNotice(editing === "new" ? "User created successfully." : "User details updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function removeUser(user) {
    if (!window.confirm(`Delete the account for ${user.name}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      deleteUser(user.id);
      setNotice("User deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="users-page">
    <div className="page-heading users-heading"><div><span className="eyebrow">ACCESS &amp; ACCOUNTS</span><h1>User management</h1><p>Create and manage accounts with access to DTC systems.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add user</button></div>
    {error && <div role="alert" className="form-alert">{error}</div>}{notice && <div role="status" className="form-success">{notice}</div>}
    <div className="content-card users-card">
      <div className="users-toolbar"><div className="table-title"><div className="table-icon"><Users size={18} /></div><div><h2>System users</h2><span>{users.length} {users.length === 1 ? "account" : "accounts"}</span></div></div><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" aria-label="Search users" /></label></div>
      <div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL ADDRESS</th><th>ROLE</th><th>ADDED</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{filteredUsers.map((user) => <tr key={user.id}><td><div className="table-user"><span className="table-avatar">{user.name.slice(0, 1).toUpperCase()}</span><strong>{user.name}</strong></div></td><td>{user.email}</td><td><span className="user-role">{user.role}</span></td><td>{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td><div className="row-actions"><button title="Edit user" aria-label={`Edit ${user.name}`} onClick={() => openEdit(user)}><Pencil size={15} /></button><button title="Delete user" aria-label={`Delete ${user.name}`} onClick={() => removeUser(user)}><Trash2 size={15} /></button></div></td></tr>)}
          {!filteredUsers.length && <tr><td colSpan="5" className="table-empty">{users.length ? "No users match your search." : "No users have been added yet."}</td></tr>}
        </tbody></table></div>
    </div>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">USER ACCOUNT</span><h2 id="modal-title">{editing === "new" ? "Add a user" : "Edit user"}</h2></div><button onClick={() => setEditing(null)} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} className="user-form"><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={100} /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={254} /></label><label>Role<input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required minLength={2} maxLength={50} /></label><p className="demo-form-note">Demo data is saved in this browser only. No password is stored.</p>{error && <div role="alert" className="form-alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary">Save user</button></div></form>
      </section>
    </div>}
  </section>;
}

function PlaceholderPage({ title }) {
  return <section className="content-card coming-soon"><span className="eyebrow">Future project chunk</span><h1>{title}</h1><p>This area is reserved for a later project chunk and is not part of Chunk 1.</p></section>;
}
