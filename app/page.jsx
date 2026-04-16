'use client';

import { useState, useEffect } from 'react';
import { useMode } from '@/lib/ModeContext';
import IdleScreen from '@/components/IdleScreen';
import TransactionReviewScreen from '@/components/TransactionReviewScreen';
import PaymentScreen from '@/components/PaymentScreen';
import TransactionCompleteScreen from '@/components/TransactionCompleteScreen';

export default function Home() {
  const { service } = useMode();

  const [currentScreen, setCurrentScreen] = useState('idle');
  const [transaction, setTransaction] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Local Mode: listen for incoming checkout_requested Socket.io events.
  // When the customer's app sends a checkout request, auto-navigate to review.
  useEffect(() => {
    if (!service) return;
    const unsubscribe = service.listenForCheckoutRequests((incomingTxn) => {
      setTransaction(incomingTxn);
      setCurrentScreen('review');
      setScanError(null);
    });
    return unsubscribe;
  }, [service]);

  // Cashier manually scans / types the checkout code
  const handleScanCode = async (checkoutCode) => {
    if (!service) return;
    setScanError(null);
    setIsLoading(true);
    try {
      const txn = await service.lookupCheckoutCode(checkoutCode);
      setTransaction(txn);
      setCurrentScreen('review');
    } catch (err) {
      setScanError(err.message || 'Failed to load transaction. Check your connection.');
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
    if (!transaction || !service) return;

    const change = amountReceived - transaction.total;
    const receiptNumber = `RCP-${Date.now()}`;

    const completedTransaction = {
      ...transaction,
      amountReceived,
      change,
      receiptNumber,
    };

    // Show receipt immediately — same UX in both Online and Local modes
    setTransaction(completedTransaction);
    setCurrentScreen('complete');

    // Write to backend in background (Firebase or local server)
    service.completeCheckout(completedTransaction, amountReceived).catch((err) => {
      console.error('Post-payment update error:', err);
    });
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
