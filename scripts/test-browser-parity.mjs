import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { MAX_STDERR_BYTES, runBrowserParity } from "../packages/wallet-core/test/browser-parity.mjs";

const browser = { command: "fixture-browser", version: "fixture-browser 1.0" };
let currentServer;

class FixtureServer extends EventEmitter {
  constructor(handler) {
    super();
    this.handler = handler;
  }

  listen(_port, _host, callback) {
    setImmediate(callback);
  }

  address() {
    return { port: 43123 };
  }

  close(callback) {
    callback();
  }

  async report(value) {
    const body = typeof value === "string" ? value : JSON.stringify(value);
    const request = {
      method: "POST",
      url: "/__snwc_report",
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(body);
      },
    };
    const response = { writeHead() {}, end() {} };
    await this.handler(request, response);
  }
}

function createServerImpl(handler) {
  currentServer = new FixtureServer(handler);
  return currentServer;
}

function fakeChild(action, args) {
  const child = new EventEmitter();
  child.stderr = new PassThrough();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (signal) => {
    child.signalCode = signal;
  };
  setImmediate(() => Promise.resolve(action(args, child)).catch((error) => child.emit("error", error)));
  return child;
}

function spawnFixture(actions) {
  let calls = 0;
  const spawnImpl = (_command, args) => {
    const action = actions[calls];
    calls += 1;
    if (action instanceof Error) throw action;
    return fakeChild(action, args);
  };
  return { spawnImpl, calls: () => calls };
}

async function post(args, value) {
  assert.match(args.at(-1), /^http:\/\/127\.0\.0\.1:/);
  await currentServer.report(value);
}

const notFound = await runBrowserParity({ findBrowserImpl: () => null, timeoutMs: 5 });
assert.equal(notFound.status, "blocked");
assert.equal(notFound.diagnostic.classification, "browser-not-found");

{
  const fixture = spawnFixture([
    new Error("fixture launch failure"),
    (args) => post(args, { status: "ok", result: { value: "pass" } }),
  ]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 50 });
  assert.equal(result.status, "ok");
  assert.equal(fixture.calls(), 2);
}

{
  const fixture = spawnFixture([
    () => {},
    (args) => post(args, { status: "ok", result: { value: "pass" } }),
  ]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 5 });
  assert.equal(result.status, "ok");
  assert.equal(result.attempts.length, 1);
  assert.equal(fixture.calls(), 2);
  assert.equal(result.attempts[0].classification, "browser-timeout");
}

{
  const fixture = spawnFixture([() => {}, () => {}]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 5 });
  assert.equal(result.status, "blocked");
  assert.equal(result.attempts.length, 2);
  assert.deepEqual(result.attempts.map((attempt) => attempt.classification), ["browser-timeout", "browser-timeout"]);
}

{
  const fixture = spawnFixture([(args, child) => {
    child.stderr.write("x".repeat(20_000));
    child.emit("exit", 23, "SIGTERM");
  }]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 50, maxAttempts: 1 });
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostic.classification, "browser-exited-before-report");
  assert.equal(result.diagnostic.exit_code, 23);
  assert.equal(result.diagnostic.signal, "SIGTERM");
  assert.equal(result.diagnostic.stderr.length <= MAX_STDERR_BYTES + 32, true);
  assert.match(result.diagnostic.stderr, /stderr truncated/);
  assert.equal(fixture.calls(), 1);
}

{
  const fixture = spawnFixture([(args) => post(args, { status: "error" }), () => {
    throw new Error("must not retry parity failure");
  }]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 50 });
  assert.equal(result.status, "failed");
  assert.equal(result.diagnostic.classification, "browser-parity-failure");
  assert.equal(fixture.calls(), 1);
}

{
  const fixture = spawnFixture([(args) => post(args, { status: "ok" }), () => {
    throw new Error("must not retry malformed successful report");
  }]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 50 });
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostic.classification, "browser-report-error");
  assert.equal(fixture.calls(), 1);
}

{
  const fixture = spawnFixture([(args) => post(args, "not-json"), () => {
    throw new Error("must not retry malformed report");
  }]);
  const result = await runBrowserParity({ findBrowserImpl: () => browser, spawnImpl: fixture.spawnImpl, createServerImpl, timeoutMs: 50 });
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostic.classification, "browser-report-error");
  assert.equal(fixture.calls(), 1);
}

process.stdout.write("browser parity deterministic observability tests passed\n");
