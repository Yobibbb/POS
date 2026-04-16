import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class FirebaseCheckoutService {
  /**
   * Firebase mode: cashier manually scans the QR code.
   * No background push from Firebase is needed — returning a no-op unsubscribe.
   */
  listenForCheckoutRequests(_callback) {
    return () => {};
  }

  async lookupCheckoutCode(checkoutCode) {
    const normalized = checkoutCode.trim().toUpperCase();
    const codeRef = doc(db, 'checkoutCodes', normalized);
    const snapshot = await getDoc(codeRef);

    if (!snapshot.exists()) {
      throw new Error(
        `Checkout code "${normalized}" not found. Please try again.`
      );
    }

    const data = snapshot.data();
    const items = (data.items || []).map((item) => ({
      name: item.productName,
      qty: item.quantity,
      price: item.unitPrice,
      subtotal: item.subtotal,
      sku: item.barcode,
    }));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      basketId: Array.isArray(data.basketIds)
        ? data.basketIds.join(', ')
        : normalized,
      basketIds: data.basketIds || [],
      checkoutCode: normalized,
      items,
      total,
      timestamp:
        data.createdAt?.toDate?.()?.toLocaleString('en-PH') ||
        new Date().toLocaleString('en-PH'),
    };
  }

  async completeCheckout(transaction, amountReceived) {
    const { checkoutCode, basketIds, items, total, receiptNumber } =
      transaction;
    const change = amountReceived - total;
    const completedAt = serverTimestamp();

    // 1. Write transaction record
    await setDoc(doc(db, 'transactions', receiptNumber), {
      receiptNumber,
      checkoutCode,
      basketIds,
      items: items.map((i) => ({
        productName: i.name,
        quantity: i.qty,
        unitPrice: i.price,
        subtotal: i.subtotal,
        barcode: i.sku,
      })),
      total,
      amountReceived,
      change,
      completedAt,
      status: 'completed',
    });

    // 2. Mark checkout code as completed
    await updateDoc(doc(db, 'checkoutCodes', checkoutCode), {
      status: 'completed',
      completedAt,
    });

    // 3. Release each basket and update its linked session
    for (const basketId of basketIds) {
      const basketRef = doc(db, 'baskets', basketId);
      const basketSnap = await getDoc(basketRef);

      if (basketSnap.exists()) {
        const { currentSessionId } = basketSnap.data();

        await updateDoc(basketRef, {
          status: 'available',
          releasedAt: completedAt,
          currentSessionId: null,
        });

        if (currentSessionId) {
          await updateDoc(doc(db, 'sessions', currentSessionId), {
            status: 'completed',
            completedAt,
          });
        }
      }
    }
  }

  dispose() {}
}
