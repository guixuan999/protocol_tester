const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

let database;

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

function runAsync(sql, params) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID }); // 使用 this 访问 lastID
            }
        });
    });
}

// 插入一条记录到指定表中
async function insertRecord(table, data) {
    const placeholders = Object.keys(data).map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${placeholders})`;

    //const run = promisify(database.run.bind(database));
    // above line: await run(...) will return nothing
    // so we promisify database.run() as runAsync()
    try {
        const r = await runAsync(sql, Object.values(data))
        console.log(`Record inserted with rowid ${r.lastID}`);
    } catch (err) {
        console.error('Failed to insert record:', err.message);
    }
}

async function queryRecords(table, conditions) {
    let page = 0, pagesize = 0
    if ('page' in conditions && 'pagesize' in conditions) {
        page = conditions.page
        pagesize = conditions.pagesize
        delete conditions.page
        delete conditions.pagesize
    }

    let sql
    let total = 0
    sql = `SELECT COUNT(*) AS total FROM ${table}`
    const get = promisify(database.get.bind(database));
    total = (await get(sql, [])).total
    let total_pages = 0
    if (page && pagesize) {
        total_pages = Math.ceil(total / pagesize)
        if (page > total_pages) page = total_pages
        let offset = (page - 1) * pagesize
        sql = `SELECT * FROM ${table} ORDER BY date DESC LIMIT ${pagesize} OFFSET ${offset}`
    } else {
        sql = `SELECT * FROM ${table} ORDER BY date DESC`
    }

    let records = []
    const all = promisify(database.all.bind(database));
    try {
        records = await all(sql, [])
    } catch(err) {
        console.log('Faile to query:', err.message)
    }
    
    return {
        total_pages,
        rows: records
    }
}

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

module.exports = { initDatabase, insertRecord, queryRecords }