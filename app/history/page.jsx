'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHistory, getUnsyncedEntries } from '@/lib/services/HistoryService';
import { useSyncHistory } from '@/lib/useSyncHistory';
import ModeIndicatorBadge from '@/components/ModeIndicatorBadge';

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [expandedReceipt, setExpandedReceipt] = useState(null);
  const { triggerSync } = useSyncHistory();

  const refresh = () => {
    setEntries(getHistory());
    setUnsyncedCount(getUnsyncedEntries().length);
  };

  useEffect(() => {
    refresh();
    // Refresh when localStorage changes in another tab
    const handleStorage = (e) => {
      if (e.key === 'cartalouge_pos_history') refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      setSyncMessage('No internet connection. Connect to the internet to sync.');
      return;
    }
    setIsSyncing(true);
    setSyncMessage('');
    try {
      await triggerSync();
      refresh();
      const remaining = getUnsyncedEntries().length;
      setSyncMessage(
        remaining === 0
          ? 'All local transactions have been synced to Firebase.'
          : `Sync completed. ${remaining} transaction(s) could not be synced.`
      );
    } catch {
      setSyncMessage('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpand = (receiptNumber) => {
    setExpandedReceipt((prev) => (prev === receiptNumber ? null : receiptNumber));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-4 border-pos-primary shadow-md">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-pos-primary px-6 py-2 rounded font-bold text-white text-xl tracking-wide">
              CARTALOGUE
            </div>
            <div className="text-gray-700 font-semibold text-lg">Transaction History</div>
            <ModeIndicatorBadge />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-5 py-2 rounded-lg text-sm uppercase tracking-wide transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to POS
            </Link>
          </div>
        </div>
      </header>

      {/* Sync Banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {unsyncedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-400 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {unsyncedCount} unsynced local transaction{unsyncedCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-green-100 border border-green-400 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All transactions synced
              </span>
            )}
            {syncMessage && (
              <span className="text-sm text-gray-600">{syncMessage}</span>
            )}
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing || unsyncedCount === 0}
            className="flex items-center gap-2 bg-pos-primary hover:bg-pos-secondary disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg text-sm uppercase tracking-wide transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Syncing...' : 'Sync to Firebase'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-semibold">No transactions yet</p>
            <p className="text-sm">Completed checkouts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {entries.length} transaction{entries.length !== 1 ? 's' : ''} — newest first
            </p>
            {entries.map((entry) => (
              <div
                key={entry.receiptNumber}
                className="bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Row header — always visible */}
                <button
                  onClick={() => toggleExpand(entry.receiptNumber)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Date / Time */}
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{entry.date}</div>
                      <div className="text-xs text-gray-500">{entry.time}</div>
                    </div>

                    {/* Receipt number */}
                    <div className="font-mono text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded">
                      {entry.receiptNumber}
                    </div>

                    {/* Mode badge */}
                    {entry.mode === 'online' ? (
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                        Online
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                        Local
                      </span>
                    )}

                    {/* Sync badge */}
                    {entry.synced ? (
                      <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Synced
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                        </svg>
                        Not synced
                      </span>
                    )}

                    {/* Item count */}
                    <span className="text-xs text-gray-500">
                      {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Total + expand icon */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-gray-800">
                        ₱{entry.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedReceipt === entry.receiptNumber ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded receipt detail */}
                {expandedReceipt === entry.receiptNumber && (
                  <div className="border-t-2 border-dashed border-gray-200 px-6 py-5 bg-gray-50">
                    {/* Items table */}
                    <div className="mb-4">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Items Purchased
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-1 text-gray-600 font-semibold">Item</th>
                            <th className="text-center py-1 text-gray-600 font-semibold w-12">Qty</th>
                            <th className="text-right py-1 text-gray-600 font-semibold w-24">Price</th>
                            <th className="text-right py-1 text-gray-600 font-semibold w-24">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-1.5 text-gray-800">{item.name}</td>
                              <td className="py-1.5 text-center text-gray-600">{item.qty}</td>
                              <td className="py-1.5 text-right text-gray-600">₱{item.price.toFixed(2)}</td>
                              <td className="py-1.5 text-right font-medium text-gray-800">₱{item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Payment summary */}
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-300">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                        <div className="font-bold text-gray-800 text-lg">₱{entry.total.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Amount Received</div>
                        <div className="font-bold text-gray-800 text-lg">₱{(entry.amountReceived ?? 0).toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Change</div>
                        <div className="font-bold text-green-600 text-lg">₱{(entry.change ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
