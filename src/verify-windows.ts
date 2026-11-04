import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { compactCapture } from "./observation/compact";

async function command(
  executable: string,
  args: string[],
  visible = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: visible ? "inherit" : ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      // Diagnostic commands are bounded; never include their raw errors.
      if (output.length < 1024 * 1024) output += chunk.toString("utf8");
    });
    child.on("error", () => reject(new Error("Command could not start")));
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error("Command did not complete successfully"));
    });
  });
}

async function summarize(input: string, out: string): Promise<void> {
  await compactCapture(input, out);
}

async function verify(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      seconds: { type: "string", default: "3600" },
      "capture-only": { type: "boolean", default: false },
      input: { type: "string" },
    },
  });
  const seconds = Number(values.seconds);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 7200)
    throw new Error("--seconds must be an integer from 1 to 7200.");
  if (!values.input && process.platform !== "win32")
    throw new Error("Live verification requires Windows.");
  const out = resolve(
    values.out ??
      join(
        "captures",
        `windows-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
      ),
  );
  await mkdir(dirname(out), { recursive: true });
  // A session always gets a fresh directory; never mix or overwrite evidence.
  await mkdir(out);
  if (values.input) {
    await summarize(resolve(values.input), out);
    console.log(
      "Capture compacted: start with summary.md and evidence-index.jsonl. Public Fluxta and visual checks remain pending.",
    );
    return;
  }

  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("Start this runner with pnpm verify:windows.");
  const session: Record<string, unknown> = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    windowsRelease: release(),
    nodeVersion: process.version,
    checks: "not-run",
    host: "not-run",
    capture: "not-run",
    failedStage: null,
  };
  let stage = "preparation";
  try {
    const commit = (await command("git", ["rev-parse", "HEAD"])).trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit))
      throw new Error("Cannot identify commit");
    session.testedCommit = commit;
    session.dirty =
      (await command("git", ["status", "--porcelain"])).trim() !== "";
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
      packageManager: string;
    };
    session.packageManager = pkg.packageManager;
    stage = "checks";
    console.log("Running pnpm check before collecting evidence...");
    await command(
      /\.[cm]?js$/i.test(pnpm) ? process.execPath : pnpm,
      /\.[cm]?js$/i.test(pnpm) ? [pnpm, "check"] : ["check"],
      true,
    );
    session.checks = "passed";
    if (!values["capture-only"]) {
      stage = "host";
      const cli = resolve("node_modules/@fluxta/cli/bin/run.js");
      console.log("Linking the build and starting the plugin in Fluxta...");
      await command(process.execPath, [
        cli,
        "link",
        "dist/league-of-legends",
        "--json",
      ]);
      await command(process.execPath, [cli, "restart"]);
      session.host =
        "plugin-running; Sources/External Connections not inspected";
    } else {
      session.host = "skipped by --capture-only";
    }
    stage = "capture";
    console.log(
      "Now follow the runbook: open League, sign in/out, restart it and play the required queues. Record manual UTC action times.",
    );
    const input = join(out, "capture.jsonl");
    // Both processes receive console Ctrl+C. Keep the parent alive while the
    // collector flushes its complete lines, then build the partial report.
    const interrupted = () => {};
    process.on("SIGINT", interrupted);
    try {
      await command(
        process.execPath,
        [
          "dist/league-of-legends/capture.mjs",
          "--out",
          input,
          "--seconds",
          String(seconds),
        ],
        true,
      );
    } finally {
      process.removeListener("SIGINT", interrupted);
    }
    session.capture = "completed";
    stage = "report";
    await summarize(input, out);
    console.log(
      "Session saved with capture.jsonl, session.json, summary.md, evidence.jsonl, evidence-index.jsonl, events.jsonl and report.md. Review before sharing; manual checks remain pending.",
    );
  } catch {
    session.failedStage = stage;
    throw new Error(
      `Windows verification stopped at ${stage}. See session.json. For host failures, start Fluxta >=0.9.0 and retry with a new output directory; --capture-only explicitly skips the host. Existing captures can be summarized with --input <capture.jsonl>.`,
    );
  } finally {
    session.finishedAt = new Date().toISOString();
    await writeFile(
      join(out, "session.json"),
      `${JSON.stringify(session, null, 2)}\n`,
      { flag: "wx" },
    );
  }
}

try {
  await verify();
} catch (error) {
  // Only our fixed messages are suitable for a diagnostic console. In
  // particular, filesystem/JSON/child-process errors may contain private data.
  const message =
    error instanceof Error &&
    (error.message.startsWith("Windows verification stopped at ") ||
      error.message === "Live verification requires Windows." ||
      error.message === "--seconds must be an integer from 1 to 7200." ||
      error.message === "Start this runner with pnpm verify:windows.")
      ? error.message
      : "Verification failed. Use a new writable --out directory and a complete version 1 JSONL capture for --input; no raw error was printed.";
  console.error(message);
  process.exitCode = 1;
}
