import { useState } from "react";
import ToolShell from "../../components/ToolShell";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { decryptPdf } from "../../lib/qpdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function Unlock() {
  const [password, setPassword] = useState("");
  const run = useToolRun(perFile("unlocked", (bytes) => decryptPdf(bytes, password)));

  return (
    <ToolShell
      slug="unlock"
      sub="Remove passwords or owner restrictions. Runs in your browser."
      verb="Unlock"
      busy="Unlocking"
      run={run}
    >
      <div className="space-y-2">
        <Label htmlFor="pw">
          Password <span className="text-muted-foreground font-normal">(optional, leave empty for restriction-only PDFs)</span>
        </Label>
        <Input
          id="pw"
          type="password"
          value={password}
          placeholder="Applied to all files"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}
        />
      </div>
    </ToolShell>
  );
}
