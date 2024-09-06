const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport')
const { fork } = require('node:child_process');
const { get_now_str, crc16 } = require('./utils.cjs')
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
        // see radio_process.js: from process.send(), message.raw transformed to an object like: { type: 'Buffer', data: [ 18, 52, 86, 120 ] }
        var buffer = Buffer.from(message.raw.data)
        let parsedMsg = parseIncommingPackage(buffer)
        console.log("parseIncommingPackage()", parsedMsg)
        
        insertRecord("packages", parsedMsg)
        // inform rendering process a package is received
        mainWindow.webContents.send('serial:received'/*, message*/)

        // broadcast to termial processes
        parsedMsg.raw = buffer // change from string to Buffer for terminal process
        Object.entries(terminalProcesses).forEach(([deviceId, proc]) => {
          proc.send({
            type: "RF_IN",
            data: parsedMsg
          })
        })
        break
    }

  })
  serial_process.on("exit", code => {
    console.log(`serial_process exited with code ${code}`)
  })
}

let terminalProcesses = {} // like {DEVICE_ID1: proc1, DEVICE_ID2: proc2, ...}
let shortAddr_deviceId_map = {} // like {SHORT_ADDR1: DEVICE_ID1, SHORT_ADDR2: DEVICE_ID2, ... }
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


const DOWNLINK_CMD = {
  0x10: "Down",
  0x20: "Ack",
  0x30: "Query",
  0x50: "RegAccept",
  0x60: "RequireReg"
}

function parseIncommingPackage(buffer) {
  // 将 Buffer 转换为十六进制字符串
  const hexString = buffer.toString("hex");
  // 将十六进制字符串格式化为目标格式
  const formattedString = `Byte[${hexString.length / 2}]=> [ ${hexString.match(/.{1,2}/g).join(' ')} ]`;

  result = {
    date: get_now_str(),
    direction: "IN",
    raw: formattedString,
    bad: false,
    info: "",
  }

  // check length
  if (buffer.length < (6 + 2)) { // at least 6-byte leading plus 2-byte CRC
    result.bad = true
    result.info = "bad length"
    return result
  }

  // check CRC
  const crc = (buffer[buffer.length - 2] << 8) + buffer[buffer.length - 1]
  const calculated_crc = crc16(buffer.slice(0, buffer.length - 2))
  if (crc != calculated_crc) {
    result.bad = true
    result.info = "bad CRC"
    return result
  }

  // check cmd
  let cmd = buffer[0]
  if (!(cmd in DOWNLINK_CMD)) {
    result.bad = true
    result.info = "bad cmd"
    return result
  }
  result.cmd = DOWNLINK_CMD[cmd]

  // parse device_id or short_addr, and frame_seq
  if (result.cmd == "Query" || result.cmd == "RegAccept") {
    result.device_id = (buffer[1] << 24) + (buffer[2] << 16) + (buffer[3] << 8) + buffer[4]
    result.frame_seq = buffer[5]
  } else {
    result.short_addr = (buffer[1] << 8) + buffer[2]
    result.frame_seq = buffer[3]
  }

  return result
}
