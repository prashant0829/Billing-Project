export default function EmptyState({ icon, title, description, action, card = true, titleAs = "h2" }) {
  const Title = titleAs;
  const content = <>
    <div className="empty-icon">{icon}</div>
    <Title>{title}</Title>
    {description && <p>{description}</p>}
    {action}
  </>;
  return card ? <div className="card empty-card">{content}</div> : <div className="empty-card">{content}</div>;
}
