import { useState } from "react";
import ToolShell from "../../components/ToolShell";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { encryptPdf } from "../../lib/qpdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function Protect() {
  const [password, setPassword] = useState("");
  const run = useToolRun(perFile("protected", (bytes) => encryptPdf(bytes, password)), {
    guard: () => (password ? null : "Set a password first."),
  });

  return (
    <ToolShell
      slug="protect"
      sub="Add a password and AES-256 encryption. Runs in your browser."
      verb="Protect"
      busy="Protecting"
      run={run}
      disabled={!password}
    >
      <div className="space-y-2">
        <Label htmlFor="pw">
          Password <span className="text-muted-foreground font-normal">(required)</span>
        </Label>
        <Input
          id="pw"
          type="password"
          value={password}
          placeholder="Set a password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}
        />
      </div>
    </ToolShell>
  );
}
