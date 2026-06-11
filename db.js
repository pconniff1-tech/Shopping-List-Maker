const Database = require('better-sqlite3');

let db;

function init(dbPath) {
  db = new Database(dbPath);

  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      aisle TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  const columns = db.prepare(`PRAGMA table_info(items)`).all();
  const hasAilment = columns.some(c => c.name === 'ailment');
  if (hasAilment) {
    const temp = db.prepare(`ALTER TABLE items RENAME TO items_old`);
    temp.run();

    db.prepare(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        aisle TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();

    db.prepare(`
      INSERT INTO items (id, name, aisle, created_at, updated_at)
      SELECT id, name, aisle, created_at, updated_at FROM items_old
    `).run();

    db.prepare(`DROP TABLE items_old`).run();
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS aisle_order (
      aisle TEXT PRIMARY KEY,
      "order" INTEGER NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS weekly_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item_ids TEXT NOT NULL,
      generated_at TEXT NOT NULL
    )
  `).run();

  const count = db.prepare('SELECT COUNT(*) AS c FROM aisle_order').get().c;
  if (count === 0) {
    const defaultAisles = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Pantry', 'Health', 'Household'];
    const stmt = db.prepare('INSERT INTO aisle_order (aisle, "order") VALUES (?, ?)');
    const insert = db.transaction((aisles) => {
      for (let i = 0; i < aisles.length; i++) {
        stmt.run(aisles[i], i + 1);
      }
    });
    insert(defaultAisles);
  }
}

function addItem(item) {
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO items (name, aisle, created_at, updated_at) VALUES (?, ?, ?, ?)');
  const info = stmt.run(item.name, item.aisle, now, now);
  return getItem(info.lastInsertRowid);
}

function getItem(id) {
  return db.prepare('SELECT * FROM items WHERE id = ?').get(id);
}

function getItems() {
  return db.prepare('SELECT * FROM items ORDER BY name COLLATE NOCASE').all();
}

function updateItem(item) {
  const now = new Date().toISOString();
  db.prepare('UPDATE items SET name = ?, aisle = ?, updated_at = ? WHERE id = ?')
    .run(item.name, item.aisle, now, item.id);
  return getItem(item.id);
}

function deleteItem(id) {
  return db.prepare('DELETE FROM items WHERE id = ?').run(id).changes;
}

function getAisleOrder() {
  return db.prepare('SELECT aisle, "order" AS orderIndex FROM aisle_order ORDER BY "order"').all();
}

function setAisleOrder(aisles) {
  const normalized = aisles.map(a => a.trim()).filter(Boolean);
  const tx = db.transaction((sequence) => {
    db.prepare('DELETE FROM aisle_order').run();
    const stmt = db.prepare('INSERT INTO aisle_order (aisle, "order") VALUES (?, ?)');
    sequence.forEach((aisle, idx) => stmt.run(aisle, idx + 1));
  });
  tx(normalized);
  return getAisleOrder();
}

function generateList(selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return [];
  }

  const placeholders = selectedIds.map(() => '?').join(',');
  const items = db.prepare(`SELECT * FROM items WHERE id IN (${placeholders})`).all(...selectedIds);
  const aisleOrderArr = getAisleOrder();
  const orderMap = {}; aisleOrderArr.forEach((a) => { orderMap[a.aisle] = a.orderIndex; });

  items.sort((a, b) => {
    const ao = orderMap[a.aisle] || 999;
    const bo = orderMap[b.aisle] || 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return items;
}

function saveWeeklyList(date, quantities) {
  const now = new Date().toISOString();
  const json = JSON.stringify(quantities);
  const stmt = db.prepare('INSERT INTO weekly_lists (date, item_ids, generated_at) VALUES (?, ?, ?)');
  const info = stmt.run(date, json, now);
  return getWeeklyList(info.lastInsertRowid);
}

function updateWeeklyList(id, date, quantities) {
  const now = new Date().toISOString();
  const json = JSON.stringify(quantities);
  db.prepare('UPDATE weekly_lists SET date = ?, item_ids = ?, generated_at = ? WHERE id = ?').run(date, json, now, id);
  return getWeeklyList(id);
}

function getWeeklyList(id) {
  return db.prepare('SELECT * FROM weekly_lists WHERE id = ?').get(id);
}

function deleteWeeklyList(id) {
  return db.prepare('DELETE FROM weekly_lists WHERE id = ?').run(id).changes;
}

function getWeeklyLists() {
  return db.prepare('SELECT * FROM weekly_lists ORDER BY generated_at DESC').all();
}

module.exports = {
  init,
  addItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  getAisleOrder,
  setAisleOrder,
  generateList,
  saveWeeklyList,
  updateWeeklyList,
  getWeeklyList,
  getWeeklyLists,
  deleteWeeklyList,
};
