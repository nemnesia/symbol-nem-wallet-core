import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const packageName = "@nemnesia/symbol-nem-wallet-core";
const browserModule = "/packages/wallet-core/dist/wasm/index.mjs";
const scenarioModule = "/packages/wallet-core/test/parity-scenarios.mjs";
const browserCandidates = ["chromium", "chromium-browser", "google-chrome", "chrome", "firefox"];
const BROWSER_BLOCKED_REASON = "BLOCKED / Browser WASM runtime parity evidence unavailable";
const BROWSER_TIMEOUT_MS = 30_000;
const BROWSER_MAX_ATTEMPTS = 2;
const MAX_STDERR_BYTES = 16 * 1024;

function findBrowser() {
  const candidates = process.env.SNWC_BROWSER ? [process.env.SNWC_BROWSER] : browserCandidates;
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    const version = `${probe.stdout ?? ""}${probe.stderr ?? ""}`
      .split(/\r?\n/, 1)[0]
      .trim();
    if (probe.status === 0 && version.length > 0) {
      return { command: candidate, version };
    }
  }
  return null;
}

function html() {
  const importMap = JSON.stringify({ imports: { [packageName]: browserModule } });
  return `<!doctype html>
<meta charset="utf-8">
<script type="importmap">${importMap}</script>
<script type="module">
  import * as facade from ${JSON.stringify(packageName)};
  import { runParityScenarios } from ${JSON.stringify(scenarioModule)};
  try {
    const result = runParityScenarios(facade);
    await fetch("/__snwc_report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ok", result }),
    });
  } catch {
    await fetch("/__snwc_report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "error" }),
    });
  }
</script>`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function contentType(path) {
  if (path.endsWith(".mjs") || path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".wasm")) return "application/wasm";
  return "application/octet-stream";
}

async function serveStatic(request, response, pathname) {
  const relative = pathname.replace(/^\//, "");
  const path = resolve(repositoryRoot, relative);
  if (!path.startsWith(`${repositoryRoot}/`)) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const content = await readFile(path);
    response.writeHead(200, { "content-type": contentType(path), "cache-control": "no-store" });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end();
  }
}

function boundedStderr(stream) {
  let captured = Buffer.alloc(0);
  if (stream !== undefined && typeof stream.on === "function") {
    stream.on("data", (chunk) => {
      if (captured.length >= MAX_STDERR_BYTES) return;
      const remaining = MAX_STDERR_BYTES - captured.length;
      captured = Buffer.concat([captured, Buffer.from(chunk).subarray(0, remaining)]);
    });
  }
  return () => `${captured.toString("utf8")}${captured.length >= MAX_STDERR_BYTES ? "\n[stderr truncated]" : ""}`;
}

function diagnostic(browser, classification, { child, stderr, exitCode = null, signal = null, timeout = false, reportStatus = null, reportError = null, retryable = false }) {
  return {
    classification,
    browser: { command: browser.command, version: browser.version },
    browser_command: browser.command,
    browser_version: browser.version,
    exit_code: exitCode,
    signal,
    stderr: stderr ?? "",
    timeout,
    report_error: reportError,
    report_status: reportStatus,
    retryable,
    child_exit_code: child?.exitCode ?? exitCode,
    child_signal: child?.signalCode ?? signal,
  };
}

async function runBrowserAttempt({ browser, spawnImpl = spawn, createServerImpl = createServer, timeoutMs = BROWSER_TIMEOUT_MS }) {
  let reportResolve;
  let reportReject;
  const reportPromise = new Promise((resolveReport, rejectReport) => {
    reportResolve = resolveReport;
    reportReject = rejectReport;
  });
  const server = createServerImpl(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "POST" && pathname === "/__snwc_report") {
      try {
        const body = await readRequestBody(request);
        const report = JSON.parse(body);
        response.writeHead(204);
        response.end();
        reportResolve(report);
      } catch {
        response.writeHead(400);
        response.end();
        reportReject({ classification: "browser-report-error", retryable: false, reportError: "browser parity report is malformed" });
      }
      return;
    }
    if (request.method === "GET" && pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(html());
      return;
    }
    if (request.method === "GET") {
      await serveStatic(request, response, pathname);
      return;
    }
    response.writeHead(405);
    response.end();
  });

  let child;
  let stderr = () => "";
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", resolveListen);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("browser parity server address unavailable");
    }
    const browserArgs = browser.command.toLowerCase().endsWith("firefox")
      ? ["--headless", `http://127.0.0.1:${address.port}/`]
      : ["--headless", "--no-sandbox", "--disable-gpu", `http://127.0.0.1:${address.port}/`];
    try {
      child = spawnImpl(browser.command, browserArgs, { stdio: ["ignore", "ignore", "pipe"] });
      stderr = boundedStderr(child.stderr);
    } catch (error) {
      return {
        status: "blocked",
        reason: BROWSER_BLOCKED_REASON,
        diagnostic: diagnostic(browser, "browser-launch-error", { stderr: String(error?.message ?? "browser launch failed"), retryable: true }),
      };
    }
    const childExit = new Promise((resolveExit) => {
      child.once("exit", (exitCode, signal) => resolveExit({ exitCode, signal }));
      child.once("error", (error) => resolveExit({ error }));
    });
    let timeout;
    let outcome;
    try {
      outcome = await Promise.race([
        reportPromise.then((value) => ({ type: "report", value })).catch((error) => ({ type: "report-error", error })),
        childExit.then((value) => ({ type: "exit", value })),
        new Promise((resolveTimeout) => {
          timeout = setTimeout(() => resolveTimeout({ type: "timeout" }), timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    if (outcome.type === "report-error") {
      return {
        status: "blocked",
        reason: BROWSER_BLOCKED_REASON,
        diagnostic: diagnostic(browser, outcome.error.classification ?? "browser-report-error", {
          child,
          stderr: stderr(),
          reportError: outcome.error.reportError ?? "browser parity report transport failed",
          retryable: outcome.error.retryable === true,
        }),
      };
    }
    if (outcome.type === "report") {
      if (outcome.value?.status !== "ok") {
        return {
          status: "failed",
          reason: "Browser WASM parity failure",
          diagnostic: diagnostic(browser, "browser-parity-failure", {
            child,
            stderr: stderr(),
            reportStatus: outcome.value?.status ?? null,
            retryable: false,
          }),
        };
      }
      if (outcome.value.result === undefined) {
        return {
          status: "blocked",
          reason: BROWSER_BLOCKED_REASON,
          diagnostic: diagnostic(browser, "browser-report-error", {
            child,
            stderr: stderr(),
            reportStatus: outcome.value.status,
            reportError: "browser parity report has no result",
            retryable: false,
          }),
        };
      }
      return { status: "ok", browser, result: outcome.value.result };
    }
    if (outcome.type === "timeout") {
      return {
        status: "blocked",
        reason: BROWSER_BLOCKED_REASON,
        diagnostic: diagnostic(browser, "browser-timeout", { child, stderr: stderr(), timeout: true, retryable: true }),
      };
    }
    if (outcome.value.error !== undefined) {
      return {
        status: "blocked",
        reason: BROWSER_BLOCKED_REASON,
        diagnostic: diagnostic(browser, "browser-launch-error", { child, stderr: stderr(), reportError: outcome.value.error.message, retryable: true }),
      };
    }
    return {
      status: "blocked",
      reason: BROWSER_BLOCKED_REASON,
      diagnostic: diagnostic(browser, "browser-exited-before-report", {
        child,
        stderr: stderr(),
        exitCode: outcome.value.exitCode,
        signal: outcome.value.signal,
        retryable: true,
      }),
    };
  } catch (error) {
    return {
      status: "blocked",
      reason: BROWSER_BLOCKED_REASON,
      diagnostic: diagnostic(browser, "browser-launch-error", { child, stderr: stderr(), reportError: error?.message ?? "browser parity setup failed", retryable: true }),
    };
  } finally {
    if (child !== undefined && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

export async function runBrowserParity({ findBrowserImpl = findBrowser, spawnImpl = spawn, createServerImpl = createServer, timeoutMs = BROWSER_TIMEOUT_MS, maxAttempts = BROWSER_MAX_ATTEMPTS } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > BROWSER_MAX_ATTEMPTS) throw new Error("browser parity retry policy is invalid");
  const browser = findBrowserImpl();
  if (browser === null) {
    return {
      status: "blocked",
      reason: BROWSER_BLOCKED_REASON,
      diagnostic: { classification: "browser-not-found", browser: null, browser_command: null, browser_version: null, exit_code: null, signal: null, stderr: "", timeout: false, report_error: null, report_status: null, retryable: false },
      attempts: [],
    };
  }
  const attempts = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runBrowserAttempt({ browser, spawnImpl, createServerImpl, timeoutMs });
    if (result.status === "ok" || result.diagnostic?.classification === "browser-parity-failure" || result.diagnostic?.retryable !== true || attempt === maxAttempts) {
      if (result.diagnostic !== undefined) attempts.push(result.diagnostic);
      return { ...result, attempts: [...attempts] };
    }
    attempts.push(result.diagnostic);
  }
  return { status: "blocked", reason: BROWSER_BLOCKED_REASON, attempts };
}

export {
  BROWSER_BLOCKED_REASON,
  BROWSER_MAX_ATTEMPTS,
  BROWSER_TIMEOUT_MS,
  MAX_STDERR_BYTES,
};
