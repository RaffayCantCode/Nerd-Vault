import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local if present
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

console.log("=========================================================");
console.log("       🚀 NERDVAULT V2 -- REINCARNATED LOCAL RUNNER");
console.log("=========================================================\n");

const isWin = process.platform === "win32";
const pnpmCmd = isWin ? "npx.cmd" : "npx";
const pnpmArgs = ["--yes", "pnpm@10.5.2"];

// 1. Start API Server (Port 5000)
console.log("> [API] Starting backend API server on port 5000...");
const apiProcess = spawn(
  pnpmCmd,
  [...pnpmArgs, "--filter", "@workspace/api-server", "run", "dev"],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: "5000",
      NODE_ENV: "development",
    },
    shell: true,
  }
);

apiProcess.stdout.on("data", (data) => {
  const line = data.toString().trim();
  if (line) console.log(`[API] ${line}`);
});

apiProcess.stderr.on("data", (data) => {
  const line = data.toString().trim();
  if (line) console.error(`[API ERROR] ${line}`);
});

// 2. Start Frontend Vite Server (Port 3000)
console.log("> [WEB] Starting frontend Vite server on port 3000...");
const webProcess = spawn(
  pnpmCmd,
  [...pnpmArgs, "--filter", "@workspace/nerdvault", "run", "dev"],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: "3000",
      BASE_PATH: "/",
      API_URL: "http://localhost:5000",
    },
    shell: true,
  }
);

webProcess.stdout.on("data", (data) => {
  const line = data.toString().trim();
  if (line) console.log(`[WEB] ${line}`);
});

webProcess.stderr.on("data", (data) => {
  const line = data.toString().trim();
  if (line) console.error(`[WEB ERROR] ${line}`);
});

// Handle graceful shutdown
const cleanup = () => {
  console.log("\nShutting down NerdVault V2 dev servers...");
  try { apiProcess.kill(); } catch {}
  try { webProcess.kill(); } catch {}
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
