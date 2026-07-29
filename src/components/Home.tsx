import { useEffect, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowDown } from "lucide-react";
import { categories, tools } from "../tools/registry";
import { Button } from "./ui/button";
import { useReveal } from "../lib/useReveal";

const delay = (i: number) => ({ "--reveal-delay": `${i * 60}ms` }) as CSSProperties;

export default function Home() {
  const ref = useReveal<HTMLDivElement>();

  // Make /#tools work when arriving from a tool page (navbar CTA).
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div ref={ref}>
      <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <p data-reveal className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          Free · Private · Works offline
        </p>
        <h1
          data-reveal
          style={delay(1)}
          className="mt-6 max-w-4xl text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] font-semibold tracking-[-0.03em]"
        >
          Every PDF tool.
          <br />
          <span className="text-primary">Zero uploads.</span>
        </h1>
        <div data-reveal style={delay(2)} className="mt-10 flex flex-wrap items-end justify-between gap-8">
          <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
            Sixteen tools that run entirely in this tab. Merge, split, sign, compress and more. Your files never touch a server.
          </p>
          <div className="flex items-center gap-4">
            <Button size="lg" className="rounded-full" asChild>
              <a href="#tools">Browse tools <ArrowDown /></a>
            </Button>
            <a href="#how" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              How it works
            </a>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6">
        {categories.map((c) => {
          const list = tools.filter((t) => t.category === c.id);
          return (
            <div key={c.id} className="mb-14">
              <div data-reveal className="mb-5 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold">{c.label}</h2>
                <span className="text-muted-foreground text-sm">{list.length} tools</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.slug}
                      to={`/${t.slug}`}
                      data-reveal
                      style={delay(i)}
                      className="group surface ease-out-quart flex items-start gap-4 p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{t.title}</span>
                        <span className="text-muted-foreground mt-0.5 block text-sm">{t.desc}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-6">
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
          <div data-reveal className="surface p-7">
            <h3 className="font-display text-xl font-semibold">Private by design</h3>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
              Every tool runs on WebAssembly inside this tab. Files are processed in memory and never uploaded. No accounts, no tracking, no server on the other end.
            </p>
          </div>
          <div data-reveal style={delay(1)} className="surface p-7">
            <h3 className="font-display text-xl font-semibold">Works offline</h3>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
              PDFPilot installs as an app. Once loaded, every tool keeps working with no connection at all.
            </p>
          </div>
          <div data-reveal style={delay(2)} className="surface p-7">
            <h3 className="font-display text-xl font-semibold">Free forever</h3>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
              Open source under the MIT license. No paywalls, no page limits, no sign-up.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto mt-24 w-full max-w-6xl scroll-mt-24 px-6">
        <div data-reveal className="bg-ink text-ink-foreground border-ink-foreground/10 rounded-3xl border px-8 py-16 sm:px-14">
          <h2 className="font-display max-w-2xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Your files never leave this tab.
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              ["01", "Drop a file", "Drag it in, paste it, or browse. It loads straight into memory."],
              ["02", "It processes locally", "WebAssembly does the work right here in the tab. Nothing is sent anywhere."],
              ["03", "Download. Done.", "Save the result, or send it straight into another tool."],
            ].map(([n, title, body], i) => (
              <div key={n} data-reveal style={delay(i)}>
                <div className="font-display text-ink-accent text-3xl font-semibold">{n}</div>
                <div className="mt-3 font-semibold">{title}</div>
                <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
