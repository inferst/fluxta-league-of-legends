import { mkdir, open } from "node:fs/promises";
import { release } from "node:os";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { windowsIO } from "./observation/io";
import { LeagueObservation } from "./observation/observation";

async function capture(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      seconds: { type: "string", default: "1200" },
    },
  });
  const seconds = Number(values.seconds);
  if (process.platform !== "win32") throw new Error("Windows is required");
  if (
    !values.out ||
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > 7200
  )
    throw new Error(
      "Usage: pnpm capture --out captures/session.jsonl --seconds 1200 (1..7200)",
    );
  await mkdir(dirname(values.out), { recursive: true });
  const file = await open(values.out, "wx");
  let writes = Promise.resolve();
  let failed = false;
  const write = (value: unknown) => {
    writes = writes
      .then(async () => {
        if (!failed) await file.write(`${JSON.stringify(value)}\n`);
      })
      .catch(() => {
        failed = true;
      });
  };
  write({
    schemaVersion: 1,
    kind: "windows-acquisition",
    synthetic: false,
    capturedAt: new Date().toISOString(),
    windowsRelease: release(),
    nodeVersion: process.version,
    note: "Allowlisted, pseudonymized observations; timing and completeness require runbook assessment.",
  });
  const observation = new LeagueObservation(windowsIO(), () => {}, write);
  let finish!: () => void;
  const stopped = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const timer = setTimeout(finish, seconds * 1000);
  process.once("SIGINT", finish);
  process.once("SIGTERM", finish);
  observation.start();
  console.log(
    "Recording sanitized local observations. Press Ctrl+C to finish.",
  );
  await stopped;
  observation.stop();
  clearTimeout(timer);
  process.removeListener("SIGINT", finish);
  process.removeListener("SIGTERM", finish);
  await writes;
  await file.close();
  if (failed) throw new Error("Capture write failed");
  console.log(
    "Capture saved. Review it using the Windows runbook before sharing.",
  );
}

try {
  await capture();
} catch {
  // Do not print arbitrary OS errors or arguments from a diagnostic command.
  console.error(
    "Capture failed. Run on Windows with --out <new-file.jsonl> and --seconds <1..7200>; check that the output folder is writable.",
  );
  process.exitCode = 1;
}
