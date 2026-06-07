import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
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

  async uploadProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Products array cannot be empty');
    }

    // Validate each product
    for (const product of products) {
      if (!product.name || !product.barcode || product.price === undefined) {
        throw new Error('Each product must have name, barcode, and price');
      }
      if (typeof product.price !== 'number' || product.price <= 0) {
        throw new Error(`Invalid price for product "${product.name}"`);
      }
    }

    try {
      // Check auth status
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Not authenticated. Please ensure POS auto-login completed.');
      }

      console.log('[Firebase] Authenticated user:', user.email);
      console.log('[Firebase] User UID:', user.uid);

      const batch = writeBatch(db);

      for (const product of products) {
        const productId = `PRODUCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const productRef = doc(db, 'products', productId);

        console.log('[Firebase] Adding product to batch:', { productId, name: product.name, barcode: product.barcode });

        batch.set(productRef, {
          id: productId,
          name: product.name,
          barcode: product.barcode,
          unitPrice: Math.round(product.price * 100), // Store in centavos
          category: product.category || '',
          brand: product.brand || '',
          isActive: true,
          createdAt: serverTimestamp(),
        });
      }

      console.log('[Firebase] Committing batch...');
      await batch.commit();
      console.log('[Firebase] ✓ Batch committed successfully');
    } catch (err) {
      console.error('[Firebase] Upload error:', err);
      throw new Error(`Firebase upload failed: ${err.message}`);
    }
  }

  dispose() {}
}
