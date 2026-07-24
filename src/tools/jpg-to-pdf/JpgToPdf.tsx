import ToolShell from "../../components/ToolShell";
import { imagesToPdf } from "../../lib/pdf";
import { useToolRun } from "../../lib/useToolRun";

export default function JpgToPdf() {
  const run = useToolRun(
    async (files, read) => {
      const items = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: await read(f) })));
      return [{ name: "images.pdf", data: await imagesToPdf(items) }];
    },
    { accepts: "image" }
  );

  return (
    <ToolShell
      slug="jpg-to-pdf"
      sub="Combine images into one PDF, one image per page, in the order listed."
      verb="Create"
      busy="Building"
      label="Create PDF"
      run={run}
    />
  );
}
