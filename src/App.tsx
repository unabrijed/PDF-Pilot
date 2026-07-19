import { lazy, Suspense, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import { tools } from "./tools/registry";

// Split each tool (and its heavy dep — qpdf-wasm, pdf-lib) into its own chunk,
// loaded only when the tool is opened.
const Unlock = lazy(() => import("./tools/unlock/Unlock"));
const Merge = lazy(() => import("./tools/merge/Merge"));
const Split = lazy(() => import("./tools/split/Split"));
const Rotate = lazy(() => import("./tools/rotate/Rotate"));
const Protect = lazy(() => import("./tools/protect/Protect"));
const JpgToPdf = lazy(() => import("./tools/jpg-to-pdf/JpgToPdf"));
const PdfToJpg = lazy(() => import("./tools/pdf-to-jpg/PdfToJpg"));
const Watermark = lazy(() => import("./tools/watermark/Watermark"));
const PageNumbers = lazy(() => import("./tools/page-numbers/PageNumbers"));
const Compress = lazy(() => import("./tools/compress/Compress"));
const Sign = lazy(() => import("./tools/sign/Sign"));
const Repair = lazy(() => import("./tools/repair/Repair"));
const Organize = lazy(() => import("./tools/organize/Organize"));
const Ocr = lazy(() => import("./tools/ocr/Ocr"));

const closeMenu = (e: { currentTarget: HTMLElement }) =>
  e.currentTarget.closest("details")?.removeAttribute("open");

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M6 46h52" />
        <path d="M19 18v28M45 18v28" />
        <path d="M19 22Q32 42 45 22" />
        <path d="M19 22 6 46M45 22 58 46" />
      </g>
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  const flipTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    localStorage.theme = t;
    setTheme(t);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand"><Logo /> Bridge <span className="brand-sub">PDF tools</span></Link>
        <div className="top-actions">
        <button className="theme-btn" onClick={flipTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <details className="menu">
          <summary>All tools</summary>
          <div className="menu-pop">
            {tools.map((t) =>
              t.status === "ready" ? (
                <Link key={t.slug} to={`/${t.slug}`} onClick={closeMenu}>{t.icon} {t.title}</Link>
              ) : (
                <span key={t.slug} className="disabled">{t.icon} {t.title} <em>soon</em></span>
              )
            )}
          </div>
        </details>
        </div>
      </header>

      <main className="content">
        <Suspense fallback={<p className="hint-line">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/unlock" element={<Unlock />} />
            <Route path="/merge" element={<Merge />} />
            <Route path="/split" element={<Split />} />
            <Route path="/rotate" element={<Rotate />} />
            <Route path="/protect" element={<Protect />} />
            <Route path="/jpg-to-pdf" element={<JpgToPdf />} />
            <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
            <Route path="/watermark" element={<Watermark />} />
            <Route path="/page-numbers" element={<PageNumbers />} />
            <Route path="/compress" element={<Compress />} />
            <Route path="/sign" element={<Sign />} />
            <Route path="/repair" element={<Repair />} />
            <Route path="/organize" element={<Organize />} />
            <Route path="/ocr" element={<Ocr />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="foot">Files cross locally — the bridge is in your browser. Nothing is uploaded.</footer>
    </div>
  );
}
