import { useState } from "react";
import OptionSelect from "../../components/OptionSelect";
import ToolShell from "../../components/ToolShell";
import { pdfToImages } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import type { NamedBytes } from "../../lib/zip";

export default function PdfToJpg() {
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const run = useToolRun(async (files, read, setProgress) => {
    const out: NamedBytes[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(i + 1);
      out.push(...(await pdfToImages(await read(files[i]), stem(files[i].name), { format, scale: 2, quality: 0.92 })));
    }
    return out;
  });

  return (
    <ToolShell
      slug="pdf-to-jpg"
      sub="Turn each page into an image. Multiple pages download as a .zip."
      verb="Convert"
      busy="Rendering"
      label="PDF to images"
      run={run}
    >
      <OptionSelect
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "jpg", label: "JPG" },
          { value: "png", label: "PNG" },
        ]}
      />
    </ToolShell>
  );
}
