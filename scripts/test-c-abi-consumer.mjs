import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  parseTarGz,
  validateTargetEvidence,
} from "./c-abi-release.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
  throw new Error(`C ABI consumer gate failed: ${message}`);
}

function argument(name, argv) {
  const index = argv.indexOf(name);
  if (index < 0 || argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function run(command, args, cwd) {
  try {
    execFileSync(command, args, { cwd, stdio: "inherit" });
  } catch {
    fail(`${command} failed while validating the C ABI consumer`);
  }
}

function nativeCompiler() {
  if (process.platform === "win32") return process.env.CC ?? "cl.exe";
  return process.env.CC ?? "cc";
}

function staticAndDynamicConsumers(targetId, root, staticPath, dynamicPath, companionPaths) {
  const headerPath = resolve(root, "include");
  const callerPath = resolve(repositoryRoot, "crates/c-abi/tests/caller_runtime.c");
  const headerCompilePath = resolve(repositoryRoot, "crates/c-abi/tests/header_compile.c");
  const compiler = nativeCompiler();
  if (process.platform === "win32") {
    const common = ["/nologo", "/std:c11", "/W4", "/WX", `/I${headerPath}`];
    run(compiler, [...common, "/c", headerCompilePath, `/Fo${resolve(root, "header_compile.obj")}`], repositoryRoot);
    run(compiler, [...common, callerPath, staticPath, "bcrypt.lib", "ntdll.lib", "userenv.lib", "ws2_32.lib", "/link", `/OUT:${resolve(root, "static-consumer.exe")}`], repositoryRoot);
    cpSync(dynamicPath, resolve(root, "symbol_nem_wallet_core_native.dll"));
    const importLibrary = companionPaths[0];
    if (importLibrary === undefined) fail("Windows dynamic import library is missing");
    run(compiler, [...common, callerPath, importLibrary, "bcrypt.lib", "userenv.lib", "ws2_32.lib", "/link", `/OUT:${resolve(root, "dynamic-consumer.exe")}`], repositoryRoot);
    run(resolve(root, "static-consumer.exe"), [], root);
    run(resolve(root, "dynamic-consumer.exe"), [], root);
    return { static: "PASS", dynamic: "PASS" };
  }

  const common = ["-std=c11", "-Wall", "-Wextra", "-Werror", "-I", headerPath];
  run(compiler, [...common, "-fsyntax-only", headerCompilePath], repositoryRoot);
  const systemLibraries = process.platform === "linux" ? ["-ldl", "-lpthread", "-lm"] : ["-lpthread", "-lm"];
  const staticConsumer = resolve(root, "static-consumer");
  run(compiler, [...common, callerPath, staticPath, ...systemLibraries, "-o", staticConsumer], repositoryRoot);
  const dynamicConsumer = resolve(root, "dynamic-consumer");
  const dynamicName = dynamicPath.split("/").pop().replace(/^lib/, "").replace(/\.(?:so|dylib)$/, "");
  const runtimePath = process.platform === "darwin" ? "@loader_path/lib/dynamic" : "$ORIGIN/lib/dynamic";
  const rpath = process.platform === "darwin" ? `-Wl,-rpath,${runtimePath}` : `-Wl,-rpath,${runtimePath}`;
  run(compiler, [...common, callerPath, "-L", dirname(dynamicPath), `-l${dynamicName}`, rpath, ...systemLibraries, "-o", dynamicConsumer], repositoryRoot);
  run(staticConsumer, [], root);
  run(dynamicConsumer, [], root);
  return { static: "PASS", dynamic: "PASS" };
}

function validateArchiveConsumer(targetId, archivePath, evidencePath) {
  if (!existsSync(archivePath) || !existsSync(evidencePath)) fail("C ABI archive or evidence is missing");
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  validateTargetEvidence(evidence, { archivePath, verifyVersionSources: true });
  if (evidence.target_id !== targetId) fail("C ABI consumer target identity mismatch");
  const entries = parseTarGz(readFileSync(archivePath));
  const root = mkdtempSync(resolve(tmpdir(), `snwc-c-abi-consumer-${targetId}-`));
  try {
    for (const [path, bytes] of entries) {
      const destination = resolve(root, path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
    }
    const staticPath = resolve(root, "lib/static", evidence.static_library.filename);
    const dynamicPath = resolve(root, "lib/dynamic", evidence.dynamic_library.filename);
    const companionPaths = evidence.companion_libraries.map((item) => resolve(root, "lib/dynamic", item.filename));
    const result = staticAndDynamicConsumers(targetId, root, staticPath, dynamicPath, companionPaths);
    return result;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCli() {
  const argv = process.argv.slice(2);
  const targetId = argument("--target-id", argv);
  const archivePath = resolve(repositoryRoot, argument("--archive", argv));
  const evidencePath = resolve(repositoryRoot, argument("--evidence", argv));
  const result = validateArchiveConsumer(targetId, archivePath, evidencePath);
  process.stdout.write(`${JSON.stringify({ target_id: targetId, header_compile: "PASS", static_consumer: result.static, dynamic_consumer: result.dynamic })}\n`);
}

export { validateArchiveConsumer };

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
