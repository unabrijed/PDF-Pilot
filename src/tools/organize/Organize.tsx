import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ToolShell from "../../components/ToolShell";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { rebuildPdf } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import { useThumbs } from "../../lib/useThumbs";

// ponytail: works on the first staged PDF only; per-page rotate and multi-file
// organize wait until someone actually asks for them.
export default function Organize() {
  const [order, setOrder] = useState<number[]>([]);
  const dragFrom = useRef(-1);

  const run = useToolRun(
    async (files, read) => [
      { name: `${stem(files[0].name)}-organized.pdf`, data: await rebuildPdf(await read(files[0]), order) },
    ],
    { guard: () => (order.length ? null : "Keep at least one page.") }
  );

  const file = run.files[0];
  const { thumbs, error: thumbErr, loading } = useThumbs(file);

  useEffect(() => { setOrder(thumbs.map((_, i) => i)); }, [thumbs]);

  const move = (from: number, to: number) => {
    if (from < 0 || from === to) return;
    setOrder((o) => { const n = [...o]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
  };
  const untouched = order.length === thumbs.length && order.every((p, i) => p === i);

  return (
    <ToolShell
      slug="organize"
      sub="Drag pages to reorder, ✕ to delete, then apply."
      verb="Apply"
      busy="Applying"
      label="Apply changes"
      run={run}
      disabled={!thumbs.length}
    >
      {run.files.length > 1 && (
        <p className="text-muted-foreground text-sm">
          Organize works on the first staged PDF. Remove the others or run it once per file.
        </p>
      )}
      {loading && <p className="text-muted-foreground text-sm">Rendering pages…</p>}
      {thumbErr && <Alert variant="destructive"><AlertDescription>{thumbErr}</AlertDescription></Alert>}

      {thumbs.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3.5">
            {order.map((p, idx) => (
              <figure
                key={p}
                className="surface relative m-0 cursor-grab p-2 text-center active:cursor-grabbing"
                draggable
                onDragStart={() => { dragFrom.current = idx; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { move(dragFrom.current, idx); dragFrom.current = -1; }}
              >
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="bg-card hover:text-destructive hover:border-destructive absolute -top-2 -right-2 rounded-full"
                  onClick={() => setOrder((o) => o.filter((_, i) => i !== idx))}
                  aria-label={`Delete page ${p + 1}`}
                >
                  <X />
                </Button>
                <img src={thumbs[p]} alt={`Page ${p + 1}`} draggable={false} className="block w-full rounded border bg-white" />
                <figcaption className="text-muted-foreground pt-1.5 text-xs">{p + 1}</figcaption>
              </figure>
            ))}
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>{order.length} of {thumbs.length} pages kept</span>
            {!untouched && (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOrder(thumbs.map((_, i) => i))}>
                Reset
              </Button>
            )}
          </div>
        </>
      )}
    </ToolShell>
  );
}
