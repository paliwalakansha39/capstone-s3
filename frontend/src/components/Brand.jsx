export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true">DTC</div>
      <div className="brand-copy">
        <strong>Delhi Transport Corporation</strong>
        {!compact && <span>Bus Management System</span>}
      </div>
    </div>
  );
}
