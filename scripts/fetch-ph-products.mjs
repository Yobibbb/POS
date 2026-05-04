/**
 * CartAlogue — Open Food Facts PH Product Fetcher
 *
 * Fetches ALL Philippine products from the Open Food Facts API
 * and upserts them into Firestore `products` collection.
 *
 * Setup (one-time):
 *   1. Go to https://console.firebase.google.com/project/cartalogue-8bef8/settings/serviceaccounts/adminsdk
 *   2. Click "Generate new private key" → save as scripts/serviceAccountKey.json
 *
 * Run from the project root:
 *   node scripts/fetch-ph-products.mjs
 *
 * Requires Node.js 18+ (uses built-in fetch).
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Firebase Admin Init (bypasses Firestore security rules) ─────────────────
const KEY_PATH = join(__dirname, 'serviceAccountKey.json');

if (!existsSync(KEY_PATH)) {
  console.error('\n[ERROR] Service account key not found at scripts/serviceAccountKey.json');
  console.error('\nTo fix:');
  console.error('  1. Open https://console.firebase.google.com/project/cartalogue-8bef8/settings/serviceaccounts/adminsdk');
  console.error('  2. Click "Generate new private key"');
  console.error('  3. Save the downloaded JSON file as:  scripts/serviceAccountKey.json');
  console.error('  4. Re-run this script.\n');
  process.exit(1);
}

const admin     = require('firebase-admin');
const serviceAccount = require(KEY_PATH);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE  = 'https://world.openfoodfacts.org/api/v2/search';
const FIELDS    = 'code,product_name,product_name_en,generic_name,brands,quantity,serving_size,categories,labels';
const PAGE_SIZE   = 100;
const DELAY_MS    = 2000; // 2s between pages to avoid rate limits
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 10000; // 10s base wait on failure (doubles each retry)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const str   = (val) => (val && typeof val === 'string' && val.trim() ? val.trim() : null);

function mapProduct(raw) {
  return {
    code:            str(raw.code),
    product_name:    str(raw.product_name),
    product_name_en: str(raw.product_name_en),
    generic_name:    str(raw.generic_name),
    brands:          str(raw.brands),
    quantity:        str(raw.quantity),
    serving_size:    str(raw.serving_size),
    categories:      str(raw.categories),
    labels:          str(raw.labels),
    price:           null,   // to be filled in manually later
  };
}

async function fetchPage(page) {
  const url =
    `${API_BASE}` +
    `?countries_tags_en=philippines` +
    `&page=${page}` +
    `&page_size=${PAGE_SIZE}` +
    `&fields=${FIELDS}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          // Open Food Facts asks bots to identify themselves
          'User-Agent': 'CartAlogue-POS/1.0 (github.com/cartalogue)',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const wait = RETRY_BASE_MS * attempt; // 10s, 20s, 30s, 40s, 50s
      console.warn(`  [!] Retry ${attempt}/${MAX_RETRIES - 1} for page ${page} -- ${err.message} (waiting ${wait / 1000}s)`);
      await sleep(wait);
    }
  }
}

async function saveBatch(rawProducts) {
  // Filter out entries with no barcode (can't be used as a document ID)
  const valid = rawProducts.filter((p) => p.code && p.code.trim());

  // Use Firestore batch writes (up to 500 per batch — well within page_size of 100)
  const batch = db.batch();
  for (const raw of valid) {
    const product = mapProduct(raw);
    batch.set(db.collection('products').doc(product.code), product, { merge: true });
  }
  await batch.commit();

  return valid.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Allow resuming from a specific page: node fetch-ph-products.mjs --start-page 5
  const startPageArg = process.argv.find((a) => a.startsWith('--start-page='));
  const startPage = startPageArg ? parseInt(startPageArg.split('=')[1], 10) : 1;

  const endPageArg = process.argv.find((a) => a.startsWith('--end-page='));
  const endPage = endPageArg ? parseInt(endPageArg.split('=')[1], 10) : null;

  const alreadySavedArg = process.argv.find((a) => a.startsWith('--already-saved='));
  const alreadySaved = alreadySavedArg ? parseInt(alreadySavedArg.split('=')[1], 10) : 0;

  const maxProductsArg = process.argv.find((a) => a.startsWith('--max-products='));
  const maxProducts = maxProductsArg ? parseInt(maxProductsArg.split('=')[1], 10) : null;

  console.log('==========================================================');
  console.log('   CartAlogue -- Open Food Facts PH Product Fetcher');
  console.log('==========================================================\n');
  console.log(`  Project    : ${serviceAccount.project_id}`);
  console.log(`  Target     : Firestore -> products collection`);
  console.log(`  Source     : Open Food Facts (Philippines)`);
  console.log(`  Start page : ${startPage}`);
  console.log(`  End page   : ${endPage ?? 'all'}`);
  if (maxProducts !== null) console.log(`  Max total  : ${maxProducts} (already saved: ${alreadySaved})`);
  console.log(`  Page delay : ${DELAY_MS / 1000}s\n`);

  let page        = startPage;
  let totalSaved  = 0;
  let totalPages  = null;
  const cumulativeSaved = () => alreadySaved + totalSaved;
  const skippedPages = [];

  while (true) {
    const pageLabel = totalPages ? String(page).padStart(4, ' ') + '/' + totalPages : String(page).padStart(4, ' ') + '/?';
    process.stdout.write(`[Page ${pageLabel}] Fetching ... `);

    let data;
    try {
      data = await fetchPage(page);
    } catch (err) {
      console.error(`\n  [SKIP] Page ${page} failed after ${MAX_RETRIES} attempts: ${err.message} -- skipping to next page.`);
      skippedPages.push(page);
      if ((totalPages !== null && page >= totalPages) || (endPage !== null && page >= endPage)) break;
      page++;
      await sleep(DELAY_MS);
      continue;
    }

    const products = data.products ?? [];

    // Resolve total pages from first response
    if (totalPages === null && data.page_count) {
      totalPages = data.page_count;
      console.log(`\n  Total pages : ${totalPages}  |  Total products: ~${data.count ?? '?'}\n`);
      process.stdout.write(`[Page ${String(page).padStart(4, ' ')}/${totalPages}] Saving  ... `);
    }

    if (products.length === 0) {
      console.log('no products returned -- done!');
      break;
    }

    let saved;
    try {
      saved = await saveBatch(products);
    } catch (err) {
      console.error(`\n  [SKIP] Firestore write error on page ${page}: ${err.message} -- skipping.`);
      skippedPages.push(page);
      if ((totalPages !== null && page >= totalPages) || (endPage !== null && page >= endPage)) break;
      page++;
      await sleep(DELAY_MS);
      continue;
    }

    totalSaved += saved;
    const skipped = products.length - saved;
    const skipNote = skipped > 0 ? ` (${skipped} skipped -- no barcode)` : '';
    const cumulativeNote = alreadySaved > 0 ? `  |  cumulative: ${cumulativeSaved()}` : '';
    console.log(`saved ${saved} products${skipNote}  |  total saved: ${totalSaved}${cumulativeNote}`);

    // Stop if cumulative total reached max-products
    if (maxProducts !== null && cumulativeSaved() >= maxProducts) {
      console.log(`\nReached ${cumulativeSaved()} total products (target: ${maxProducts}) -- done!`);
      break;
    }

    // Stop when we have processed all pages
    if (totalPages !== null && page >= totalPages) {
      console.log('\nLast page reached -- done!');
      break;
    }

    // Stop if end page reached
    if (endPage !== null && page >= endPage) {
      console.log(`\nEnd page ${endPage} reached -- done!`);
      break;
    }

    // Safety fallback: stop if API returned empty or very short page and no page_count
    if (totalPages === null && products.length === 0) {
      console.log('\nNo more products -- done!');
      break;
    }

    page++;
    await sleep(DELAY_MS);
  }

  console.log(`\n[DONE] Import complete. ${totalSaved} products upserted into Firestore.`);
  if (skippedPages.length > 0) {
    console.log(`[WARN] ${skippedPages.length} page(s) were skipped: ${skippedPages.join(', ')}`);
    console.log(`       Re-run with --start-page=<page> to retry any skipped page.`);
  }
  console.log();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
