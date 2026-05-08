'use client';

import { useState } from 'react';
import { useMode } from '@/lib/ModeContext';
import IdleScreen from '@/components/IdleScreen';
import TransactionReviewScreen from '@/components/TransactionReviewScreen';
import PaymentScreen from '@/components/PaymentScreen';
import TransactionCompleteScreen from '@/components/TransactionCompleteScreen';
import { saveHistoryEntry } from '@/lib/services/HistoryService';

export default function Home() {
  const { service, config } = useMode();

  const [currentScreen, setCurrentScreen] = useState('idle');
  const [transaction, setTransaction] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

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
    setSyncError(null);

    // Save to local history for the History page (and future sync)
    saveHistoryEntry(completedTransaction, config.mode);

    // Write to backend in background (Firebase or local server)
    try {
      console.log(`[POS] Completing checkout in ${config.mode} mode:`, completedTransaction.checkoutCode);
      await service.completeCheckout(completedTransaction, amountReceived);
      console.log('[POS] Payment synced successfully to backend');
    } catch (err) {
      const errorMsg = err.message || 'Failed to sync payment to backend';
      console.error('[POS] Post-payment sync error:', errorMsg);
      setSyncError(errorMsg);
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
          syncError={syncError}
        />
      )}
    </main>
  );
}
