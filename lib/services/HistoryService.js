/**
 * HistoryService — manages POS transaction history in localStorage.
 * Entries from Online (Firebase) mode are marked synced: true.
 * Entries from Local mode are marked synced: false and will be
 * pushed to Firebase when internet becomes available.
 */

const HISTORY_KEY = 'cartalouge_pos_history';
const MAX_ENTRIES = 1000;

/**
 * Save a completed transaction to local history.
 * @param {object} transaction - The completed transaction object from page.jsx
 * @param {'online'|'local'} mode - The current POS mode
 */
export function saveHistoryEntry(transaction, mode) {
  if (typeof window === 'undefined') return null;

  const now = new Date();
  const entry = {
    receiptNumber: transaction.receiptNumber,
    date: now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: now.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    isoTimestamp: now.toISOString(),
    checkoutCode: transaction.checkoutCode || '',
    basketId: transaction.basketId || '',
    items: (transaction.items || []).map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      subtotal: item.subtotal,
      sku: item.sku || '',
    })),
    total: transaction.total,
    amountReceived: transaction.amountReceived,
    change: transaction.change,
    mode,
    // Online-mode transactions are already written to Firebase by FirebaseCheckoutService
    synced: mode === 'online',
  };

  const entries = getHistory();
  // Avoid duplicate receipts (e.g. double-submit)
  if (entries.some((e) => e.receiptNumber === entry.receiptNumber)) {
    return entry;
  }

  entries.unshift(entry); // newest first
  const trimmed = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full — clear oldest entries and retry
    const smaller = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(smaller));
  }
  return entry;
}

/**
 * Return all history entries, newest first.
 */
export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Return entries from Local mode that have not yet been synced to Firebase.
 */
export function getUnsyncedEntries() {
  return getHistory().filter((e) => !e.synced && e.mode === 'local');
}

/**
 * Mark a set of receipt numbers as synced in localStorage.
 * @param {string[]} receiptNumbers
 */
export function markEntriesAsSynced(receiptNumbers) {
  if (typeof window === 'undefined') return;
  const set = new Set(receiptNumbers);
  const updated = getHistory().map((e) =>
    set.has(e.receiptNumber) ? { ...e, synced: true } : e
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/**
 * Clear all history (for testing / admin use).
 */
export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
