const sqlite3 = require('sqlite3').verbose();


// 创建表（如果不存在）
function createTableIfNotExists(tableName, columns) {
    const columnsDefinition = Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(', ');
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsDefinition})`;

    database.run(sql, (err) => {
        if (err) {
            console.error(`Failed to create table ${tableName}:`, err.message);
            process.exit(1);
        } else {
            console.log(`Table ${tableName} is ready.`);
        }
    });
}

// 插入一条记录到指定表中
function insertRecord(table, data) {
    const placeholders = Object.keys(data).map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${placeholders})`;

    database.run(sql, Object.values(data), function (err) {
        if (err) {
            console.error('Failed to insert record:', err.message);
        } else {
            console.log(`Record inserted with rowid ${this.lastID}`);
        }
    });
}

let database;

function initDatabase() {
    // 打开已有的数据库文件
    database = new sqlite3.Database('./database.db', (err) => {
        if (err) {
            console.error('Failed to open database:', err.message);
            process.exit(1);
        }
        console.log('Connected to the SQLite database.');
        createTableIfNotExists('packages', { date: "text", direction: "text", raw: "text" })

    });
}

module.exports = { initDatabase, insertRecord }