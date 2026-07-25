import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_PACKAGE = "cn.next2048.app.debug";
const DEFAULT_ACTIVITY = "cn.next2048.app.MainActivity";

export function parseActivityStartOutput(output) {
  const status = /^Status:\s*(\S+)/mu.exec(output)?.[1];
  if (status !== "ok") throw new Error(`android_activity_start_failed: ${status ?? "missing"}`);
  const totalTimeMs = Number.parseInt(/^TotalTime:\s*(\d+)/mu.exec(output)?.[1] ?? "", 10);
  return {
    launchState: /^LaunchState:\s*(\S+)/mu.exec(output)?.[1] ?? "unknown",
    totalTimeMs: Number.isFinite(totalTimeMs) ? totalTimeMs : null,
  };
}

export function boardChanged(before, after) {
  return before.length === after.length && before.some((value, index) => value !== after[index]);
}

function parseArgs(argv) {
  const values = new Map(
    argv
      .filter((argument) => argument.startsWith("--") && argument.includes("="))
      .map((argument) => {
        const separator = argument.indexOf("=");
        return [argument.slice(2, separator), argument.slice(separator + 1)];
      }),
  );
  return {
    apk: values.get("apk"),
    apiLevel: values.get("api-level") ?? "unknown",
    packageName: values.get("package") ?? DEFAULT_PACKAGE,
    activity: values.get("activity") ?? DEFAULT_ACTIVITY,
  };
}

function adbBinary() {
  return process.env.ANDROID_HOME
    ? path.join(process.env.ANDROID_HOME, "platform-tools", "adb")
    : "adb";
}

async function run(file, args, timeout = 120_000) {
  try {
    return await execFileAsync(file, args, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout,
    });
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
    throw new Error(`${path.basename(file)} ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`, {
      cause: error,
    });
  }
}

async function adb(...args) {
  return (await run(adbBinary(), args)).stdout.trim();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(action, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await action();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`android_smoke_timeout:${label}`, { cause: lastError });
}

class CdpClient {
  #socket;
  #sequence = 0;
  #pending = new Map();

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpClient(socket);
  }

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.#sequence;
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`cdp_timeout:${method}`));
      }, 15_000);
      this.#pending.set(id, { resolve, reject, timer });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result?.value;
  }

  close() {
    this.#socket.close();
  }
}

async function connectWebView(packageName) {
  const pid = await waitFor(async () => {
    const value = await adb("shell", "pidof", packageName);
    return /^\d+$/u.test(value) ? value : null;
  }, "pid");
  const port = Number.parseInt(
    await adb("forward", "tcp:0", `localabstract:webview_devtools_remote_${pid}`),
    10,
  );
  assert(Number.isInteger(port) && port > 0, "android_devtools_forward_failed");
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${String(port)}/json`);
    if (!response.ok) return null;
    const targets = await response.json();
    return targets.find((candidate) => candidate.type === "page") ?? null;
  }, "webview-target");
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  return {
    client,
    pid,
    target,
    async close() {
      client.close();
      await adb("forward", "--remove", `tcp:${String(port)}`).catch(() => undefined);
    },
  };
}

async function waitForRoute(session, route) {
  return waitFor(async () => {
    const current = await session.client.evaluate(
      "document.querySelector('[data-app-shell]')?.dataset.appRoute ?? null",
    );
    return current === route ? current : null;
  }, `route-${route}`);
}

async function waitForAppReady(session) {
  return waitFor(async () => {
    const ready = await session.client.evaluate(
      "document.querySelector('#app')?.getAttribute('aria-busy') !== 'true'",
    );
    return ready === true ? true : null;
  }, "app-ready");
}

async function click(session, selector) {
  const clicked = await session.client.evaluate(
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true; })()`,
  );
  assert.equal(clicked, true, `android_smoke_missing_element:${selector}`);
}

async function readBoard(session) {
  return session.client.evaluate(`(() => {
    const board = document.querySelector('[data-game-board-root]');
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    return {
      values: [...board.querySelectorAll('[data-board-tile]')].map((tile) => Number(tile.dataset.value)),
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  })()`);
}

async function moveBoard(session, initial) {
  const description = JSON.parse(session.target.description || "{}");
  const scaleX = Number(description.width) / initial.innerWidth;
  const scaleY = Number(description.height) / initial.innerHeight;
  const offsetY = Number(description.screenY) || 0;
  assert(Number.isFinite(scaleX) && Number.isFinite(scaleY), "android_board_scale_invalid");
  const centerX = Math.round((initial.rect.left + initial.rect.width / 2) * scaleX);
  const centerY = Math.round(offsetY + (initial.rect.top + initial.rect.height / 2) * scaleY);
  const distanceX = Math.round(initial.rect.width * scaleX * 0.3);
  const distanceY = Math.round(initial.rect.height * scaleY * 0.3);
  const destinations = [
    [centerX - distanceX, centerY],
    [centerX, centerY - distanceY],
    [centerX + distanceX, centerY],
    [centerX, centerY + distanceY],
  ];
  for (const [endX, endY] of destinations) {
    await adb(
      "shell",
      "input",
      "swipe",
      String(centerX),
      String(centerY),
      String(endX),
      String(endY),
      "120",
    );
    await delay(350);
    const current = await readBoard(session);
    if (current && boardChanged(initial.values, current.values)) return current;
  }
  throw new Error("android_board_did_not_move");
}

async function startActivity(packageName, activity) {
  return parseActivityStartOutput(
    await adb("shell", "am", "start", "-W", "-n", `${packageName}/${activity}`),
  );
}

async function runSmoke(options) {
  assert(options.apk, "--apk is required");
  const apk = path.resolve(options.apk);
  await adb("install", "-r", apk);
  await adb("shell", "pm", "clear", options.packageName);
  await adb("shell", "svc", "wifi", "disable");
  await adb("shell", "svc", "data", "disable");
  await adb("shell", "am", "force-stop", options.packageName);
  const coldStart = await startActivity(options.packageName, options.activity);

  let session;
  try {
    session = await connectWebView(options.packageName);
    await waitForRoute(session, "privacy");
    await waitForAppReady(session);
    await click(session, "[data-consent='offline']");
    await waitForRoute(session, "home");
    await click(session, "[data-home-primary]");
    await waitForRoute(session, "game");
    const initialBoard = await waitFor(() => readBoard(session), "initial-board");
    const movedBoard = await moveBoard(session, initialBoard);

    await adb("shell", "input", "keyevent", "3");
    await delay(300);
    const warmStart = await startActivity(options.packageName, options.activity);
    await waitForRoute(session, "game");
    const resumedBoard = await readBoard(session);
    assert.deepEqual(resumedBoard?.values, movedBoard.values, "android_background_resume_changed_board");

    await session.close();
    session = undefined;
    await adb("shell", "am", "force-stop", options.packageName);
    const processRestart = await startActivity(options.packageName, options.activity);
    session = await connectWebView(options.packageName);
    await waitForRoute(session, "home");
    await waitForAppReady(session);
    await click(session, "[data-home-primary]");
    await waitForRoute(session, "game");
    const restoredBoard = await readBoard(session);
    assert.deepEqual(restoredBoard?.values, movedBoard.values, "android_process_restart_changed_board");
    const externalResources = await session.client.evaluate(
      "performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => !name.startsWith('https://localhost/'))",
    );
    assert.deepEqual(externalResources, [], "android_offline_smoke_loaded_external_resource");

    return {
      success: true,
      apiLevel: options.apiLevel,
      packageName: options.packageName,
      coldStart,
      warmStart,
      processRestart,
      movedBoard: movedBoard.values,
      externalResources,
    };
  } finally {
    await session?.close().catch(() => undefined);
  }
}

async function writeReport(apiLevel, report) {
  const output = path.resolve("artifacts", `android-emulator-smoke-api-${apiLevel}.json`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  return output;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const report = await runSmoke(options);
    const output = await writeReport(options.apiLevel, report);
    console.log(`[android-emulator-smoke] PASS api=${options.apiLevel} report=${output}`);
  } catch (error) {
    const report = {
      success: false,
      apiLevel: options.apiLevel,
      error: error instanceof Error ? error.stack || error.message : String(error),
    };
    const output = await writeReport(options.apiLevel, report);
    console.error(`[android-emulator-smoke] FAIL api=${options.apiLevel} report=${output}`);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
