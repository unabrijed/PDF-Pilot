import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, FileArchive, FileText, Image } from "lucide-react";
import { tools } from "../tools/registry";
import { toWorkFiles, useWorkspace } from "../workspace";
import { zipBlob, type NamedBytes } from "../lib/zip";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

const mimeOf = (it: NamedBytes) => it.mime ?? "application/pdf";

export default function ResultsActions({ items, currentSlug }: { items: NamedBytes[]; currentSlug: string }) {
  const { setFiles } = useWorkspace();
  const navigate = useNavigate();

  // Only offer tools that accept what this tool produced.
  const produces = tools.find((t) => t.slug === currentSlug)?.produces ?? "pdf";
  const nexts = tools.filter((t) => t.status === "ready" && t.slug !== currentSlug && t.accepts === produces);

  function continueIn(slug: string) {
    setFiles(toWorkFiles(items.map((it) => ({ name: it.name, data: it.data }))));
    navigate(`/${slug}`);
  }

  return (
    <div className="bg-card mt-6 rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-success flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4" />
          {items.length} file{items.length > 1 ? "s" : ""} ready
        </strong>
        {items.length > 1 && (
          <Button size="sm" onClick={() => download(zipBlob(items), "pdfpilot-results.zip")}>
            <FileArchive /> Download all (.zip)
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((it, i) => {
          const Icon = mimeOf(it).startsWith("image/") ? Image : FileText;
          return (
            <li key={i} className="bg-background flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{it.name}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => download(new Blob([new Uint8Array(it.data)], { type: mimeOf(it) }), it.name)}
              >
                <Download /> Download
              </Button>
            </li>
          );
        })}
      </ul>

      {nexts.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Continue in:</span>
            {nexts.map((t) => {
              const Icon = t.icon;
              return (
                <Button key={t.slug} variant="outline" size="sm" className="rounded-full" onClick={() => continueIn(t.slug)}>
                  <Icon /> {t.title}
                </Button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
