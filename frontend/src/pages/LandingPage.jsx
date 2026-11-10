import { ArrowRight, BarChart3, BusFront, ClipboardList, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";

const features = [
  { icon: ShieldCheck, title: "Administrator workspace", text: "A dedicated dashboard preview for DTC administrative workflows." },
  { icon: BusFront, title: "Fleet visibility", text: "A single place to build visibility across public transport operations." },
  { icon: ClipboardList, title: "Organized operations", text: "Manage users and prepare for consistent, accountable workflows." },
  { icon: BarChart3, title: "Operational insights", text: "A clear dashboard for key administrative information and activity." }
];

export default function LandingPage() {
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
