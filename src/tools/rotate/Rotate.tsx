import { useState } from "react";
import OptionSelect from "../../components/OptionSelect";
import ToolShell from "../../components/ToolShell";
import { rotatePdf } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function Rotate() {
  const [deg, setDeg] = useState("90");
  const run = useToolRun(perFile("rotated", (bytes) => rotatePdf(bytes, Number(deg))));

  return (
    <ToolShell slug="rotate" sub="Rotate all pages. Applies to every file you add." verb="Rotate" busy="Rotating" run={run}>
      <OptionSelect
        label="Rotation"
        value={deg}
        onChange={setDeg}
        options={[
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180°" },
          { value: "270", label: "270° (90° counter-clockwise)" },
        ]}
      />
    </ToolShell>
  );
}
