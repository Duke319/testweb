const path = require("node:path");
const { app, BrowserWindow, dialog } = require("electron");

process.env.DB_TYPE = "json";
process.env.WORKER_DATA_SOURCE = "json";
process.env.HOST = "127.0.0.1";

const { loadEnv } = require("../src/env");
const { createApp } = require("../backend/app");

let mainWindow = null;
let server = null;

function getRootDir() {
  return path.resolve(__dirname, "..");
}

async function startServer() {
  const rootDir = getRootDir();
  loadEnv(rootDir);

  return new Promise((resolve, reject) => {
    const expressApp = createApp({ rootDir });
    const pendingServer = expressApp.listen(0, "127.0.0.1");

    pendingServer.once("error", reject);
    pendingServer.once("listening", () => {
      server = pendingServer;
      const address = pendingServer.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function createWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "Bosch 员工绩效系统",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(startUrl);
}

app.whenReady().then(async () => {
  try {
    const startUrl = await startServer();
    createWindow(startUrl);
  } catch (error) {
    dialog.showErrorBox("启动失败", error.stack || error.message || String(error));
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && server) {
    const address = server.address();
    createWindow(`http://127.0.0.1:${address.port}`);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (server) {
    server.close();
    server = null;
  }
});
