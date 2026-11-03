import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { compactCapture } from "./observation/compact";

try {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      out: { type: "string" },
      context: { type: "string", default: "1" },
    },
  });
  const context = Number(values.context);
  if (!values.input || !Number.isInteger(context) || context < 0 || context > 5)
    throw new Error("Invalid arguments");
  const out = resolve(
    values.out ??
      join(
        "captures",
        `compact-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
      ),
  );
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  await compactCapture(resolve(values.input), out, context);
  console.log(
    "Saved summary.md, evidence.jsonl, evidence-index.jsonl, events.jsonl and report.md. The source capture is unchanged.",
  );
} catch {
  // JSON/OS errors can contain private file contents or paths. Never echo them.
  console.error(
    "Compaction failed. Use --input <completed-capture.jsonl>, a new writable --out directory and --context <0..5>. Only complete version 1 acquisition captures are supported; no raw error was printed.",
  );
  process.exitCode = 1;
}
