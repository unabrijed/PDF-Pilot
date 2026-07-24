import { useState } from "react";
import OptionSelect from "../../components/OptionSelect";
import ToolShell from "../../components/ToolShell";
import { addPageNumbers, type NumberFormat, type NumberPosition } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function PageNumbers() {
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const run = useToolRun(perFile("numbered", (bytes) => addPageNumbers(bytes, { position, format })));

  return (
    <ToolShell
      slug="page-numbers"
      sub="Stamp page numbers onto every page."
      verb="Number"
      busy="Numbering"
      label="Add page numbers"
      run={run}
    >
      <OptionSelect
        label="Position"
        value={position}
        onChange={setPosition}
        options={[
          { value: "bottom-center", label: "Bottom center" },
          { value: "bottom-right", label: "Bottom right" },
          { value: "bottom-left", label: "Bottom left" },
        ]}
      />
      <OptionSelect
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "n", label: "1" },
          { value: "n/N", label: "1 / N" },
          { value: "page", label: "Page 1" },
        ]}
      />
    </ToolShell>
  );
}
