export default function PlaceholderPage({ title }) {
  return (
    <section className="content-card coming-soon">
      <span className="eyebrow">Future project chunk</span>
      <h1>{title}</h1>
      <p>This area is reserved for a later project chunk and is not part of Chunk 1.</p>
    </section>
  );
}
