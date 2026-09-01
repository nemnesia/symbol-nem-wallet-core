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

function findBrowser() {
  const candidates = process.env.SNWC_BROWSER ? [process.env.SNWC_BROWSER] : browserCandidates;
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    if (probe.status === 0) {
      return candidate;
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

export async function runBrowserParity() {
  const browser = findBrowser();
  if (browser === null) {
    return { status: "blocked", reason: "BLOCKED / Browser WASM runtime parity evidence unavailable" };
  }

  let report;
  let reportResolve;
  let reportReject;
  const reportPromise = new Promise((resolveReport, rejectReport) => {
    reportResolve = resolveReport;
    reportReject = rejectReport;
  });
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "POST" && pathname === "/__snwc_report") {
      try {
        report = JSON.parse(await readRequestBody(request));
        reportResolve(report);
        response.writeHead(204);
        response.end();
      } catch {
        reportReject(new Error("browser parity report failed"));
        response.writeHead(400);
        response.end();
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
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", resolveListen);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("browser parity server address unavailable");
    }
    const browserArgs = browser.toLowerCase().endsWith("firefox")
      ? ["--headless", `http://127.0.0.1:${address.port}/`]
      : ["--headless", "--no-sandbox", "--disable-gpu", `http://127.0.0.1:${address.port}/`];
    child = spawn(browser, browserArgs, { stdio: "ignore" });
    const childExit = new Promise((resolveExit) => child.once("exit", resolveExit));
    await Promise.race([
      reportPromise,
      childExit.then(() => {
        throw new Error("browser parity runtime exited before report");
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("browser parity runtime timed out")), 30_000)),
    ]);
    if (report?.status !== "ok" || report.result === undefined) {
      throw new Error("browser parity scenario failed");
    }
    return { status: "ok", result: report.result };
  } finally {
    if (child !== undefined && child.exitCode === null) {
      child.kill("SIGTERM");
    }
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}
