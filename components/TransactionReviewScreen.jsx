'use client';

import ModeIndicatorBadge from '@/components/ModeIndicatorBadge';

export default function TransactionReviewScreen({ 
  transaction, 
  onProceedToPayment, 
  onCancel 
}) {
  const itemCount = transaction.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* POS Header */}
      <header className="bg-white border-b-4 border-pos-primary px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Transaction Review</h1>
            <div className="flex gap-6 text-sm mt-1">
              <div className="text-gray-600">
                <span className="font-mono">Basket:</span> <span className="font-bold text-pos-primary">{transaction.basketId}</span>
              </div>
              <div className="text-gray-600">
                <span className="font-mono">Time:</span> <span className="text-gray-800">{transaction.timestamp}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModeIndicatorBadge />
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase">Register #1</div>
              <div className="font-bold text-gray-800">Juan Dela Cruz</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Items List */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Items Table */}
          <div className="bg-white border-4 border-gray-300 rounded-lg shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-pos-secondary to-pos-primary text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">Item Description</th>
                  <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider">Price</th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {transaction.items.map((item, index) => (
                  <tr key={index} className="border-b-2 border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">₱{item.price.toFixed(2)} each</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="bg-gray-200 px-4 py-1 rounded-full font-bold text-gray-800">
                        {item.qty}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">
                      ₱{item.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-lg text-gray-900">
                      ₱{item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Totals and Actions */}
      <div className="bg-white border-t-4 border-gray-300 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Totals Section */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Items</div>
              <div className="text-3xl font-bold text-gray-800 font-mono">{itemCount}</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Subtotal</div>
              <div className="text-3xl font-bold text-gray-800 font-mono">₱{transaction.total.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-r from-pos-success to-green-600 rounded-lg p-4 border-2 border-green-700 shadow-lg">
              <div className="text-xs text-green-100 uppercase tracking-wide mb-1">Total Due</div>
              <div className="text-4xl font-bold text-white font-mono">₱{transaction.total.toFixed(2)}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onCancel}
              className="bg-pos-danger hover:bg-red-700 text-white font-bold py-6 px-8 rounded-lg text-xl uppercase tracking-wide border-b-4 border-red-900 transition-all active:border-b-0 active:mt-1 shadow-lg"
            >
              Cancel Transaction
            </button>
            <button
              onClick={onProceedToPayment}
              className="bg-pos-success hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg text-xl uppercase tracking-wide border-b-4 border-green-900 transition-all active:border-b-0 active:mt-1 shadow-lg"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
