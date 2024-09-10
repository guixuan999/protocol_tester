const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport')
const { fork } = require('node:child_process');
const { get_now_str, crc16 } = require('./utils.cjs')
const { initDatabase, insertRecord, queryRecords } = require("./database.cjs")
const { CMD_NAME_MAP, MacFrame, MacFrameRegRequest } = require("./terminal/mac_frames.cjs");

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
        let frame = MacFrame.from(buffer, gateway_token)
        let record = convert2record("IN", frame, buffer)
        console.log("record", record)

        insertRecord("packages", record)
        // inform rendering process a package is received
        mainWindow.webContents.send('serial:received'/*, message*/)

        // update gateway_token
        if ((frame.cmd == MacFrame.CMD_Query) && (gateway_token === undefined)) {
          gateway_token = frame.gateway_token
        }

        // broadcast to termial process, but no need for bad frame
        if (!record.bad) {
          Object.entries(terminalProcesses).forEach(([deviceId, proc]) => {
            proc.send({
              type: "RF_IN",
              data: frame
            })
          })
        }

        break
    }

  })
  serial_process.on("exit", code => {
    console.log(`serial_process exited with code ${code}`)
  })
}

let terminalProcesses = {} // like {DEVICE_ID1: proc1, DEVICE_ID2: proc2, ...}
let shortAddr_deviceId_map = {} // like {SHORT_ADDR1: DEVICE_ID1, SHORT_ADDR2: DEVICE_ID2, ... }
let gateway_token
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
        proc.on("message", message => {
          console.log(`message from terminal process[dev ${i.device_id}]: `, message)
          if (message.type == "RF_OUT") {
            switch (message.data.cmd) {
              case MacFrame.CMD_RegRequest:
                Object.setPrototypeOf(message.data, MacFrameRegRequest.prototype)
                break
            }

            let buffer = message.data.pack(gateway_token, message.bad_crc)

            let record = convert2record("OUT", message.data, buffer, message.bad_crc)
            console.log("record", record)

            insertRecord("packages", record)
            // inform rendering process a package will be sent
            mainWindow.webContents.send('serial:received'/*, message*/)

            // send to serial process
            serial_process.send({
              type: message.type,
              data: buffer
            })
          }


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


function convert2record(direction, frame, buffer, bad_crc) {
  // 将 Buffer 转换为十六进制字符串
  const hexString = buffer.toString("hex");
  // 将十六进制字符串格式化为目标格式
  const formattedString = `Byte[${hexString.length / 2}]=> [ ${hexString.match(/.{1,2}/g).join(' ')} ]`;

  if(bad_crc) {
    frame.bad = true,
    frame.info = "bad crc"
  }

  return {
    date: get_now_str(),
    direction: direction,
    raw: formattedString,
    bad: frame.bad,
    info: frame.info,
    cmd: CMD_NAME_MAP[frame.cmd],
    device_id: frame.device_id,
    short_addr: frame.short_addr,
    frame_seq: frame.frame_seq
  }
}
