import { Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, loading, error: loadError } = useOutletContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function openCreate() {
    setEditing("new");
    setForm({ name: "", email: "", role: "user", password: "" });
    setError("");
    setNotice("");
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "" });
    setError("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const details = { name: form.name, email: form.email, role: form.role };
      if (form.password) details.password = form.password;
      if (editing === "new") await addUser(details);
      else await updateUser(editing.id, details);
      setEditing(null);
      setNotice(editing === "new" ? "User created successfully." : "User details updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Delete the account for ${user.name}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await deleteUser(user.id);
      setNotice("User deleted.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    }
  }

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="users-page">
    <div className="page-heading users-heading"><div><span className="eyebrow">ACCESS &amp; ACCOUNTS</span><h1>User management</h1><p>Create and manage accounts with access to DTC systems.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add user</button></div>
    {error && <div role="alert" className="form-alert">{error}</div>}{notice && <div role="status" className="form-success">{notice}</div>}
    {loadError && <div role="alert" className="form-alert">Could not load users: {loadError}</div>}
    <div className="content-card users-card">
      <div className="users-toolbar"><div className="table-title"><div className="table-icon"><Users size={18} /></div><div><h2>System users</h2><span>{users.length} {users.length === 1 ? "account" : "accounts"}</span></div></div><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" aria-label="Search users" /></label></div>
      <div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL ADDRESS</th><th>ROLE</th><th>ADDED</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{filteredUsers.map((user) => <tr key={user.id}><td><div className="table-user"><span className="table-avatar">{user.name.slice(0, 1).toUpperCase()}</span><strong>{user.name}</strong></div></td><td>{user.email}</td><td><span className="user-role">{user.role}</span></td><td>{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td><div className="row-actions"><button title="Edit user" aria-label={`Edit ${user.name}`} onClick={() => openEdit(user)}><Pencil size={15} /></button><button title="Delete user" aria-label={`Delete ${user.name}`} onClick={() => removeUser(user)}><Trash2 size={15} /></button></div></td></tr>)}
          {!filteredUsers.length && <tr><td colSpan="5" className="table-empty">{loading ? "Loading users..." : users.length ? "No users match your search." : "No users have been added yet."}</td></tr>}
        </tbody></table></div>
    </div>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">USER ACCOUNT</span><h2 id="modal-title">{editing === "new" ? "Add a user" : "Edit user"}</h2></div><button onClick={() => setEditing(null)} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={submit} className="user-form"><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={100} /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={254} /></label><label>Role<input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required minLength={2} maxLength={50} /></label><label>{editing === "new" ? "Password" : "Change password (optional)"}<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={editing === "new"} minLength={12} maxLength={72} autoComplete="new-password" /></label><p className="demo-form-note">Passwords are securely hashed before storage.</p>{error && <div role="alert" className="form-alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary">Save user</button></div></form>
      </section>
    </div>}
  </section>;
}
