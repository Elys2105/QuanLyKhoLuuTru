const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const PROJECT_ROOT = "D:\\archive-management";
const APP_URL = "http://localhost:3000";
const BACKEND_URL = "http://127.0.0.1:8000";

const BACKEND_SCRIPT = path.join(PROJECT_ROOT, "scripts", "start-backend-hidden.ps1");
const FRONTEND_SCRIPT = path.join(PROJECT_ROOT, "scripts", "start-frontend-hidden.ps1");
const LOG_DIR = path.join(PROJECT_ROOT, "logs");

let mainWindow = null;
const childProcesses = [];

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function log(name, text) {
  ensureLogDir();
  fs.appendFileSync(
    path.join(LOG_DIR, `desktop-${name}.log`),
    `[${new Date().toISOString()}] ${text}\r\n`,
    "utf8"
  );
}

function startPowerShellScript(name, scriptPath) {
  if (!fs.existsSync(scriptPath)) {
    log(name, `SCRIPT_NOT_FOUND ${scriptPath}`);
    return;
  }

  log(name, `START ${scriptPath}`);

  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-WindowStyle",
      "Hidden",
      "-File",
      scriptPath,
    ],
    {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      detached: false,
      stdio: "ignore",
    }
  );

  child.on("error", (error) => {
    log(name, `ERROR ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    log(name, `EXIT code=${code} signal=${signal}`);
  });

  childProcesses.push(child);
}

function requestUrl(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForFrontend() {
  for (let i = 0; i < 90; i += 1) {
    const ok = await requestUrl(APP_URL);
    if (ok) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

function waitingHtml(message) {
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QuanLyKhoLuuTru</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
    }
    .box {
      width: 520px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: white;
      padding: 28px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
    }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 8px 0; line-height: 1.5; color: #475569; }
    .small { margin-top: 16px; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="box">
    <h1>QuanLyKhoLuuTru</h1>
    <p>${message}</p>
    <p class="small">Ứng dụng đang chạy backend và frontend local trên máy này.</p>
  </div>
</body>
</html>`;
}

async function loadApp() {
  if (!mainWindow) return;

  await mainWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      waitingHtml("Đang khởi động ứng dụng, vui lòng chờ...")
    )}`
  );

  startPowerShellScript("backend", BACKEND_SCRIPT);
  startPowerShellScript("frontend", FRONTEND_SCRIPT);

  const ready = await waitForFrontend();

  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (ready) {
    await mainWindow.loadURL(`${APP_URL}/login`);
    return;
  }

  await mainWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      waitingHtml("Chưa mở được frontend tại http://localhost:3000. Hãy kiểm tra D:\\archive-management\\logs.")
    )}`
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 1000,
    minHeight: 680,
    show: true,
    title: "QuanLyKhoLuuTru",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL) || url.startsWith(BACKEND_URL)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  loadApp().catch((error) => {
    log("main", `LOAD_APP_ERROR ${error.stack || error.message}`);
  });
}

app.whenReady().then(() => {
  ensureLogDir();
  log("main", "APP_READY");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  log("main", `UNCAUGHT ${error.stack || error.message}`);
});

process.on("unhandledRejection", (error) => {
  log("main", `UNHANDLED ${error && error.stack ? error.stack : String(error)}`);
});