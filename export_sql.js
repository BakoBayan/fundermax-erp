const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'warehouse.db');
const outPath = path.join(process.cwd(), 'data', 'warehouse_dump.sql');

if (!fs.existsSync(dbPath)) {
  console.log('Database file not found at:', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

let sqlDump = '-- ========================================================\n';
sqlDump += '-- BAKO\'S PANEL MANAGER - SQL DATABASE EXPORT\n';
sqlDump += '-- Generated: ' + new Date().toISOString() + '\n';
sqlDump += '-- Database: ' + dbPath + '\n';
sqlDump += '-- ========================================================\n\n';

// Get all tables
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;").all();

for (const table of tables) {
  sqlDump += '-- --------------------------------------------------------\n';
  sqlDump += '-- Table structure for: ' + table.name + '\n';
  sqlDump += '-- --------------------------------------------------------\n';
  sqlDump += table.sql + ';\n\n';
  
  const rows = db.prepare("SELECT * FROM " + table.name).all();
  if (rows.length > 0) {
    sqlDump += '-- Data for table: ' + table.name + ' (' + rows.length + ' rows)\n';
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map(c => {
        const val = row[c];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        return "'" + String(val).replace(/'/g, "''") + "'";
      });
      sqlDump += 'INSERT INTO ' + table.name + ' (' + cols.join(', ') + ') VALUES (' + vals.join(', ') + ');\n';
    }
    sqlDump += '\n';
  }
}

fs.writeFileSync(outPath, sqlDump, 'utf8');
console.log('Successfully created SQL dump at:', outPath);
console.log('Tables exported:', tables.map(t => t.name).join(', '));
