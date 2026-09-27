const KNOWN_TONES = ["pending", "paid", "cancelled"];

export default function Badge({ tone, children }) {
  const cls = KNOWN_TONES.includes(tone) ? tone : "neutral";
  return <span className={`badge ${cls}`}>{children ?? tone}</span>;
}
