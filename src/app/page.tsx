export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Cadre AI Support Assistant</p>
        <h1>Welcome to Cadre support insights</h1>
        <p className="intro">
          This site provides a simple public shell describing Cadre’s AI support capabilities.
          It is not a conversational assistant yet.
        </p>
      </section>

      <section className="details">
        <h2>What this assistant is for</h2>
        <p>
          Helping prospective and existing clients understand Cadre’s services, industries
          served, AI maturity approach, and how to request a strategy conversation.
        </p>

        <h2>What it cannot do yet</h2>
        <ul>
          <li>Answer private account questions or access client data.</li>
          <li>Book meetings, authenticate users, or provide live support.</li>
          <li>Make promises about pricing, implementation schedules, or security guarantees.</li>
        </ul>
      </section>
    </main>
  );
}
