import ToolShell from "../../components/ToolShell";
import { compressPdf } from "../../lib/qpdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function Compress() {
  const run = useToolRun(perFile("compressed", compressPdf));

  return (
    <ToolShell
      slug="compress"
      sub="Light, lossless recompression. Savings vary and already optimized PDFs may not shrink."
      verb="Compress"
      busy="Compressing"
      run={run}
    />
  );
}
