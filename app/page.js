import Globe from "../components/Globe";

export default function Home() {
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">GLOBAL SIGNAL</div>
          <h1>Pulse Globe</h1>
          <p>Read-only global stories, from the last hour to the last year.</p>
        </div>
        <div className="status"><span /> LIVE FEED</div>
      </header>
      <Globe />
      <footer>Updates automatically every 45 seconds · Drag the globe to explore · Click a pulse to read</footer>
    </main>
  );
}