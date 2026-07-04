import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [
  spawn(process.execPath, ["service/server.mjs"], { cwd: appRoot, stdio: "inherit" }),
  spawn("npx", ["vite", "--host", "127.0.0.1", "--port", "5175", "--strictPort"], {
    cwd: appRoot,
    stdio: "inherit"
  })
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code !== 0) {
      stop();
      process.exitCode = code ?? 1;
    }
  });
}
