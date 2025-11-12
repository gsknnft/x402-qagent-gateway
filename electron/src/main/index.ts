import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import sourceMapSupport from 'source-map-support';
import {
  default as electronDevtoolsInstaller,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import agentManager from './agentManager';
import {
  initialiseTelemetryWatcher,
  getTelemetrySnapshot,
  subscribeToTelemetry,
  unsubscribeFromTelemetry,
} from './telemetryService';
import { listPolicies, loadPolicy, savePolicy } from './policyManager';
import { WORKSPACE_ROOT } from './projectPaths';

process.env.QAGENT_TELEMETRY_ROOT = WORKSPACE_ROOT;

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  sourceMapSupport.install();
}

async function installExtensions() {
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  await electronDevtoolsInstaller([REACT_DEVELOPER_TOOLS], { forceDownload });
}

async function createWindow() {
  const dev = !app.isPackaged;

  if (dev) await installExtensions();

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: path.join(process.cwd(), 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      // Disable web security in dev mode for local API calls
      webSecurity: !dev,
    },
  });

  const url = dev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../app/dist/main/index.html')}`;

  await mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => (mainWindow = null));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  new AppUpdater();
}

agentManager.on('state-changed', state => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue;
    window.webContents.send('agents:update', state);
  }
});

ipcMain.handle('agents:list', () => agentManager.listAgents());
ipcMain.handle('agents:start', (_event, id: string) => agentManager.startAgent(id));
ipcMain.handle('agents:stop', (_event, id: string) => agentManager.stopAgent(id));

ipcMain.on('agents:subscribe', event => {
  event.sender.send('agents:update', agentManager.listAgents());
});

ipcMain.handle('policies:list', () => listPolicies());
ipcMain.handle('policies:load', (_event, id: string) => loadPolicy(id));
ipcMain.handle('policies:save', (_event, id: string, content: string) => savePolicy(id, content));

ipcMain.handle('telemetry:get-snapshot', (_event, limit?: number) => getTelemetrySnapshot(limit));
ipcMain.on('telemetry:subscribe', event => {
  subscribeToTelemetry(event.sender);
  void getTelemetrySnapshot().then(snapshot => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('telemetry:update', snapshot);
    }
  });
});

ipcMain.on('telemetry:unsubscribe', event => {
  unsubscribeFromTelemetry(event.sender);
});

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.whenReady().then(() => {
  initialiseTelemetryWatcher();
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const agent of agentManager.listAgents()) {
    if (agent.state === 'running' || agent.state === 'starting') {
      void agentManager.stopAgent(agent.id);
    }
  }
});

ipcMain.handle('ping', () => 'pong');
