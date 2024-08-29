const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport')
const { fork } = require('node:child_process');
const get_now_str = require('./utils.cjs')

const sqlite3 = require('sqlite3').verbose();
// 打开已有的数据库文件
let database = new sqlite3.Database('./electron/db.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});
// 插入一条记录到指定表中
function insertRecord(table, data) {
  const placeholders = Object.keys(data).map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${placeholders})`;

  database.run(sql, Object.values(data), function(err) {
    if (err) {
      console.error('Failed to insert record:', err.message);
    } else {
      console.log(`Record inserted with rowid ${this.lastID}`);
    }
  });
}

const NODE_ENV = process.env.NODE_ENV;

let mainWindow, serial_process;

async function handleListSerial(event) {
  return await SerialPort.list()
}

function handleConnectSerial(event, params) {
  console.log("handleConnectSerial()", params)
  serial_process = fork('./electron/ota_interface/radio_process.js', [JSON.stringify(params)])
  serial_process.on("message", (message) => {
    console.log("from serial_process:", message)
    switch(message.code) {
      case "init":
        mainWindow.webContents.send('result:serial-connect', message)
        break
      case "in":
        message.date = get_now_str()
        message.direction = "IN"
        mainWindow.webContents.send('serial:received', message)
        delete message.code  // table 'packages' in database has no field 'code'
        insertRecord("packages", message)
        break
    }
    
  })
  serial_process.on("exit", code => {
    console.log(`serial_process exited with code ${code}`)
  })
}

async function handleDisconnectSerial() {
  serial_process.kill()
  return new Promise((resolve, reject) => {
      resolve('Disconnect completed successfully');
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
    if(NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173')
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }
}

app.whenReady().then(() => {
  ipcMain.handle('list_serial', handleListSerial)
  ipcMain.handle('connect_serial', handleConnectSerial)
  ipcMain.handle('disconnect_serial', handleDisconnectSerial)
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

