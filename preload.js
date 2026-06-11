const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getItems: () => ipcRenderer.invoke('db.getItems'),
  addItem: (item) => ipcRenderer.invoke('db.addItem', item),
  updateItem: (item) => ipcRenderer.invoke('db.updateItem', item),
  deleteItem: (id) => ipcRenderer.invoke('db.deleteItem', id),
  getAisleOrder: () => ipcRenderer.invoke('db.getAisleOrder'),
  setAisleOrder: (aisles) => ipcRenderer.invoke('db.setAisleOrder', aisles),
  generateList: (ids) => ipcRenderer.invoke('db.generateList', ids),
  saveWeeklyList: (date, ids) => ipcRenderer.invoke('db.saveWeeklyList', date, ids),
  updateWeeklyList: (id, date, ids) => ipcRenderer.invoke('db.updateWeeklyList', id, date, ids),
  getWeeklyLists: () => ipcRenderer.invoke('db.getWeeklyLists'),
  getWeeklyList: (id) => ipcRenderer.invoke('db.getWeeklyList', id),
  deleteWeeklyList: (id) => ipcRenderer.invoke('db.deleteWeeklyList', id),
  print: (htmlContent) => ipcRenderer.invoke('app.print', htmlContent),
  getVersion: () => ipcRenderer.invoke('app.getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app.checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('app.installUpdate'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data)),
});
