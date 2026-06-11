const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const db = require('./db');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenuBarVisibility(false);
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'shopping-list.db');
  db.init(dbPath);
  createWindow();

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-status', { type: 'available', version: info.version, currentVersion: app.getVersion() });
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-status', { type: 'not-available', version: app.getVersion() });
  });
  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-status', { type: 'progress', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-status', { type: 'downloaded', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-status', { type: 'error', message: err.message });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('db.getItems', async () => db.getItems());
ipcMain.handle('db.addItem', async (event, item) => db.addItem(item));
ipcMain.handle('db.updateItem', async (event, item) => db.updateItem(item));
ipcMain.handle('db.deleteItem', async (event, id) => db.deleteItem(id));
ipcMain.handle('db.getAisleOrder', async () => db.getAisleOrder());
ipcMain.handle('db.setAisleOrder', async (event, aisles) => db.setAisleOrder(aisles));
ipcMain.handle('db.generateList', async (event, ids) => db.generateList(ids));
ipcMain.handle('db.saveWeeklyList', async (event, date, quantities) => db.saveWeeklyList(date, quantities));
ipcMain.handle('db.updateWeeklyList', async (event, id, date, quantities) => db.updateWeeklyList(id, date, quantities));
ipcMain.handle('db.getWeeklyLists', async () => db.getWeeklyLists());
ipcMain.handle('db.getWeeklyList', async (event, id) => db.getWeeklyList(id));
ipcMain.handle('db.deleteWeeklyList', async (event, id) => db.deleteWeeklyList(id));

ipcMain.handle('app.getVersion', () => app.getVersion());

ipcMain.handle('app.checkForUpdates', async () => {
  autoUpdater.checkForUpdates().catch(() => {}); // errors surface via the 'error' event
});

ipcMain.handle('app.installUpdate', async () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('app.print', async (event, htmlContent) => {
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  return new Promise((resolve, reject) => {
    printWindow.webContents.once('did-finish-load', () => {
      printWindow.webContents.print({ printBackground: true }, (success, failureReason) => {
        printWindow.close();
        if (!success) reject(new Error(failureReason || 'Print failed'));
        else resolve(true);
      });
    });
  });
});
