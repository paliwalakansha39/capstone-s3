import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";

export default function LoginPage({ admin, login }) {
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
