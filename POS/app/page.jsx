'use client';

import { useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IdleScreen from '@/components/IdleScreen';
import TransactionReviewScreen from '@/components/TransactionReviewScreen';
import PaymentScreen from '@/components/PaymentScreen';
import TransactionCompleteScreen from '@/components/TransactionCompleteScreen';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('idle');
  const [transaction, setTransaction] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScanCode = async (checkoutCode) => {
    setScanError(null);
    setIsLoading(true);
    try {
      const codeRef = doc(db, 'checkoutCodes', checkoutCode.trim().toUpperCase());
      const snapshot = await getDoc(codeRef);
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Map Firestore fields to the format components expect
        const items = (data.items || []).map(item => ({
          name: item.productName,
          qty: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal,
          sku: item.barcode,
        }));

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);

        setTransaction({
          basketId: Array.isArray(data.basketIds) ? data.basketIds.join(', ') : checkoutCode,
          basketIds: data.basketIds || [],
          checkoutCode: checkoutCode.trim().toUpperCase(),
          items,
          total,
          timestamp: data.createdAt?.toDate?.()?.toLocaleString('en-PH') || new Date().toLocaleString('en-PH'),
        });
        setCurrentScreen('review');
      } else {
        setScanError(`Checkout code "${checkoutCode.toUpperCase()}" not found. Please try again.`);
      }
    } catch (err) {
      setScanError('Failed to load transaction. Check your connection.');
      console.error('Firebase fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setCurrentScreen('payment');
  };

  const handleBackToReview = () => {
    setCurrentScreen('review');
  };

  const handleConfirmPayment = async (amountReceived) => {
    if (!transaction) return;

    const change = amountReceived - transaction.total;
    const receiptNumber = `RCP-${Date.now()}`;
    const completedAt = serverTimestamp();

    const updatedTransaction = {
      ...transaction,
      amountReceived,
      change,
      receiptNumber,
    };

    setTransaction(updatedTransaction);
    setCurrentScreen('complete');

    // Write back to Firestore so the mobile app reflects the completed payment
    try {
      const { checkoutCode, basketIds, items, total } = transaction;

      // 1. Write transaction record
      await setDoc(doc(db, 'transactions', receiptNumber), {
        receiptNumber,
        checkoutCode,
        basketIds,
        items: items.map(i => ({
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

          // Update basket — mark as available
          await updateDoc(basketRef, {
            status: 'available',
            releasedAt: completedAt,
            currentSessionId: null,
          });

          // Update the linked session — mark as completed
          if (currentSessionId) {
            await updateDoc(doc(db, 'sessions', currentSessionId), {
              status: 'completed',
              completedAt,
            });
          }
        }
      }
    } catch (err) {
      // Payment screen already shows success — log quietly
      console.error('Firestore post-payment update error:', err);
    }
  };

  const handleNextCustomer = () => {
    setTransaction(null);
    setCurrentScreen('idle');
  };

  const handleCancel = () => {
    setTransaction(null);
    setCurrentScreen('idle');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {currentScreen === 'idle' && (
        <IdleScreen onScanCode={handleScanCode} isLoading={isLoading} scanError={scanError} />
      )}
      {currentScreen === 'review' && transaction && (
        <TransactionReviewScreen
          transaction={transaction}
          onProceedToPayment={handleProceedToPayment}
          onCancel={handleCancel}
        />
      )}
      {currentScreen === 'payment' && transaction && (
        <PaymentScreen
          transaction={transaction}
          onConfirmPayment={handleConfirmPayment}
          onBack={handleBackToReview}
        />
      )}
      {currentScreen === 'complete' && transaction && (
        <TransactionCompleteScreen
          transaction={transaction}
          onNextCustomer={handleNextCustomer}
        />
      )}
    </main>
  );
}
