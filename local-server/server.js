/**
 * CartAlogue Local Server
 * Runs on the demo laptop. Replaces Firebase for offline demos.
 * Flutter app and POS communicate via REST + Socket.io over the hotspot LAN.
 *
 * Start: npm start   (or: node --experimental-sqlite server.js)
 * Default port: 3000  (set PORT env var to override)
 *
 * Uses Node.js built-in node:sqlite – no native compilation needed.
 * Requires Node.js 22+.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SQLite setup (built-in node:sqlite – no package required)
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Transaction helper (node:sqlite has no built-in .transaction())
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Seed products (runs only once – skips if products table already populated)
// unitPrice from Firebase was in centavos → already converted to pesos here
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// API Endpoints
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Health check endpoint (used by POS settings page to verify server is running).
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CartAlogue Local Server is running' });
});

/**
 * GET /checkout/:code
 * Fetch checkout details for a specific checkout code.
 */
app.get('/checkout/:code', (req, res) => {
  const code = req.params.code.toUpperCase();

  try {
    const checkoutRow = db
      .prepare('SELECT * FROM checkout_codes WHERE checkout_code = ?')
      .get(code);

    if (!checkoutRow) {
      return res.status(404).json({ error: `Checkout code "${code}" not found.` });
    }

    const sessionRow = db
      .prepare('SELECT * FROM sessions WHERE session_id = ?')
      .get(checkoutRow.session_id);

    const itemRows = db
      .prepare('SELECT * FROM session_items WHERE session_id = ?')
      .all(checkoutRow.session_id);

    const items = itemRows.map(row => ({
      productName: row.product_name,
      barcode: row.barcode,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      subtotal: row.subtotal,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    res.json({
      sessionId: checkoutRow.session_id,
      checkoutCode: code,
      status: checkoutRow.status,
      items,
      total,
    });
  } catch (err) {
    console.error('[GET /checkout/:code]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/products/upload
 * Upload new products to the database.
 * Accepts an array of products with: name, barcode, price, category (optional), brand (optional)
 */
app.post('/api/products/upload', (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Products array is required and cannot be empty' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO products (id, barcode, name, category, brand, unit_price, is_active)
      VALUES (:id, :barcode, :name, :category, :brand, :unitPrice, :isActive)
    `);

    let uploadedCount = 0;

    withTransaction(() => {
      for (const product of products) {
        // Validate required fields
        if (!product.name || !product.barcode || product.price === undefined) {
          throw new Error('Each product must have name, barcode, and price');
        }

        if (typeof product.price !== 'number' || product.price <= 0) {
          throw new Error(`Invalid price for product "${product.name}"`);
        }

        try {
          insert.run({
            id: `PRODUCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            barcode: product.barcode.toString().trim(),
            name: product.name.toString().trim(),
            category: (product.category || '').toString().trim(),
            brand: (product.brand || '').toString().trim(),
            unitPrice: parseFloat(product.price),
            isActive: 1,
          });
          uploadedCount++;
        } catch (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error(`Barcode "${product.barcode}" already exists in the database`);
          }
          throw err;
        }
      }
    });

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedCount} product(s)`,
      count: uploadedCount,
    });
  } catch (err) {
    console.error('[POST /api/products/upload]', err);
    res.status(400).json({ error: err.message || 'Failed to upload products' });
  }
});

/**
 * GET /api/products/search?barcode=XXXXX
 * Search for a product by barcode (used by Flutter app in local mode).
 */
app.get('/api/products/search', (req, res) => {
  const { barcode } = req.query;

  if (!barcode) {
    return res.status(400).json({ error: 'Barcode query parameter is required' });
  }

  try {
    const product = db
      .prepare('SELECT * FROM products WHERE barcode = ? AND is_active = 1')
      .get(barcode.toString().trim());

    if (!product) {
      return res.status(404).json({ error: `Product with barcode "${barcode}" not found` });
    }

    res.json({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      unitPrice: product.unit_price,
      category: product.category,
      brand: product.brand,
      isActive: product.is_active === 1,
    });
  } catch (err) {
    console.error('[GET /api/products/search]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/products
 * Get all active products (optional, for caching/initial load).
 */
app.get('/api/products', (req, res) => {
  try {
    const products = db
      .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC')
      .all();

    res.json({
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        unitPrice: p.unit_price,
        category: p.category,
        brand: p.brand,
      })),
    });
  } catch (err) {
    console.error('[GET /api/products]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /checkout
 * Mark a checkout code as received / begin processing.
 */
app.post('/checkout', (req, res) => {
  const { sessionId, checkoutCode } = req.body;

  if (!sessionId || !checkoutCode) {
    return res.status(400).json({ error: 'sessionId and checkoutCode required' });
  }

  try {
    db.prepare(
      'UPDATE checkout_codes SET status = ? WHERE checkout_code = ?'
    ).run('received', checkoutCode.toUpperCase());

    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /checkout]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /checkout/:code/complete
 * Complete a payment: record the transaction and update checkout status.
 */
app.patch('/checkout/:code/complete', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { cashierId, amountPaid } = req.body;

  if (!cashierId || amountPaid === undefined) {
    return res.status(400).json({ error: 'cashierId and amountPaid required' });
  }

  try {
    withTransaction(() => {
      // 1. Get the checkout code
      const checkoutRow = db
        .prepare('SELECT * FROM checkout_codes WHERE checkout_code = ?')
        .get(code);

      if (!checkoutRow) {
        throw new Error(`Checkout code "${code}" not found.`);
      }

      const sessionId = checkoutRow.session_id;
      const items = JSON.parse(checkoutRow.items || '[]');
      const total = checkoutRow.total || 0;
      const change = amountPaid - total;
      const completedAt = new Date().toISOString();

      // 2. Record transaction
      db.prepare(`
        INSERT OR REPLACE INTO transactions
        (session_id, checkout_code, items, total, amount_paid, change_amount, cashier_id, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sessionId,
        code,
        JSON.stringify(items),
        total,
        amountPaid,
        change,
        cashierId,
        completedAt
      );

      // 3. Update checkout code status to completed
      db.prepare(
        'UPDATE checkout_codes SET status = ? WHERE checkout_code = ?'
      ).run('completed', code);

      // 4. Update session status to completed
      db.prepare(
        'UPDATE sessions SET status = ? WHERE session_id = ?'
      ).run('completed', sessionId);
    });

    res.json({ ok: true, message: 'Payment recorded successfully.' });
  } catch (err) {
    console.error('[PATCH /checkout/:code/complete]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /transactions
 * Fetch all completed transactions (for history/reporting).
 */
app.get('/transactions', (req, res) => {
  try {
    const rows = db
      .prepare('SELECT * FROM transactions ORDER BY completed_at DESC LIMIT 100')
      .all();

    const transactions = rows.map(row => ({
      sessionId: row.session_id,
      checkoutCode: row.checkout_code,
      items: JSON.parse(row.items || '[]'),
      total: row.total,
      amountPaid: row.amount_paid,
      change: row.change_amount,
      cashierId: row.cashier_id,
      completedAt: row.completed_at,
    }));

    res.json(transactions);
  } catch (err) {
    console.error('[GET /transactions]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Socket.io event: client listening for push notifications from Flutter app.
 * (Not required for POS but kept for potential future use)
 */
io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected:', socket.id);

  /**
   * Listen for checkout_complete events from POS
   * and broadcast to all connected Flutter app clients
   */
  socket.on('checkout_complete', (data) => {
    console.log('[Socket.io] Received checkout_complete from POS:', data.checkoutCode);
    
    // Broadcast to all connected clients (Flutter app)
    io.emit('checkout_complete', data);
    console.log('[Socket.io] Broadcasted checkout_complete to all clients');
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Client disconnected:', socket.id);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n✓ CartAlogue Local Server running at http://localhost:${PORT}`);
  console.log(`  Serving Flutter app (demo laptop hotspot) and POS UI\n`);
});
