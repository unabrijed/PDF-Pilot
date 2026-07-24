import { useEffect, useState } from "react";
import RectSelect from "../../components/RectSelect";
import ToolShell from "../../components/ToolShell";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { cropPdf, type CropRect } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";
import { useThumbs } from "../../lib/useThumbs";

export default function Crop() {
  const [rect, setRect] = useState<CropRect | null>(null);
  const run = useToolRun(perFile("cropped", (bytes) => cropPdf(bytes, rect!)), {
    guard: () => (rect && rect.w > 0.01 && rect.h > 0.01 ? null : "Drag on the preview to draw a crop area."),
  });

  const file = run.files[0];
  const { thumbs, error: prevErr, loading } = useThumbs(file, 440, [1]);
  const preview = thumbs[0];

  useEffect(() => { setRect(null); }, [file?.id]);

  return (
    <ToolShell
      slug="crop"
      sub="Drag a rectangle on the preview. The same crop (as a fraction of each page) applies to every page and file."
      verb="Crop"
      busy="Cropping"
      run={run}
    >
      {loading && <p className="text-muted-foreground text-sm">Rendering preview…</p>}
      {prevErr && <Alert variant="destructive"><AlertDescription>{prevErr}</AlertDescription></Alert>}
      {preview && (
        <>
          <RectSelect src={preview} rect={rect} onRect={setRect} />
          {rect && rect.w > 0.01 && (
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Keeping {Math.round(rect.w * 100)}% × {Math.round(rect.h * 100)}% of each page</span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setRect(null)}>Reset</Button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  );
}
