export default function StatTile({ icon, label, value, hint, featured = false }) {
  return <article className={`stat${featured ? " featured" : ""}`}>
    <div className="stat-icon">{icon}</div>
    <span>{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </article>;
}
