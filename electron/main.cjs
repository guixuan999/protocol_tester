const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport')
const { fork } = require('node:child_process');
const get_now_str = require('./utils.cjs')
const { initDatabase, insertRecord, queryRecords } = require("./database.cjs")

const NODE_ENV = process.env.NODE_ENV;

let mainWindow, serial_process;

async function handleListSerial(event) {
  return await SerialPort.list()
}

function handleConnectSerial(event, params) {
  console.log("handleConnectSerial()", params)
  serial_process = fork(`${__dirname}/ota_interface/radio_process.js`, [JSON.stringify(params)])
  serial_process.on("message", (message) => {
    console.log("from serial_process:", message)
    switch (message.code) {
      case "init":
        mainWindow.webContents.send('result:serial-connect', message)
        break
      case "in":
        message.date = get_now_str()
        message.direction = "IN"
        // inform rendering process a package is received
        mainWindow.webContents.send('serial:received'/*, message*/)
        delete message.code  // table 'packages' in database has no field 'code'
        insertRecord("packages", message)
        break
    }

  })
  serial_process.on("exit", code => {
    console.log(`serial_process exited with code ${code}`)
  })
}

let terminalProcesses = {}
function handleStartTerminals(event, params) {
  // params likes
  // [{
  //   "device_id": 1,
  //    "on": [
  //      {
  //        "msg_type": "query",
  //        "ack": true,
  //        "delay_min": 50,
  //        "delay_max": 500,
  //        "delay_rand": false,
  //        "bad_crc": false
  //      }
  //    ]
  // }]

  //console.log("handleStartTerminals()", params)
  for (let i of params) {
    try {
      if (i.device_id in terminalProcesses) {
        // already existing...
        mainWindow.webContents.send('result:start-terminal', {
          device_id: i.device_id,
          result: true,
          info: `terminal device_id ${i.device_id} already exists`
        })
      } else {
        let proc = fork(`${__dirname}/terminal/terminal_process.js`, [JSON.stringify(i)])
        terminalProcesses[i.device_id] = proc
        mainWindow.webContents.send('result:start-terminal', {
          device_id: i.device_id,
          result: true,
          info: `terminal device_id ${i.device_id} created OK`
        })
      }
    } catch (err) {
      mainWindow.webContents.send('result:start-terminal', {
        device_id: i.device_id,
        result: false,
        info: `terminal device_id ${i.device_id} creating failed: ${err.toString()}`
      })
    }
  }
}

function handleStopTerminals(event, deviceIDs) {
  for (let device_id of deviceIDs) {
    if (device_id in terminalProcesses) {
      terminalProcesses[device_id].kill()
      delete terminalProcesses[device_id]
      mainWindow.webContents.send('result:stop-terminal', {
        device_id: device_id,
        result: true,
        info: `terminal device_id ${device_id} destroyed OK`
      })
    } else {
      mainWindow.webContents.send('result:stop-terminal', {
        device_id: device_id,
        result: true,
        info: `terminal device_id ${device_id} do not exist`
      })
    }
  }
}

async function handleDisconnectSerial() {
  serial_process.kill()
  return new Promise((resolve, reject) => {
    resolve('Disconnect completed successfully');
  });
}

async function handleGetPackages(event, params) {
  console.log(params)

  return new Promise((resolve, reject) => {
    resolve(queryRecords("packages", params));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true, // 如果你需要在渲染进程中使用 Node.js API
      contextIsolation: true, // 允许直接访问 Electron 和 Node.js API
    },
  });

  mainWindow.maximize();

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    if (NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173')
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }
}

initDatabase()

app.whenReady().then(() => {
  ipcMain.handle('list_serial', handleListSerial)
  ipcMain.handle('connect_serial', handleConnectSerial)
  ipcMain.handle('disconnect_serial', handleDisconnectSerial)
  ipcMain.handle('get_packages', handleGetPackages)
  ipcMain.handle('start_terminals', handleStartTerminals)
  ipcMain.handle('stop_terminals', handleStopTerminals)
  createWindow()
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

