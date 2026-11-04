import { execFile } from "node:child_process";
import { request } from "node:https";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type HttpResult = { status: number; body?: unknown };

/** External inputs only. Credentials never leave the observation capability. */
export interface LocalIO {
  platform: string;
  processes(): Promise<unknown>;
  get(port: number, path: string, password?: string): Promise<HttpResult>;
  now(): number;
  schedule(run: () => void, milliseconds: number): () => void;
}

export function windowsIO(): LocalIO {
  return {
    platform: process.platform,
    async processes() {
      const powershell = join(
        process.env.SystemRoot ?? "C:\\Windows",
        "System32/WindowsPowerShell/v1.0/powershell.exe",
      );
      const { stdout } = await exec(
        powershell,
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "$ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process -Filter \"Name = 'LeagueClientUx.exe'\" | Select-Object -Property CommandLine)",
        ],
        { windowsHide: true, timeout: 5000, maxBuffer: 256 * 1024 },
      );
      return JSON.parse(stdout.replace(/^\uFEFF/, ""));
    },
    get: getLocalJson,
    now: Date.now,
    schedule(run, milliseconds) {
      const timer = setTimeout(run, milliseconds);
      return () => clearTimeout(timer);
    },
  };
}

/**
 * The destination and method are fixed here. Self-signed TLS is allowed only
 * for this loopback request; no global TLS setting, redirects or proxy env.
 * Failures deliberately carry no raw Node/HTTP error (which can hold secrets).
 */
function getLocalJson(
  port: number,
  path: string,
  password?: string,
): Promise<HttpResult> {
  return new Promise((resolve) => {
    let finished = false;
    const done = (result: HttpResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      resolve(result);
    };
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        rejectUnauthorized: false,
        agent: false,
        headers: {
          Accept: "application/json",
          ...(password
            ? {
                Authorization: `Basic ${Buffer.from(`riot:${password}`).toString("base64")}`,
              }
            : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 4 * 1024 * 1024) {
            done({ status: 0 });
            req.destroy();
          } else {
            chunks.push(chunk);
          }
        });
        response.on("error", () => done({ status: 0 }));
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          // Never expose arbitrary server error messages to the capability.
          if (status !== 200) return done({ status });
          try {
            done({
              status,
              body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            });
          } catch {
            done({ status });
          }
        });
      },
    );
    const deadline = setTimeout(() => {
      done({ status: 0 });
      req.destroy();
    }, 1500);
    req.on("error", () => done({ status: 0 }));
    req.end();
  });
}
