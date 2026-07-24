import ToolShell from "../../components/ToolShell";
import { repairPdf } from "../../lib/qpdf";
import { salvagePdf } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

// Two engines: qpdf rewrite fixes what it tolerates (shifted offsets, minor damage);
// pdf-lib's lenient sequential parse salvages broken xref/startxref/truncated tails.
async function repair(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    return await repairPdf(bytes);
  } catch {
    return await salvagePdf(bytes);
  }
}

export default function Repair() {
  const run = useToolRun(
    perFile("repaired", repair, (name) => `${name}: couldn't recover this file. Its content may be lost beyond repair.`)
  );

  return (
    <ToolShell
      slug="repair"
      sub="Rebuild a damaged PDF's structure and recover broken cross-reference tables where possible."
      verb="Repair"
      busy="Repairing"
      run={run}
    />
  );
}
