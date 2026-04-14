'use client';

export default function TransactionCompleteScreen({ 
  transaction, 
  onNextCustomer 
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* POS Header */}
      <header className="bg-white border-b-4 border-pos-success px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-pos-success uppercase tracking-wide">✓ Payment Completed</h1>
            <div className="text-sm mt-1 text-gray-600">
              <span className="font-mono">Receipt:</span> <span className="font-bold text-pos-primary">{transaction.receiptNumber}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-pos-success px-4 py-2 rounded font-bold text-white animate-pulse">
              SUCCESS
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Receipt Display */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-gray-300">
            {/* Receipt Header */}
            <div className="bg-gradient-to-r from-pos-secondary to-pos-primary text-white p-6 text-center">
              <div className="text-3xl font-bold mb-2">CARTALOGUE STORE</div>
              <div className="text-sm">Smart Basket Checkout System</div>
              <div className="text-xs mt-2">123 Market Street, Manila</div>
              <div className="text-xs">Tel: (02) 1234-5678</div>
            </div>

            {/* Success Icon */}
            <div className="bg-pos-success py-8">
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-white text-2xl font-bold mt-3">PAYMENT SUCCESSFUL</div>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 receipt-text bg-gray-50">
              <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">Receipt No:</div>
                  <div className="font-bold text-right">{transaction.receiptNumber}</div>
                  
                  <div className="text-gray-600">Basket ID:</div>
                  <div className="font-bold text-right">{transaction.basketId}</div>
                  
                  <div className="text-gray-600">Date/Time:</div>
                  <div className="font-bold text-right">{transaction.timestamp}</div>
                  
                  <div className="text-gray-600">Cashier:</div>
                  <div className="font-bold text-right">Juan Dela Cruz (C-001)</div>
                  
                  <div className="text-gray-600">Register:</div>
                  <div className="font-bold text-right">Lane 01 - Register #1</div>
                </div>
              </div>

              {/* Items List */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                <div className="font-bold mb-3 text-gray-700">ITEMS PURCHASED:</div>
                {transaction.items.map((item, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex justify-between text-sm font-semibold">
                      <div>{item.name}</div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <div>SKU: {item.sku}</div>
                      <div>{item.qty} x ₱{item.price.toFixed(2)} = ₱{item.subtotal.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <div>TOTAL:</div>
                  <div>₱{transaction.total.toFixed(2)}</div>
                </div>
                <div className="flex justify-between text-base border-t-2 border-gray-300 pt-2">
                  <div className="text-gray-600">Cash Tendered:</div>
                  <div className="font-semibold">₱{transaction.amountReceived?.toFixed(2)}</div>
                </div>
                <div className="flex justify-between text-xl font-bold text-pos-success">
                  <div>CHANGE:</div>
                  <div>₱{transaction.change?.toFixed(2)}</div>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-400 pt-4 text-center">
                <div className="text-sm font-bold mb-2">PAYMENT METHOD: CASH</div>
                <div className="text-xs text-gray-600 mt-4">
                  Thank you for shopping with us!
                </div>
                <div className="text-xs text-gray-600">
                  Please keep this receipt for your records
                </div>
              </div>

              {/* Barcode Simulation */}
              <div className="mt-6 text-center">
                <div className="inline-block bg-white border-2 border-gray-300 px-4 py-2">
                  <div className="font-mono text-xs mb-1">||||| |||| ||| |||| ||||| |||| |||</div>
                  <div className="font-mono text-xs">{transaction.receiptNumber}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={handlePrint}
              className="bg-gradient-to-b from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-6 px-8 rounded-lg text-lg uppercase tracking-wide border-b-4 border-gray-600 transition-all active:border-b-0 active:mt-1 shadow-lg flex items-center justify-center space-x-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onNextCustomer}
              className="bg-gradient-to-b from-pos-primary to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-6 px-8 rounded-lg text-lg uppercase tracking-wide border-b-4 border-blue-900 transition-all active:border-b-0 active:mt-1 shadow-lg"
            >
              Next Customer
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-white border-t-2 border-gray-300 px-6 py-3 shadow-inner">
        <div className="text-center text-sm text-gray-600 font-mono">
          Transaction completed successfully - Ready for next customer
        </div>
      </footer>
    </div>
  );
}
