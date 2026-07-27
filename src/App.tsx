import { lazy, Suspense, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Compass, Moon, Sun } from "lucide-react";
import Home from "./components/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Toaster } from "./components/ui/sonner";
import { tools } from "./tools/registry";

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
    <div className="bg-card mx-auto my-16 max-w-md rounded-2xl border p-9 text-center shadow-sm">
      <Compass className="text-muted-foreground mx-auto size-9" />
      <h2 className="mt-3 text-xl font-semibold">Nothing here</h2>
      <Button variant="link" asChild><Link to="/">Back to all tools</Link></Button>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  const flipTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.theme = t;
    setTheme(t);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-card/80 sticky top-0 z-30 flex items-center justify-between border-b px-6 py-3 backdrop-blur-md backdrop-saturate-150">
        <Link to="/" className="font-display inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <Logo /> PDFPilot
          <span className="text-muted-foreground font-sans text-xs font-medium tracking-normal">PDF tools</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={flipTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">All tools</Button>
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-12 pb-8">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
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
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="text-muted-foreground py-7 text-center text-xs">
        Files stay in your browser. Nothing is uploaded.
      </footer>

      <Toaster position="bottom-center" theme={theme as "light" | "dark"} />
    </div>
  );
}
