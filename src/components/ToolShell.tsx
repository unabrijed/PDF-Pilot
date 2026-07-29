import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import FileStaging from "./FileStaging";
import ResultsActions from "./ResultsActions";
import ToolHeader from "./ToolHeader";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { toolBySlug } from "../tools/registry";
import type { RunApi } from "../lib/useToolRun";
import { cn } from "../lib/utils";

/**
 * The frame every tool page shares: heading, dropzone, its own options, the run
 * button with progress, errors, and results. Title, icon and accepted file type
 * come from the registry, so a tool page only describes what makes it different.
 */
export default function ToolShell({
  slug, sub, verb, busy, label, run, disabled, wide, children,
}: {
  slug: string;
  sub?: string;         // defaults to the registry description
  verb: string;         // "Unlock" → "Unlock PDF" / "Unlock 3 PDFs"
  busy: string;         // "Unlocking" → "Unlocking 2/3…"
  label?: string;       // full override when the verb pattern doesn't fit
  run: RunApi;
  disabled?: boolean;   // extra precondition on top of "has files" and "not running"
  wide?: boolean;
  children?: ReactNode; // options and previews, between the dropzone and the button
}) {
  const tool = toolBySlug(slug)!;
  const { files, running, progress, error, outputs, start } = run;
  const n = files.length;
  const noun = tool.accepts === "image" ? "image" : "PDF";

  const idleLabel = label ?? (n > 1 ? `${verb} ${n} ${noun}s` : `${verb} ${noun}`);
  const busyLabel = n > 1 && progress ? `${busy} ${progress}/${n}…` : `${busy}…`;

  return (
    <section className={cn("mx-auto w-full px-6 pt-10 pb-16", wide ? "max-w-4xl" : "max-w-2xl")}>
      <ToolHeader slug={slug} sub={sub} />

      <FileStaging accepts={tool.accepts} />

      {children && <div className="mt-6 space-y-5">{children}</div>}

      <Button size="lg" className="mt-6 w-full rounded-full" disabled={!n || running || disabled} onClick={start}>
        {running && <Loader2 className="animate-spin" />}
        {running ? busyLabel : idleLabel}
      </Button>

      {running && n > 1 && <Progress value={(progress / n) * 100} className="mt-3 h-1" />}

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertTriangle />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug={slug} />}
    </section>
  );
}
