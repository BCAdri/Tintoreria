const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

function getDb() {
  const db = new Database(path.resolve(process.env.DB_PATH || './tintoreria.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'owner' CHECK(role IN ('owner','staff')),
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      address    TEXT,
      phone      TEXT,
      tax_id     TEXT,
      city       TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_stores (
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      role       TEXT    NOT NULL DEFAULT 'staff' CHECK(role IN ('owner','staff')),
      PRIMARY KEY (user_id, store_id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      phone      TEXT,
      email      TEXT,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS garment_types (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name            TEXT    NOT NULL,
      price           REAL    NOT NULL DEFAULT 0,
      turnaround_days INTEGER NOT NULL DEFAULT 3,
      active          INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id       INTEGER NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
      client_id      INTEGER NOT NULL REFERENCES clients(id),
      status         TEXT    NOT NULL DEFAULT 'received'
                     CHECK(status IN ('received','processing','ready','delivered')),
      total          REAL    NOT NULL DEFAULT 0,
      notes          TEXT,
      pickup_date    TEXT,
      delivered_at   TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      garment_type_id INTEGER REFERENCES garment_types(id),
      description     TEXT    NOT NULL,
      qty             INTEGER NOT NULL DEFAULT 1,
      unit_price      REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      store_id   INTEGER NOT NULL REFERENCES stores(id),
      amount     REAL    NOT NULL,
      method     TEXT    NOT NULL DEFAULT 'cash'
                 CHECK(method IN ('cash','card','bizum')),
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_store   ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_client  ON orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_clients_store  ON clients(store_id);
    CREATE INDEX IF NOT EXISTS idx_payments_store ON payments(store_id);
  `);

  console.log('Database ready');
  db.close();
}

module.exports = { getDb, initDb };

if (require.main === module) initDb();
