import ToolShell from "../../components/ToolShell";
import { mergePdfs } from "../../lib/pdf";
import { useToolRun } from "../../lib/useToolRun";

export default function Merge() {
  const run = useToolRun(
    async (files, read) => [{ name: "merged.pdf", data: await mergePdfs(await Promise.all(files.map(read))) }],
    { min: 2 }
  );

  return (
    <ToolShell
      slug="merge"
      sub="Combine PDFs into one, in the order listed."
      verb="Merge"
      busy="Merging"
      label="Merge PDFs"
      run={run}
      disabled={run.files.length < 2}
    >
      {run.files.length === 1 && (
        <p className="text-muted-foreground text-sm">Add at least one more PDF to merge.</p>
      )}
    </ToolShell>
  );
}
