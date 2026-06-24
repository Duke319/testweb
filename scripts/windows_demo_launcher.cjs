const { execFile } = require("node:child_process");
const path = require("node:path");
const { loadEnv } = require("../src/env");
const { createApp } = require("../backend/app");

process.env.DB_TYPE = "json";
process.env.WORKER_DATA_SOURCE = "json";
process.env.HOST = "127.0.0.1";

function rootDir() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return path.resolve(__dirname, "..");
}

function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = execFile(command, args, { windowsHide: true });
  child.on("error", (error) => {
    console.error(`Unable to open browser automatically: ${error.message}`);
    console.log(`Open this URL manually: ${url}`);
  });
}

async function main() {
  const appRoot = rootDir();
  loadEnv(appRoot);

  const expressApp = createApp({ rootDir: appRoot });
  const server = expressApp.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}`;
    console.log(`Bosch Performance Demo is running at ${url}`);
    openBrowser(url);
  });

  server.on("error", (error) => {
    console.error(`Failed to start Bosch Performance Demo: ${error.message}`);
    process.exit(1);
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
