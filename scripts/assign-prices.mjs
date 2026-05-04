/**
 * CartAlogue — Assign Prices to Null-Price Products
 *
 * Reads all products from Firestore where `price === null`
 * and assigns a random but realistic price based on category / product name.
 *
 * Prices are stored in CENTAVOS (₱1 = 100) to match existing POS data.
 *   e.g. ₱58.00  →  5800
 *
 * Run from project root:
 *   node scripts/assign-prices.mjs
 *
 * Dry-run (preview only, no writes):
 *   node scripts/assign-prices.mjs --dry-run
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
const KEY_PATH = join(__dirname, 'serviceAccountKey.json');
if (!existsSync(KEY_PATH)) {
  console.error('\n[ERROR] Missing scripts/serviceAccountKey.json');
  console.error('  Generate it at: https://console.firebase.google.com/project/cartalogue-8bef8/settings/serviceaccounts/adminsdk\n');
  process.exit(1);
}

const admin        = require('firebase-admin');
const serviceAccount = require(KEY_PATH);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ─── Price Ranges (in centavos) by Category ──────────────────────────────────
// Based on actual Philippine supermarket / sari-sari store shelf prices (2025-2026).
// Reference: SM Supermarket, Puregold, Lazada PH, typical Metro Manila retail.
//
// Lucky Me noodles single pack ~₱13-15 | Piattos 85g ~₱32-45
// Sardines 155g ~₱22-40 | Tuna 155g ~₱38-58 | Corned beef 175g ~₱45-62
// Safeguard soap bar 135g ~₱48-65 | Shampoo sachet ~₱7-12 | Shampoo 200mL ~₱85-140
// Milo sachet ~₱12-18 | Milo 400g pouch ~₱120-150 | Milo 1kg tin ~₱220-260
// C2 500mL ~₱20-25 | Mineral water 500mL ~₱12-18 | Gatorade 350mL ~₱28-35
// Evap milk 410mL ~₱38-52 | Condensed milk 300mL ~₱48-62 | Cheese 165g ~₱80-120
// Detergent sachet (55g) ~₱10-18 | Dishwashing liquid 250mL ~₱35-65
const CATEGORY_RULES = [
  {
    // Diapers, formula, baby food — largest packs can be expensive
    keywords: ['baby', 'infant', 'formula', 'toddler', 'diapers', 'napkin'],
    min: 15000, max: 80000,    // ₱150 – ₱800
  },
  {
    // Soap bars, shampoo bottles, lotion, toothpaste (single unit retail size)
    keywords: ['personal care', 'soap', 'shampoo', 'conditioner', 'lotion',
               'toothpaste', 'toothbrush', 'deodorant', 'feminine', 'hygiene',
               'sunscreen', 'moisturizer', 'facial wash', 'body wash'],
    min: 1500, max: 18000,     // ₱15 – ₱180
  },
  {
    // Detergent sachets, fabric softener, dishwashing, household cleaners
    keywords: ['detergent', 'fabric', 'softener', 'bleach', 'disinfectant',
               'cleaner', 'household', 'dishwashing', 'insecticide', 'air freshener',
               'lysol', 'zonrox', 'champion'],
    min: 1000, max: 15000,     // ₱10 – ₱150
  },
  {
    // Milo, Nescafe, Kopiko sachets or cans
    keywords: ['coffee', 'cocoa', 'milo', 'ovaltine', 'drinking chocolate', 'kopiko',
               'nescafe', 'great taste'],
    min: 1200, max: 28000,     // ₱12 – ₱280  (sachet ₱12, 1kg tin ₱260)
  },
  {
    // Evaporated milk, condensed milk, cheese, butter, fresh dairy
    keywords: ['milk', 'dairy', 'evaporated', 'condensed', 'cheese', 'butter',
               'yogurt', 'cream', 'keso'],
    min: 2000, max: 25000,     // ₱20 – ₱250
  },
  {
    // Bottled water, juice drinks, soda, energy drinks, iced tea
    keywords: ['beverage', 'juice', 'drink', 'soda', 'energy drink', 'sports drink',
               'tea', 'water', 'mineral water', 'c2', 'cobra', 'gatorade', 'sprite',
               'coke', 'pepsi', 'nestea', 'royal', 'mountain dew'],
    min: 1200, max: 6500,      // ₱12 – ₱65  (sachet ₱12, 1L bottle ₱60)
  },
  {
    // Lucky Me, instant noodles, pasta, bihon, pancit canton
    keywords: ['noodle', 'pasta', 'spaghetti', 'macaroni', 'instant noodle',
               'vermicelli', 'pancit', 'bihon', 'canton', 'lucky me', 'quickchow'],
    min:  800, max:  5500,     // ₱8 – ₱55  (single pack ₱13, 6-pack multipack ₱55)
  },
  {
    // Sky Flakes, Monde, biscuits, wafers, cookies, bread
    keywords: ['bread', 'bun', 'pandesal', 'loaf', 'crackers', 'biscuit',
               'wafer', 'cookie', 'cake', 'pastry', 'skyflakes', 'sky flakes',
               'monde', 'rebisco'],
    min: 1200, max:  9000,     // ₱12 – ₱90
  },
  {
    // Piattos, Nova, chips, chicharon, candy, chocolate bars
    keywords: ['snack', 'chip', 'corn', 'popcorn', 'pork rind', 'chicharon',
               'candy', 'chocolate', 'gummy', 'sweet', 'jelly', 'marshmallow',
               'piattos', 'nova', 'oishi', 'jack', 'piatos'],
    min:  800, max:  6500,     // ₱8 – ₱65
  },
  {
    // Soy sauce, vinegar, ketchup, fish sauce, patis, bagoong, mayo
    keywords: ['condiment', 'sauce', 'ketchup', 'vinegar', 'soy sauce', 'fish sauce',
               'patis', 'bagoong', 'alamang', 'oyster sauce', 'mayonnaise', 'salad dressing',
               'silver swan', 'datu puti', 'ufc', 'knorr', 'maggi'],
    min: 1500, max:  9500,     // ₱15 – ₱95
  },
  {
    // Sardines, tuna cans, corned beef, luncheon meat, liver spread, vienna sausage
    keywords: ['canned', 'sardines', 'tuna', 'corned beef', 'spam', 'luncheon meat',
               'vienna sausage', 'liver spread', 'bangus', 'mackerel', '555',
               'century', 'ligo', 'purefoods', 'argentina'],
    min: 1800, max: 12000,     // ₱18 – ₱120
  },
  {
    // Cornflakes, oatmeal, granola, muesli
    keywords: ['cereal', 'oat', 'granola', 'muesli', 'breakfast', 'cornflakes'],
    min: 4500, max: 25000,     // ₱45 – ₱250
  },
  {
    // Rice, cooking oil, flour, sugar, salt, cornstarch
    keywords: ['rice', 'flour', 'sugar', 'salt', 'cooking oil', 'vegetable oil',
               'corn starch', 'baking', 'canola', 'palm oil'],
    min: 2500, max: 20000,     // ₱25 – ₱200
  },
  {
    // Ice cream, frozen goods
    keywords: ['frozen', 'ice cream', 'gelato', 'sorbet'],
    min: 2500, max: 18000,     // ₱25 – ₱180
  },
  {
    // Vitamins, supplements, Berocca, Enervon, etc.
    keywords: ['vitamin', 'supplement', 'mineral', 'probiotic', 'health',
               'enervon', 'berocca', 'stresstabs'],
    min: 5000, max: 40000,     // ₱50 – ₱400
  },
];

const DEFAULT_RANGE = { min: 1500, max: 12000 }; // ₱15 – ₱120  (typical unrecognized grocery item)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPriceRange(data) {
  const text = [
    data.categories,
    data.labels,
    data.product_name,
    data.product_name_en,
    data.generic_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule;
  }
  return DEFAULT_RANGE;
}

/** Random price rounded to nearest ₱0.25 (25 centavos) */
function randomPrice(min, max) {
  const raw = min + Math.random() * (max - min);
  return Math.round(raw / 25) * 25;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('==========================================================');
  console.log('   CartAlogue -- Assign Prices to Null-Price Products');
  console.log('==========================================================');
  if (isDryRun) console.log('  MODE: DRY RUN (no writes)\n');
  else console.log('  MODE: LIVE (will write to Firestore)\n');

  const forceAll = process.argv.includes('--all');
  let snapshot;
  if (forceAll) {
    console.log('Querying ALL products (--all flag) …');
    snapshot = await db.collection('products').get();
  } else {
    console.log('Querying products where price == null …');
    snapshot = await db.collection('products').where('price', '==', null).get();
  }
  console.log(`Found ${snapshot.size} products.\n`);

  if (snapshot.size === 0) {
    console.log('Nothing to update. All products already have a price! Use --all to overwrite.');
    process.exit(0);
  }

  const BATCH_SIZE = 500;
  let updated = 0;
  let docs = [...snapshot.docs];

  // Preview first 5
  console.log('Sample assignments (first 5):');
  for (const d of docs.slice(0, 5)) {
    const data = d.data();
    const range = getPriceRange(data);
    const price = randomPrice(range.min, range.max);
    const pesos = (price / 100).toFixed(2);
    console.log(`  [${d.id}] ${data.product_name ?? '(no name)'}  →  ₱${pesos}`);
  }
  console.log('');

  if (isDryRun) {
    console.log('Dry run complete. Re-run without --dry-run to apply.');
    process.exit(0);
  }

  // Write in Firestore batch chunks of 500
  while (docs.length > 0) {
    const chunk = docs.splice(0, BATCH_SIZE);
    const batch = db.batch();

    for (const docSnap of chunk) {
      const data = docSnap.data();
      const range = getPriceRange(data);
      const price = randomPrice(range.min, range.max);
      // Store as both `price` (OpenFoodFacts schema) and `unitPrice` (POS schema)
      batch.update(docSnap.ref, { price, unitPrice: price });
    }

    await batch.commit();
    updated += chunk.length;
    process.stdout.write(`\rUpdated ${updated} / ${snapshot.size} …`);
  }

  console.log(`\n\nDone! Assigned prices to ${updated} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
