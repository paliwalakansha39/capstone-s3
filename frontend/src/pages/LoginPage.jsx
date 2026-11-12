import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";

export default function LoginPage({ admin, login, loading }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (admin) return <Navigate to="/admin" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to sign in. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="login-page">
    <div className="login-left">
      <Link to="/" className="brand-link"><Brand /></Link>
      <div className="login-message"><span className="eyebrow">DTC ADMINISTRATION</span><h1>Welcome back<br />to your workspace.</h1><p>Manage access and stay informed with the DTC bus management system.</p></div>
      <span className="login-legal">DELHI TRANSPORT CORPORATION <i /> ADMINISTRATION PORTAL</span>
    </div>
    <div className="login-right">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>
      <div className="login-form-wrap">
        <div className="login-icon"><LockKeyhole size={21} /></div>
        <span className="eyebrow">ADMINISTRATOR SIGN IN</span>
        <h2>Sign in to continue</h2><p className="form-intro">Use your administrator account to access the DTC portal.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" placeholder="name@dtc.gov.in" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <div role="alert" className="form-alert">{error}</div>}
          <button type="submit" className="button button-primary login-submit" disabled={submitting || loading}>{submitting ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></button>
        </form>
        <div className="login-security"><LockKeyhole size={14} /><span>Demo session is stored in this browser only.</span></div>
      </div>
      <span className="login-copyright">© Delhi Transport Corporation</span>
    </div>
  </div>;
}
