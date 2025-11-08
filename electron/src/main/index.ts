import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import sourceMapSupport from 'source-map-support';
import {
  default as electronDevtoolsInstaller,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  sourceMapSupport.install();
}

async function installExtensions() {
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  await electronDevtoolsInstaller([REACT_DEVELOPER_TOOLS], { forceDownload });
}

async function createWindow() {
  const dev = true;// !app.isPackaged;

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

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('ping', () => 'pong');
