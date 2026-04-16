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

const productCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get();

if (productCountRow.count === 0) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO products (id, barcode, name, category, brand, unit_price, is_active)
    VALUES (:id, :barcode, :name, :category, :brand, :unitPrice, :isActive)
  `);

  const PRODUCTS = [
    { id: 'PRODUCT-0010', barcode: '4800014101016', name: 'Safeguard White Bar Soap 135g',        category: 'Personal Care',       brand: '',       unitPrice: 58.00,  isActive: 1 },
    { id: 'PRODUCT-0003', barcode: '4800016013025', name: 'Sky Flakes Crackers 250g',             category: 'Biscuits & Crackers', brand: '',       unitPrice: 35.00,  isActive: 1 },
    { id: 'PRODUCT-0004', barcode: '4800016034808', name: 'SkyFlakes Cream Crackers 100g',        category: 'Biscuits & Crackers', brand: '',       unitPrice: 18.00,  isActive: 1 },
    { id: 'PRODUCT-0008', barcode: '4800033280037', name: 'Milo Activ-Go 300g',                   category: 'Powdered Beverages',  brand: '',       unitPrice: 135.00, isActive: 1 },
    { id: 'PRODUCT-0009', barcode: '4800055122125', name: 'Bear Brand Adult Plus 300g',           category: 'Powdered Beverages',  brand: '',       unitPrice: 150.00, isActive: 1 },
    { id: 'PRODUCT-0013', barcode: '4800112501032', name: "Lady's Choice Real Mayonnaise 220ml",  category: 'Condiments & Cooking',brand: '',       unitPrice: 95.00,  isActive: 1 },
    { id: 'PRODUCT-0006', barcode: '4800116461038', name: 'C2 Cool & Clean Apple 500ml',          category: 'Beverages',           brand: '',       unitPrice: 22.00,  isActive: 1 },
    { id: 'PRODUCT-0007', barcode: '4800116461052', name: 'C2 Cool & Clean Green Tea 500ml',      category: 'Beverages',           brand: '',       unitPrice: 22.00,  isActive: 1 },
    { id: 'PRODUCT-0015', barcode: '4800156000048', name: 'UFC Banana Ketchup 320g',              category: 'Condiments & Cooking',brand: '',       unitPrice: 45.00,  isActive: 1 },
    { id: 'PRODUCT-0014', barcode: '4800888301036', name: 'Silver Swan Soy Sauce 350ml',          category: 'Condiments & Cooking',brand: '',       unitPrice: 38.00,  isActive: 1 },
    { id: 'PRODUCT-0011', barcode: '6901028098518', name: 'Kopiko Black Instant Coffee 10s',      category: 'Coffee',              brand: '',       unitPrice: 75.00,  isActive: 1 },
    { id: 'PRODUCT-0012', barcode: '8850140000055', name: "Mama Sita's Adobo Mix 25g",            category: 'Condiments & Cooking',brand: '',       unitPrice: 12.00,  isActive: 1 },
    { id: 'PRODUCT-0005', barcode: '8850461034028', name: 'Chippy Barbecue Corn Chips 110g',      category: 'Snacks',              brand: '',       unitPrice: 42.00,  isActive: 1 },
    { id: 'PRODUCT-0001', barcode: '8850999032273', name: 'Lucky Me Pancit Canton Original',      category: 'Instant Noodles',     brand: '',       unitPrice: 15.00,  isActive: 1 },
    { id: 'PRODUCT-0002', barcode: '8850999032280', name: 'Lucky Me Pancit Canton Chili Mansi',   category: 'Instant Noodles',     brand: '',       unitPrice: 15.00,  isActive: 1 },
    { id: 'PRODUCT-0016', barcode: '8888888000001', name: 'Test Product Alpha 50g',               category: 'Test',                brand: '',       unitPrice: 25.00,  isActive: 1 },
    { id: 'PRODUCT-0017', barcode: '8888888000002', name: 'Test Product Beta 100g',               category: 'Test',                brand: '',       unitPrice: 50.00,  isActive: 1 },
    { id: 'PRODUCT-0018', barcode: '8888888000003', name: 'Test Product Gamma 250g',              category: 'Test',                brand: '',       unitPrice: 99.00,  isActive: 1 },
    { id: 'PRODUCT-0050', barcode: '4800016560392', name: 'Pasta Express',                        category: 'Instant Spagetti',    brand: 'Nissin', unitPrice: 15.00,  isActive: 1 },
  ];

  withTransaction(() => {
    for (const p of PRODUCTS) insert.run(p);
  });

  console.log(`[DB] Seeded ${PRODUCTS.length} products from Firebase catalog.`);
} else {
  console.log(`[DB] Products table has ${productCountRow.count} records â€” skipping seed.`);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Formatters
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtProduct(p) {
  return {
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    category: p.category,
    brand: p.brand,
    unitPrice: p.unit_price,
    isActive: Boolean(p.is_active),
  };
}

function fmtSessionBase(s) {
  return {
    sessionId: s.session_id,
    deviceId: s.device_id,
    status: s.status,
    startedAt: s.started_at,
    runningTotal: s.running_total,
    pairedBaskets: JSON.parse(s.paired_baskets || '[]'),
  };
}

function fmtSessionFull(s, items) {
  return {
    ...fmtSessionBase(s),
    items: items.map((i) => ({
      barcode: i.barcode,
      productName: i.product_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  };
}

function fmtTransaction(t) {
  return {
    sessionId: t.session_id,
    checkoutCode: t.checkout_code,
    items: JSON.parse(t.items || '[]'),
    total: t.total,
    amountPaid: t.amount_paid,
    change: t.change_amount,
    cashierId: t.cashier_id,
    completedAt: t.completed_at,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Routes â€” Health
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'CartAlogue Local Server', timestamp: new Date().toISOString() });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Routes â€” Products
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name').all();
  res.json(rows.map(fmtProduct));
});

app.get('/products/barcode/:barcode', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE barcode = :barcode AND is_active = 1')
    .get({ barcode: req.params.barcode });
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(fmtProduct(row));
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Routes â€” Sessions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/sessions/active', (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM sessions WHERE status IN ('active','checkout_pending') ORDER BY started_at DESC"
  ).all();
  res.json(rows.map(fmtSessionBase));
});

app.get('/sessions/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE session_id = :id')
    .get({ id: req.params.sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const items = db.prepare('SELECT * FROM session_items WHERE session_id = :id')
    .all({ id: req.params.sessionId });
  res.json(fmtSessionFull(session, items));
});

app.post('/sessions', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
  const sessionId = uuidv4();
  db.prepare(
    "INSERT INTO sessions (session_id, device_id, status, started_at) VALUES (:sessionId, :deviceId, 'active', :startedAt)"
  ).run({ sessionId, deviceId, startedAt: new Date().toISOString() });
  res.json({ sessionId });
});

app.patch('/sessions/:sessionId/end', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE session_id = :id')
    .get({ id: req.params.sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  db.prepare("UPDATE sessions SET status = 'completed' WHERE session_id = :id")
    .run({ id: req.params.sessionId });
  io.to(req.params.sessionId).emit('session_ended', { sessionId: req.params.sessionId });
  res.json({ success: true });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Routes â€” Checkout
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/checkout/:checkoutCode', (req, res) => {
  const code = db.prepare('SELECT * FROM checkout_codes WHERE checkout_code = :code')
    .get({ code: req.params.checkoutCode.toUpperCase() });
  if (!code) return res.status(404).json({ error: 'Checkout code not found' });
  res.json({
    checkoutCode: code.checkout_code,
    sessionId: code.session_id,
    status: code.status,
    items: JSON.parse(code.items || '[]'),
    total: code.total,
    createdAt: code.created_at,
  });
});

app.post('/checkout', (req, res) => {
  const { sessionId, checkoutCode } = req.body;
  if (!sessionId || !checkoutCode) {
    return res.status(400).json({ error: 'sessionId and checkoutCode are required' });
  }
  const normalized = checkoutCode.toUpperCase();
  const existing = db.prepare('SELECT 1 FROM checkout_codes WHERE checkout_code = :code')
    .get({ code: normalized });
  if (!existing) return res.status(404).json({ error: 'Checkout code not found' });
  db.prepare("UPDATE checkout_codes SET status = 'processing' WHERE checkout_code = :code")
    .run({ code: normalized });
  res.json({ success: true });
});

app.patch('/checkout/:checkoutCode/complete', (req, res) => {
  const { cashierId, amountPaid } = req.body;
  const normalized = req.params.checkoutCode.toUpperCase();

  const code = db.prepare('SELECT * FROM checkout_codes WHERE checkout_code = :code')
    .get({ code: normalized });
  if (!code) return res.status(404).json({ error: 'Checkout code not found' });

  const items = JSON.parse(code.items || '[]');
  const total = code.total;
  const change = amountPaid - total;
  const completedAt = new Date().toISOString();

  withTransaction(() => {
    db.prepare(`
      INSERT OR REPLACE INTO transactions
        (session_id, checkout_code, items, total, amount_paid, change_amount, cashier_id, completed_at)
      VALUES (:sessionId, :checkoutCode, :items, :total, :amountPaid, :change, :cashierId, :completedAt)
    `).run({
      sessionId: code.session_id,
      checkoutCode: normalized,
      items: code.items,
      total,
      amountPaid,
      change,
      cashierId: cashierId || '',
      completedAt,
    });

    db.prepare("UPDATE sessions SET status = 'completed' WHERE session_id = :id")
      .run({ id: code.session_id });
    db.prepare("UPDATE checkout_codes SET status = 'completed' WHERE checkout_code = :code")
      .run({ code: normalized });
  });

  const receipt = {
    sessionId: code.session_id,
    checkoutCode: normalized,
    items,
    total,
    amountPaid,
    change,
    cashierId: cashierId || '',
    completedAt,
  };

  // Notify the Flutter app (which is in the session room)
  io.to(code.session_id).emit('checkout_complete', receipt);

  res.json({ receipt });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Routes â€” History
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY completed_at DESC').all();
  res.json(rows.map(fmtTransaction));
});

app.get('/history/:sessionId', (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE session_id = :id')
    .get({ id: req.params.sessionId });
  if (!row) return res.status(404).json({ error: 'Transaction not found' });
  res.json(fmtTransaction(row));
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Socket.io
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // POS and Flutter app both call this to subscribe to session-specific events
  socket.on('join_session', ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);
    console.log(`[Socket] ${socket.id} joined room: ${sessionId}`);
  });

  // Flutter app emits this when customer taps "Checkout"
  // Server stores the code and broadcasts to ALL clients so POS always receives it
  socket.on('checkout_requested', (data) => {
    const { sessionId, checkoutCode, items, total } = data;
    if (!sessionId || !checkoutCode) return;

    const normalized = checkoutCode.toUpperCase();

    db.prepare(`
      INSERT OR REPLACE INTO checkout_codes
        (checkout_code, session_id, status, items, total, created_at)
      VALUES (:checkoutCode, :sessionId, 'pending', :items, :total, :createdAt)
    `).run({
      checkoutCode: normalized,
      sessionId,
      items: JSON.stringify(items || []),
      total: total || 0,
      createdAt: new Date().toISOString(),
    });

    db.prepare("UPDATE sessions SET status = 'checkout_pending' WHERE session_id = :id")
      .run({ id: sessionId });

    const payload = { sessionId, checkoutCode: normalized, items: items || [], total: total || 0 };

    // Broadcast to ALL sockets so POS always receives it even before joining the room
    io.emit('checkout_requested', payload);
    console.log(`[Checkout] Broadcasted checkout_requested â€” code: ${normalized}, session: ${sessionId}`);
  });

  // Flutter app emits when a barcode is scanned into basket
  socket.on('item_added', (data) => {
    const { sessionId, barcode, productName, unitPrice, quantity, subtotal, runningTotal } = data;
    if (!sessionId) return;

    const existing = db.prepare('SELECT id FROM session_items WHERE session_id = :sid AND barcode = :bc')
      .get({ sid: sessionId, bc: barcode });

    if (existing) {
      db.prepare('UPDATE session_items SET quantity = :qty, subtotal = :sub WHERE session_id = :sid AND barcode = :bc')
        .run({ qty: quantity, sub: subtotal, sid: sessionId, bc: barcode });
    } else {
      db.prepare('INSERT INTO session_items (session_id, barcode, product_name, unit_price, quantity, subtotal) VALUES (:sid, :bc, :name, :price, :qty, :sub)')
        .run({ sid: sessionId, bc: barcode, name: productName, price: unitPrice, qty: quantity, sub: subtotal });
    }

    db.prepare('UPDATE sessions SET running_total = :total WHERE session_id = :id')
      .run({ total: runningTotal, id: sessionId });

    io.to(sessionId).emit('item_added', data);
  });

  // Flutter app emits when an item is removed from basket
  socket.on('item_removed', (data) => {
    const { sessionId, barcode, quantity, runningTotal } = data;
    if (!sessionId) return;

    if (quantity <= 0) {
      db.prepare('DELETE FROM session_items WHERE session_id = :sid AND barcode = :bc')
        .run({ sid: sessionId, bc: barcode });
    } else {
      const item = db.prepare('SELECT unit_price FROM session_items WHERE session_id = :sid AND barcode = :bc')
        .get({ sid: sessionId, bc: barcode });
      if (item) {
        db.prepare('UPDATE session_items SET quantity = :qty, subtotal = :sub WHERE session_id = :sid AND barcode = :bc')
          .run({ qty: quantity, sub: parseFloat((item.unit_price * quantity).toFixed(2)), sid: sessionId, bc: barcode });
      }
    }

    db.prepare('UPDATE sessions SET running_total = :total WHERE session_id = :id')
      .run({ total: runningTotal, id: sessionId });

    io.to(sessionId).emit('item_removed', data);
  });

  // POS emits this after payment (relay to Flutter app in the session room)
  socket.on('checkout_complete', (data) => {
    console.log(`[Socket] checkout_complete from POS:`, data);
    if (data.sessionId) {
      io.to(data.sessionId).emit('checkout_complete', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Start
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  CartAlogue Local Server');
  console.log(`  Listening on http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('  To find your laptop IP (for POS and Flutter app settings):');
  console.log('  Run: ipconfig   â†’  look for the IPv4 Address of your hotspot adapter');
  console.log('  Then set server URL to:  http://<your-ip>:' + PORT);
  console.log('');
});
