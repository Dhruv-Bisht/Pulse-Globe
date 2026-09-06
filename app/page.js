import Globe from "../components/Globe";
import Legend from "../components/Legend";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LIVE GLOBAL SIGNALS</p>
          <h1>Pulse Globe</h1>
          <p className="subtitle">Recent stories from around the world · last 24 hours</p>
        </div>
        <div className="status"><span className="dot" /> Live</div>
      </header>

      <section className="map-card">
        <Globe />
        <Legend />
      </section>

      <footer className="footer">
        <span>Read-only public view</span>
        <span>Updates every 45 seconds</span>
      </footer>
    </main>
  );
}