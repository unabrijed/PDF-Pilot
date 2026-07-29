import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { ChevronDown, Moon, Sun } from "lucide-react";
import Home from "./components/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Toaster } from "./components/ui/sonner";
import { categories, tools, toolBySlug } from "./tools/registry";

const SITE_TITLE = "PDFPilot, PDF tools in your browser";
const SITE_DESC = "Free PDF tools that run entirely in your browser. Nothing is uploaded.";

// Retry a dynamic import once before giving up, so a transient chunk fetch
// (or a stale hashed URL just after a PWA update) recovers silently. A second
// failure rejects and the route ErrorBoundary shows a reload card.
const retry = <T,>(fn: () => Promise<T>): Promise<T> => fn().catch(() => fn());

// Split each tool (and its heavy dep, qpdf-wasm / pdf-lib) into its own chunk,
// loaded only when the tool is opened.
const Unlock = lazy(() => retry(() => import("./tools/unlock/Unlock")));
const Merge = lazy(() => retry(() => import("./tools/merge/Merge")));
const Split = lazy(() => retry(() => import("./tools/split/Split")));
const Rotate = lazy(() => retry(() => import("./tools/rotate/Rotate")));
const Protect = lazy(() => retry(() => import("./tools/protect/Protect")));
const JpgToPdf = lazy(() => retry(() => import("./tools/jpg-to-pdf/JpgToPdf")));
const PdfToJpg = lazy(() => retry(() => import("./tools/pdf-to-jpg/PdfToJpg")));
const Watermark = lazy(() => retry(() => import("./tools/watermark/Watermark")));
const PageNumbers = lazy(() => retry(() => import("./tools/page-numbers/PageNumbers")));
const Compress = lazy(() => retry(() => import("./tools/compress/Compress")));
const Sign = lazy(() => retry(() => import("./tools/sign/Sign")));
const Repair = lazy(() => retry(() => import("./tools/repair/Repair")));
const Organize = lazy(() => retry(() => import("./tools/organize/Organize")));
const Ocr = lazy(() => retry(() => import("./tools/ocr/Ocr")));
const Crop = lazy(() => retry(() => import("./tools/crop/Crop")));
const PdfEditor = lazy(() => retry(() => import("./tools/pdf-editor/PdfEditor")));

function Logo() {
  return (
    <svg className="text-primary size-5 shrink-0" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M58 10 6 32l22 8 8 16z" />
        <path d="M58 10 28 40" />
      </g>
    </svg>
  );
}

function NotFound() {
  return (
    <div className="px-6 py-28 text-center">
      <p className="font-display text-7xl font-semibold tracking-[-0.03em]">404</p>
      <p className="text-muted-foreground mt-3">That page doesn't exist.</p>
      <Button asChild className="mt-7 rounded-full">
        <Link to="/">Back to all tools</Link>
      </Button>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    const tool = toolBySlug(pathname.slice(1));
    document.title = tool ? `${tool.title} | PDFPilot` : SITE_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute("content", tool ? tool.desc : SITE_DESC);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", __SITE_URL__ + (tool ? pathname : "/"));
  }, [pathname]);

  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  const flipTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.theme = t;
    setTheme(t);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="bg-background/80 mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full border py-1.5 pr-1.5 pl-4 shadow-sm backdrop-blur-md backdrop-saturate-150">
          <Link to="/" className="font-display inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Logo /> PDFPilot
          </Link>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full">
                  Tools <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <DropdownMenuItem key={t.slug} asChild disabled={t.status !== "ready"}>
                      <Link to={`/${t.slug}`}><Icon /> {t.title}</Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="rounded-full" onClick={flipTheme} aria-label="Toggle dark mode">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            <Button asChild className="hidden rounded-full sm:inline-flex">
              <Link to="/#tools">Browse tools</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<p className="text-muted-foreground px-6 py-20 text-center text-sm">Loading…</p>}>
            <div className="page-in">
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
                <Route path="/crop" element={<Crop />} />
                <Route path="/pdf-editor" element={<PdfEditor />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="bg-ink text-ink-foreground mt-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div>
            <span className="font-display inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Logo /> PDFPilot
            </span>
            <p className="text-ink-foreground/70 mt-3 max-w-xs text-sm leading-relaxed">
              Every PDF tool, in your browser. Files never leave your device.
            </p>
          </div>
          {categories.map((c) => (
            <nav key={c.id} aria-label={c.label}>
              <div className="text-ink-muted text-xs font-semibold tracking-[0.15em] uppercase">{c.label}</div>
              <ul className="mt-4 space-y-2.5">
                {tools.filter((t) => t.category === c.id).map((t) => (
                  <li key={t.slug}>
                    <Link to={`/${t.slug}`} className="text-ink-foreground/70 hover:text-ink-foreground text-sm transition-colors">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-ink-foreground/10 border-t">
          <div className="text-ink-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs">
            <span>© 2026 PDFPilot · MIT license</span>
            <span>No uploads. No accounts. No tracking.</span>
          </div>
        </div>
      </footer>

      <Toaster position="bottom-center" theme={theme as "light" | "dark"} />
    </div>
  );
}
