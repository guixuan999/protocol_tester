const { contextBridge, ipcRenderer } = require('electron');

// 在渲染进程中暴露安全的API
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer_on: (channel, listener) => ipcRenderer.on(channel, listener),
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  listSerial: () => ipcRenderer.invoke('list_serial'),
  connectSerial: (params) => ipcRenderer.invoke('connect_serial', params),
  disconnetSerial: () => ipcRenderer.invoke('disconnect_serial'),
  getPackages: (params) => ipcRenderer.invoke('get_packages', params),
  startTerminals: (params) => ipcRenderer.invoke('start_terminals', params),
  stopTerminals: (deviceIDs) => ipcRenderer.invoke('stop_terminals', deviceIDs)
});
