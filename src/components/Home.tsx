import { Link } from "react-router-dom";
import { tools } from "../tools/registry";

export default function Home() {
  return (
    <section className="home">
      <div className="hero">
        <span className="hero-eyebrow">Free · Private · In your browser</span>
        <h1 className="home-title">Every PDF tool,<br /><span className="grad-text">connected.</span></h1>
        <p className="home-sub">Every file stays on your device. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        {tools.map((t) => {
          const inner = (
            <>
              <div className="card-icon">{t.icon}</div>
              <span className="card-name">{t.title}</span>
              {t.status === "soon" && <span className="badge">soon</span>}
            </>
          );
          return t.status === "ready" ? (
            <Link key={t.slug} to={`/${t.slug}`} className="card">{inner}</Link>
          ) : (
            <div key={t.slug} className="card disabled">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
