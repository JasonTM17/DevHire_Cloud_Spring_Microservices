import { spawn } from "node:child_process";
import { cp, rm, stat } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const mode = (process.argv[2] ?? "all").toLowerCase();
const host = process.env.E2E_PREVIEW_HOST ?? "127.0.0.1";
const port = process.env.E2E_PREVIEW_PORT ?? String(await findAvailablePort(3001));
const baseUrl = `http://${host}:${port}`;
const isWindows = process.platform === "win32";
const npm = "npm";
const npx = "npx";
const standaloneDir = path.join(cwd, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

const previewEnv = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:65534",
  E2E_FRONTEND_URL: process.env.E2E_FRONTEND_URL ?? baseUrl
};

function canListen(portToCheck) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(Number(portToCheck), host);
  });
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate <= start + 98; candidate += 1) {
    if (await canListen(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free preview port found from ${start} to ${start + 98}`);
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(source, destination) {
  if (!(await pathExists(source))) {
    return;
  }

  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}

async function prepareStandalonePreview() {
  if (!(await pathExists(standaloneServer))) {
    throw new Error(`Next standalone server was not generated: ${standaloneServer}`);
  }

  await copyIfExists(path.join(cwd, ".next", "static"), path.join(standaloneDir, ".next", "static"));
  await copyIfExists(path.join(cwd, "public"), path.join(standaloneDir, "public"));
}

function quoteForCmd(value) {
  if (/^[A-Za-z0-9_@./:=-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function spawnCommand(command, args, options) {
  if (!isWindows) {
    return spawn(command, args, options);
  }

  return spawn("cmd.exe", ["/d", "/s", "/c", [command, ...args].map(quoteForCmd).join(" ")], options);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      cwd,
      env: previewEnv,
      stdio: "inherit",
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

function waitForChildExit(child, timeoutMs = 5000) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => cleanup(), timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", cleanup);
      child.off("close", cleanup);
      resolve();
    };

    child.once("exit", cleanup);
    child.once("close", cleanup);
  });
}

async function waitForPreview(server) {
  let serverExited = false;
  server.once("exit", () => {
    serverExited = true;
  });

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (serverExited) {
      throw new Error("Next.js preview server exited before /jobs became available.");
    }

    try {
      const response = await fetch(`${baseUrl}/jobs`, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // Preview is still starting.
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${baseUrl}/jobs`);
}

async function stopServer(server) {
  if (!server.pid || server.exitCode !== null) {
    return;
  }

  if (isWindows) {
    server.stdout?.removeAllListeners();
    server.stderr?.removeAllListeners();
    server.stdout?.destroy();
    server.stderr?.destroy();
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore"
      });
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        killer.removeAllListeners();
        resolve();
      };
      const timeout = setTimeout(finish, 5000);
      killer.once("exit", finish);
      killer.once("error", finish);
      killer.once("close", finish);
    });
    if (server.exitCode === null && !server.killed) {
      server.kill();
    }
    await waitForChildExit(server);
    server.removeAllListeners();
    return;
  }

  server.kill("SIGTERM");
  await waitForChildExit(server, 1000);
  if (server.exitCode === null) {
    server.kill("SIGKILL");
    await waitForChildExit(server);
  }
  server.removeAllListeners();
}

if (!["desktop", "mobile", "all", "stitch", "code-assessment"].includes(mode)) {
  throw new Error(`Unsupported E2E preview mode '${mode}'. Use desktop, mobile, stitch, code-assessment, or all.`);
}

console.log(`[e2e-preview] Building frontend for ${baseUrl}`);
await run(npm, ["run", "build"]);
await prepareStandalonePreview();

console.log("[e2e-preview] Starting Next.js standalone preview server");
const server = spawnCommand("node", ["server.js"], {
  cwd: standaloneDir,
  env: {
    ...previewEnv,
    HOSTNAME: host,
    PORT: port
  },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

try {
  await waitForPreview(server);
  console.log(`[e2e-preview] Preview ready at ${baseUrl}`);

  if (mode === "desktop" || mode === "all") {
    await run(npx, [
      "playwright",
      "test",
      "e2e/devhire-smoke.spec.ts",
      "e2e/code-assessment-flow.spec.ts",
      "e2e/assistant-smoke.spec.ts",
      "e2e/stitch-route-matrix.spec.ts",
      "--project=chromium"
    ]);
  }

  if (mode === "stitch") {
    await run(npx, [
      "playwright",
      "test",
      "e2e/stitch-route-matrix.spec.ts",
      "--project=chromium"
    ]);
  }

  if (mode === "code-assessment") {
    await run(npx, [
      "playwright",
      "test",
      "e2e/code-assessment-flow.spec.ts",
      "--project=chromium"
    ]);
  }

  if (mode === "mobile" || mode === "all") {
    await run(npx, [
      "playwright",
      "test",
      "e2e/mobile-smoke.spec.ts",
      "--project=mobile-chrome"
    ]);
  }
} finally {
  console.log("[e2e-preview] Stopping preview server");
  await stopServer(server);
}

process.exit(0);
