import { Link } from "react-router-dom";
import { tools } from "../tools/registry";

export default function Home() {
  return (
    <section className="home">
      <h1 className="home-title">Every PDF tool, connected</h1>
      <p className="home-sub">Free · Private · In-browser — nothing uploaded</p>
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
