import { build as esbuild } from "esbuild";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFile,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageName = "@nemnesia/symbol-nem-wallet-core";
const browserCandidates = ["google-chrome", "chromium", "chromium-browser", "chrome"];

function fail(message) {
  throw new Error(`Release browser integration gate failed: ${message}`);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
}

function cleanRun(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });
}

function allFiles(root, prefix = "") {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(root, entry.name);
    return entry.isDirectory() ? allFiles(absolute, relative) : [relative];
  });
}

function findBrowser() {
  const candidates = process.env.SNWC_BROWSER ? [process.env.SNWC_BROWSER] : browserCandidates;
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    const version = `${probe.stdout ?? ""}${probe.stderr ?? ""}`.split(/\r?\n/, 1)[0].trim();
    if (probe.status === 0 && version.length > 0) return { command: candidate, version };
  }
  fail("a Chromium-compatible browser is unavailable");
}

function packageInstallRoot(tarball) {
  const projectRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-browser-"));
  writeFileSync(
    resolve(projectRoot, "package.json"),
    `${JSON.stringify({ name: "snwc-release-browser-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  run(npmCommand(), [
    "install",
    "--ignore-scripts",
    "--offline",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
    tarball,
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      npm_config_ignore_scripts: "true",
      npm_config_offline: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_cache: resolve(tmpdir(), "snwc-npm-cache"),
    },
  });
  return projectRoot;
}

function browserEntry() {
  return `import * as api from ${JSON.stringify(packageName)};

const store = api.create_empty_store();
const listed = api.list_profiles(store);
const password = new TextEncoder().encode("release browser fixture password");
const prepared = api.prepare_generated_profile(store, password, 1);
const replacement = api.finalize_generated_profile(
  store,
  prepared.value.pending_profile,
  password,
  { status: "confirmed" },
);
let error;
try { api.list_profiles(Uint8Array.of(0)); } catch (value) { error = value; }
if (!Array.isArray(listed.value) || listed.value.length !== 0) throw new Error("empty store operation failed");
if (!(replacement.store instanceof Uint8Array) || replacement.store.length === 0) throw new Error("replacement Store missing");
if (error?.name !== "WalletCoreError" || error?.code !== "InvalidStore" || error?.message !== "InvalidStore") throw new Error("Core error semantics mismatch");
await fetch("/__snwc_report", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    status: "ok",
    operation_success: true,
    replacement_store_success: true,
    core_error: { name: error.name, code: error.code, message: error.message },
  }),
});
`;
}

function writeFixture(root) {
  const sourceRoot = resolve(root, "src");
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(resolve(root, "index.html"), `<!doctype html><meta charset="utf-8"><script type="module" src="/src/main.mjs"></script>`);
  writeFileSync(resolve(sourceRoot, "main.mjs"), browserEntry());
}

function assertOutput(outputRoot, label) {
  const outputFiles = allFiles(outputRoot);
  const wasmFiles = outputFiles.filter((file) => file.endsWith(".wasm"));
  if (wasmFiles.length === 0) fail(`${label} output does not contain a local WASM asset`);
  for (const file of outputFiles) {
    if (!/\.(?:js|mjs|html|json|css)$/.test(file)) continue;
    const content = readFileSync(resolve(outputRoot, file), "utf8");
    if (/https?:\/\//i.test(content)) fail(`${label} output contains a remote URL: ${file}`);
  }
  return { output_file_count: outputFiles.length, local_wasm_assets: wasmFiles.length };
}

async function runBrowser(outputRoot, browser) {
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
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        report = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        reportResolve(report);
        response.writeHead(204);
        response.end();
      } catch {
        reportReject(new Error("browser report was invalid"));
        response.writeHead(400);
        response.end();
      }
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405);
      response.end();
      return;
    }
    const relative = pathname.replace(/^\//, "");
    const path = resolve(outputRoot, relative || "index.html");
    if (!path.startsWith(`${outputRoot}/`) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    const contentType = path.endsWith(".html")
      ? "text/html; charset=utf-8"
      : path.endsWith(".js")
        ? "text/javascript; charset=utf-8"
        : path.endsWith(".wasm")
          ? "application/wasm"
          : "application/octet-stream";
    response.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    response.end(await new Promise((resolveRead, rejectRead) => {
      readFile(path, (error, content) => (error ? rejectRead(error) : resolveRead(content)));
    }));
  });

  let child;
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", resolveListen);
    });
    const address = server.address();
    if (address === null || typeof address === "string") fail("browser server address unavailable");
    const isFirefox = browser.command.toLowerCase().includes("firefox");
    const args = isFirefox
      ? ["--headless", `http://127.0.0.1:${address.port}/`]
      : ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `http://127.0.0.1:${address.port}/`];
    child = spawn(browser.command, args, { stdio: "ignore" });
    const childExit = new Promise((resolveExit, rejectExit) => {
      child.once("exit", resolveExit);
      child.once("error", rejectExit);
    });
    let timeout;
    await Promise.race([
      reportPromise,
      childExit.then(() => { throw new Error("browser exited before report"); }),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("browser timed out")), 30_000); }),
    ]);
    clearTimeout(timeout);
    if (report?.status !== "ok") fail("browser integration operation failed");
    return report;
  } catch (error) {
    throw new Error(`browser runtime failed: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    if (child !== undefined && child.exitCode === null) child.kill("SIGTERM");
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

function bin(name) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return resolve(repositoryRoot, "node_modules", ".bin", `${name}${suffix}`);
}

async function buildBundlers(projectRoot, browser) {
  const fixtureRoot = mkdtempSync(resolve(projectRoot, "release-bundlers-"));
  const results = {};
  try {
    writeFixture(fixtureRoot);
    const viteConfig = resolve(fixtureRoot, "vite.config.mjs");
    writeFileSync(viteConfig, `export default { root: ${JSON.stringify(fixtureRoot)}, build: { outDir: ${JSON.stringify(resolve(fixtureRoot, "vite-dist"))}, emptyOutDir: true, assetsInlineLimit: 0, target: "es2022" }, resolve: { conditions: ["browser", "import", "module", "default"] } };\n`);
    run(bin("vite"), ["build", "--config", viteConfig], { cwd: projectRoot });
    results.vite = { ...assertOutput(resolve(fixtureRoot, "vite-dist"), "Vite"), browser: browser === null ? { status: "skipped" } : await runBrowser(resolve(fixtureRoot, "vite-dist"), browser) };

    const webpackConfig = resolve(fixtureRoot, "webpack.config.cjs");
    writeFileSync(webpackConfig, `const path = require("node:path");\nmodule.exports = { mode: "production", entry: path.resolve(${JSON.stringify(fixtureRoot)}, "src/main.mjs"), output: { path: path.resolve(${JSON.stringify(fixtureRoot)}, "webpack-dist"), filename: "bundle.js", clean: true }, experiments: { topLevelAwait: true }, module: { rules: [{ test: /\\.wasm$/, type: "asset/resource" }] }, resolve: { conditionNames: ["webpack", "browser", "import", "module", "default"], mainFields: ["browser", "module", "main"] } };\n`);
    run(bin("webpack"), ["--config", webpackConfig], { cwd: projectRoot });
    writeFileSync(resolve(fixtureRoot, "webpack-dist/index.html"), `<!doctype html><meta charset="utf-8"><script type="module" src="./bundle.js"></script>`);
    results.webpack5 = { ...assertOutput(resolve(fixtureRoot, "webpack-dist"), "webpack 5"), browser: browser === null ? { status: "skipped" } : await runBrowser(resolve(fixtureRoot, "webpack-dist"), browser) };

    const esbuildRoot = resolve(fixtureRoot, "esbuild-dist");
    await esbuild({
      absWorkingDir: projectRoot,
      entryPoints: [resolve(fixtureRoot, "src/main.mjs")],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      outdir: esbuildRoot,
      loader: { ".wasm": "file" },
      assetNames: "assets/[name]-[hash]",
      legalComments: "none",
      sourcemap: false,
    });
    writeFileSync(resolve(esbuildRoot, "index.html"), `<!doctype html><meta charset="utf-8"><script type="module" src="./main.js"></script>`);
    results.esbuild = { ...assertOutput(esbuildRoot, "esbuild"), browser: browser === null ? { status: "skipped" } : await runBrowser(esbuildRoot, browser) };
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
  return results;
}

function mv3Source() {
  return `import * as api from ${JSON.stringify(packageName)};
const store = api.create_empty_store();
const password = new TextEncoder().encode("release MV3 fixture password");
const prepared = api.prepare_generated_profile(store, password, 1);
const replacement = api.finalize_generated_profile(store, prepared.value.pending_profile, password, { status: "confirmed" });
let error;
try { api.list_profiles(Uint8Array.of(0)); } catch (value) { error = value; }
globalThis.__snwc_mv3_report = {
  status: "ok",
  local_wasm_initialization: true,
  representative_operation: replacement.store instanceof Uint8Array && replacement.store.length > 0,
  core_error: { name: error?.name, code: error?.code, message: error?.message },
};
`;
}

function cdpConnection(wsUrl) {
  if (typeof WebSocket !== "function") fail("Node WebSocket client is unavailable for MV3 smoke");
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined) request.reject(new Error("CDP request failed"));
    else request.resolve(message.result);
  });
  const opened = new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });
  const request = (method, params = {}, sessionId) => {
    const id = ++sequence;
    const promise = new Promise((resolveRequest, rejectRequest) => pending.set(id, { resolve: resolveRequest, reject: rejectRequest }));
    socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    return promise;
  };
  return { socket, opened, request };
}

async function runMv3Browser(extensionRoot, browser) {
  if (!browser.command.toLowerCase().includes("chrome") && !browser.command.toLowerCase().includes("chromium")) {
    fail("MV3 smoke requires Chromium");
  }
  const profileRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-chrome-profile-"));
  let child;
  try {
    child = spawn(browser.command, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions-except=" + extensionRoot,
      "--load-extension=" + extensionRoot,
      "--remote-debugging-port=0",
      "--user-data-dir=" + profileRoot,
      "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    let wsUrl;
    const start = Date.now();
    while (wsUrl === undefined && Date.now() - start < 15_000) {
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match !== null) {
        wsUrl = match[1];
        break;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    if (wsUrl === undefined) fail("Chromium DevTools endpoint was not announced");
    const cdp = cdpConnection(wsUrl);
    await cdp.opened;
    const startTarget = Date.now();
    let report;
    while (report === undefined && Date.now() - startTarget < 30_000) {
      const targets = await cdp.request("Target.getTargets");
      const worker = targets.targetInfos.find((target) => target.type === "service_worker" && target.url.startsWith("chrome-extension://"));
      if (worker !== undefined) {
        try {
          const attached = await cdp.request("Target.attachToTarget", { targetId: worker.targetId, flatten: true });
          const evaluated = await cdp.request("Runtime.evaluate", { expression: "globalThis.__snwc_mv3_report", returnByValue: true }, attached.sessionId);
          report = evaluated?.result?.value;
        } catch {
          // The service worker may be restarting while the extension is initializing.
        }
      }
      if (report === undefined) await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    if (report?.status !== "ok" || report.local_wasm_initialization !== true || report.representative_operation !== true) {
      fail("MV3 service worker did not complete local WASM smoke");
    }
    if (report.core_error?.code !== "InvalidStore") fail("MV3 Core error semantics mismatch");
    return report;
  } finally {
    if (child !== undefined && child.exitCode === null) child.kill("SIGTERM");
    rmSync(profileRoot, { recursive: true, force: true });
  }
}

async function runMv3(projectRoot, browser) {
  const sourceRoot = mkdtempSync(resolve(projectRoot, "release-mv3-source-"));
  const extensionRoot = mkdtempSync(resolve(projectRoot, "release-mv3-extension-"));
  try {
    writeFileSync(resolve(sourceRoot, "service-worker.mjs"), mv3Source());
    await esbuild({
      absWorkingDir: projectRoot,
      entryPoints: [resolve(sourceRoot, "service-worker.mjs")],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      outfile: resolve(extensionRoot, "service-worker.js"),
      loader: { ".wasm": "file" },
      assetNames: "assets/[name]-[hash]",
      legalComments: "none",
      sourcemap: false,
    });
    const manifest = {
      manifest_version: 3,
      name: "Local WASM smoke",
      version: "0.0.0",
      background: { service_worker: "service-worker.js", type: "module" },
      content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" },
    };
    writeFileSync(resolve(extensionRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const generatedFiles = allFiles(extensionRoot);
    const text = generatedFiles.filter((file) => /\.(?:js|json|html)$/.test(file)).map((file) => readFileSync(resolve(extensionRoot, file), "utf8")).join("\n");
    if (!manifest.content_security_policy.extension_pages.includes("wasm-unsafe-eval")) fail("MV3 CSP omits wasm-unsafe-eval");
    if (generatedFiles.filter((file) => file.endsWith(".wasm")).length === 0) fail("MV3 extension has no local WASM asset");
    if (/https?:\/\//i.test(text)) fail("MV3 extension contains a remote URL");
    return {
      local_wasm_asset: true,
      remote_code: false,
      remote_wasm: false,
      csp_wasm_unsafe_eval: true,
      browser: browser === null ? { status: "skipped" } : await runMv3Browser(extensionRoot, browser),
    };
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(extensionRoot, { recursive: true, force: true });
  }
}

const tarball = process.argv[process.argv.indexOf("--tarball") + 1];
if (typeof tarball !== "string" || tarball.length === 0) fail("usage: node scripts/test-npm-bundlers.mjs --tarball <path>");
const browser = process.argv.includes("--skip-browser") ? null : findBrowser();
const projectRoot = packageInstallRoot(resolve(repositoryRoot, tarball));
try {
  const bundlers = await buildBundlers(projectRoot, browser);
  const mv3 = await runMv3(projectRoot, browser);
  process.stdout.write(`${JSON.stringify({ browser, bundlers, mv3 })}\n`);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}
