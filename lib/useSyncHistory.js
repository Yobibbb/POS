'use client';

/**
 * useSyncHistory — React hook that automatically syncs unsynced local-mode
 * transactions to Firebase whenever internet connectivity is detected.
 *
 * Triggers:
 *  1. On mount (if already online)
 *  2. Whenever the browser fires the `online` event
 */

import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUnsyncedEntries, markEntriesAsSynced } from '@/lib/services/HistoryService';

async function syncLocalHistoryToFirebase() {
  const unsynced = getUnsyncedEntries();
  if (unsynced.length === 0) return 0;

  const synced = [];
  for (const entry of unsynced) {
    try {
      await setDoc(
        doc(db, 'transactions', entry.receiptNumber),
        {
          receiptNumber: entry.receiptNumber,
          checkoutCode: entry.checkoutCode,
          basketId: entry.basketId,
          items: entry.items.map((i) => ({
            productName: i.name,
            quantity: i.qty,
            unitPrice: i.price,
            subtotal: i.subtotal,
            barcode: i.sku || '',
          })),
          total: entry.total,
          amountReceived: entry.amountReceived,
          change: entry.change,
          completedAt: new Date(entry.isoTimestamp),
          status: 'completed',
          syncedFromLocal: true,
        },
        { merge: true }
      );
      synced.push(entry.receiptNumber);
    } catch (err) {
      // If one entry fails, continue with the rest
      console.error('[SyncHistory] Failed to sync', entry.receiptNumber, err);
    }
  }

  if (synced.length > 0) {
    markEntriesAsSynced(synced);
    console.log(`[SyncHistory] Synced ${synced.length} local transaction(s) to Firebase.`);
  }
  return synced.length;
}

/**
 * Call this hook once at the app level (e.g. in ModeContext or layout).
 * It returns a manual `triggerSync` function you can call on demand.
 */
export function useSyncHistory() {
  const syncingRef = useRef(false);

  const triggerSync = async () => {
    if (syncingRef.current) return; // prevent concurrent syncs
    syncingRef.current = true;
    try {
      await syncLocalHistoryToFirebase();
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    // Try once on mount if already online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      triggerSync();
    }

    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { triggerSync };
}
