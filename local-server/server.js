/**
 * CartAlogue Local Server
 * Runs on the demo laptop. Replaces Firebase for offline demos.
 * Flutter app and POS communicate via REST + Socket.io over the hotspot LAN.
 *
 * Start: npm start   (or: node --experimental-sqlite server.js)
 * Default port: 3000  (set PORT env var to override)
 *
 * Uses Node.js built-in node:sqlite â€” no native compilation needed.
 * Requires Node.js 22+.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Bootstrap
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SQLite setup (built-in node:sqlite â€” no package required)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const db = new DatabaseSync(path.join(__dirname, 'cartalogue.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    barcode     TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    category    TEXT DEFAULT '',
    brand       TEXT DEFAULT '',
    unit_price  REAL NOT NULL,
    is_active   INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id      TEXT PRIMARY KEY,
    device_id       TEXT NOT NULL,
    status          TEXT DEFAULT 'active',
    started_at      TEXT NOT NULL,
    running_total   REAL DEFAULT 0,
    paired_baskets  TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS session_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL,
    barcode       TEXT NOT NULL,
    product_name  TEXT NOT NULL,
    unit_price    REAL NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    subtotal      REAL NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE TABLE IF NOT EXISTS checkout_codes (
    checkout_code TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    status        TEXT DEFAULT 'pending',
    items         TEXT DEFAULT '[]',
    total         REAL DEFAULT 0,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    session_id    TEXT PRIMARY KEY,
    checkout_code TEXT NOT NULL,
    items         TEXT NOT NULL,
    total         REAL NOT NULL,
    amount_paid   REAL NOT NULL,
    change_amount REAL NOT NULL,
    cashier_id    TEXT DEFAULT '',
    completed_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS baskets (
    basket_id          TEXT PRIMARY KEY,
    status             TEXT DEFAULT 'available',
    current_session_id TEXT DEFAULT NULL
  );
`);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Transaction helper (node:sqlite has no built-in .transaction())
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Seed products (runs only once â€” skips if products table already populated)
// unitPrice from Firebase was in centavos â†’ already converted to pesos here
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Seed baskets (runs only once — skips if baskets table already populated)
const basketCountRow = db.prepare('SELECT COUNT(*) as count FROM baskets').get();

if (basketCountRow.count === 0) {
  const insertBasket = db.prepare(
    "INSERT OR IGNORE INTO baskets (basket_id, status) VALUES (:basketId, 'available')"
  );
  withTransaction(() => {
    for (let i = 1; i <= 8; i++) {
      insertBasket.run({ basketId: `BASKET-${String(i).padStart(3, '0')}` });
    }
  });
  console.log('[DB] Seeded 8 baskets (BASKET-001 through BASKET-008).');
} else {
  console.log(`[DB] Baskets table has ${basketCountRow.count} records — skipping seed.`);
}

const productCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get();

if (productCountRow.count === 0) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO products (id, barcode, name, category, brand, unit_price, is_active)
    VALUES (:id, :barcode, :name, :category, :brand, :unitPrice, :isActive)
  `);

  const PRODUCTS = require('./products.json').map(p => ({
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    category: p.category || '',
    brand: p.brand || '',
    unitPrice: p.unitPrice / 100,
    isActive: p.isActive ? 1 : 0,
  }));

  withTransaction(() => {
    for (const p of PRODUCTS) insert.run(p);
  });

  console.log(`[DB] Seeded ${PRODUCTS.length} products from products.json.`);
} else {
  console.log(`[DB] Products table has ${productCountRow.count} records - skipping seed.`);
}
