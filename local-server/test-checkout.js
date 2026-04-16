/**
 * test-checkout.js
 *
 * Simulates the Flutter mobile app performing a full checkout flow.
 * Run this WHILE the local server is running to test the POS end-to-end.
 *
 * Usage:
 *   node test-checkout.js [serverUrl]
 *
 * Examples:
 *   node test-checkout.js
 *   node test-checkout.js http://192.168.1.100:3000
 *
 * Requires socket.io-client:
 *   npm install socket.io-client   (run once in this folder)
 */

const { io } = require('socket.io-client');
const http = require('http');

const SERVER = process.argv[2] || 'http://localhost:3000';

// Helper: simple HTTP request
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log(`\nCartAlogue Checkout Simulator`);
  console.log(`Connecting to: ${SERVER}\n`);

  // 1. Create a session (simulates Flutter app starting a shopping session)
  const sessionRes = await request('POST', '/sessions', { deviceId: 'TEST-PHONE-001' });
  if (sessionRes.status !== 200) {
    console.error('Failed to create session:', sessionRes.body);
    process.exit(1);
  }
  const { sessionId } = sessionRes.body;
  console.log(`[1] Session created: ${sessionId}`);

  // 2. Connect via Socket.io and join the session room
  const socket = io(SERVER, { transports: ['websocket', 'polling'] });

  await new Promise((resolve) => socket.on('connect', resolve));
  console.log(`[2] Socket connected: ${socket.id}`);

  socket.emit('join_session', { sessionId });
  console.log(`[3] Joined session room`);

  // 3. Simulate scanning some items into the basket
  const cartItems = [
    { barcode: '8850999032273', productName: 'Lucky Me Pancit Canton Original',   unitPrice: 15.00, quantity: 2, subtotal: 30.00 },
    { barcode: '4800116461038', productName: 'C2 Cool & Clean Apple 500ml',        unitPrice: 22.00, quantity: 1, subtotal: 22.00 },
    { barcode: '4800033280037', productName: 'Milo Activ-Go 300g',                 unitPrice: 135.00, quantity: 1, subtotal: 135.00 },
  ];

  let runningTotal = 0;
  for (const item of cartItems) {
    runningTotal = parseFloat((runningTotal + item.subtotal).toFixed(2));
    socket.emit('item_added', { sessionId, ...item, runningTotal });
    console.log(`[4] Item scanned: ${item.productName} x${item.quantity} → ₱${item.subtotal.toFixed(2)}  (running: ₱${runningTotal.toFixed(2)})`);
    await wait(500);
  }

  // 4. Send checkout_requested (simulates customer tapping "Checkout" in the app)
  const checkoutCode = randomCode();
  const total = runningTotal;

  console.log(`\n[5] Sending checkout_requested — code: ${checkoutCode}, total: ₱${total.toFixed(2)}`);
  console.log(`    >>> Check the POS now — it should pop up the Transaction Review screen <<<\n`);

  socket.emit('checkout_requested', {
    sessionId,
    checkoutCode,
    items: cartItems.map((i) => ({
      barcode: i.barcode,
      productName: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
    total,
  });

  // 5. Listen for checkout_complete from the POS
  socket.on('checkout_complete', (receipt) => {
    console.log(`[6] checkout_complete received from POS!`);
    console.log(`    Checkout Code : ${receipt.checkoutCode}`);
    console.log(`    Total         : ₱${Number(receipt.total).toFixed(2)}`);
    console.log(`    Amount Paid   : ₱${Number(receipt.amountPaid).toFixed(2)}`);
    console.log(`    Change        : ₱${Number(receipt.change).toFixed(2)}`);
    console.log(`    Completed At  : ${receipt.completedAt}`);
    console.log(`\n  Test PASSED — full checkout flow completed successfully!\n`);
    socket.disconnect();
    process.exit(0);
  });

  // Timeout if POS never responds
  setTimeout(() => {
    console.log('\n[Timeout] No checkout_complete received after 60 seconds.');
    console.log('  → The POS might not be open, or the cashier has not completed payment yet.');
    console.log(`  → Checkout code was: ${checkoutCode}`);
    console.log('  → You can manually enter this code in the POS idle screen to test.\n');
    socket.disconnect();
    process.exit(0);
  }, 60000);
}

run().catch((err) => {
  console.error('Simulator error:', err.message);
  console.error('Is the server running at', SERVER, '?');
  process.exit(1);
});
