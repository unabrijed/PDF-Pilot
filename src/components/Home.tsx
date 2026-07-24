import { Link } from "react-router-dom";
import { tools } from "../tools/registry";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export default function Home() {
  return (
    <section>
      <div className="relative pt-7 pb-11 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-80 max-w-2xl rounded-full bg-[image:var(--gradient)] opacity-15 blur-[90px]"
        />
        <span className="bg-card text-muted-foreground inline-block rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase">
          Free · Private · In your browser
        </span>
        <h1 className="mt-5 text-5xl leading-none font-semibold sm:text-6xl lg:text-7xl">
          Every PDF tool,
          <br />
          <span className="bg-[image:var(--gradient)] bg-clip-text text-transparent">connected.</span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md">
          Every file stays on your device. Nothing is uploaded.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {tools.map((t) => {
          const Icon = t.icon;
          const inner = (
            <>
              <span className="bg-[image:var(--gradient-soft)] text-primary flex size-14 items-center justify-center rounded-2xl">
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-semibold">{t.title}</span>
              {t.status === "soon" && (
                <Badge variant="secondary" className="absolute top-2.5 right-2.5 text-[10px] uppercase">soon</Badge>
              )}
            </>
          );
          const cls = "bg-card relative flex flex-col items-center gap-3.5 rounded-2xl border px-4 py-7 text-center transition-all";
          return t.status === "ready" ? (
            <Link key={t.slug} to={`/${t.slug}`} className={cn(cls, "hover:border-transparent hover:-translate-y-1 hover:shadow-lg")}>
              {inner}
            </Link>
          ) : (
            <div key={t.slug} className={cn(cls, "opacity-50")}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
