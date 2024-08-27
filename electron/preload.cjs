const { contextBridge, ipcRenderer } = require('electron');

// 在渲染进程中暴露安全的API
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});
