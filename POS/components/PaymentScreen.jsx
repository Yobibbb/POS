'use client';

import { useState } from 'react';

export default function PaymentScreen({ 
  transaction, 
  onConfirmPayment, 
  onBack 
}) {
  const [amountReceived, setAmountReceived] = useState('');
  
  const numericAmount = parseFloat(amountReceived) || 0;
  const change = numericAmount - transaction.total;
  const isValidAmount = numericAmount >= transaction.total;

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmountReceived(value);
    }
  };

  const handleNumberPad = (digit) => {
    if (digit === 'clear') {
      setAmountReceived('');
    } else if (digit === '.') {
      if (!amountReceived.includes('.')) {
        setAmountReceived(amountReceived + '.');
      }
    } else {
      setAmountReceived(amountReceived + digit);
    }
  };

  const handleConfirm = () => {
    if (isValidAmount) {
      onConfirmPayment(numericAmount);
    }
  };

  const quickAmount = (amount) => {
    setAmountReceived(amount.toString());
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* POS Header */}
      <header className="bg-white border-b-4 border-pos-primary px-6 py-4 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Payment Processing</h1>
            <div className="text-sm mt-1 text-gray-600">
              <span className="font-mono">Basket:</span> <span className="font-bold text-pos-primary">{transaction.basketId}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-yellow-500 px-4 py-2 rounded font-bold text-black">
              CASH ONLY
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 grid grid-cols-2 gap-6">
        {/* Left Panel - Transaction Info */}
        <div className="space-y-6">
          {/* Amount Due Display */}
          <div className="bg-black border-4 border-red-600 rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-sm text-red-400 uppercase tracking-widest mb-2 font-bold">Amount Due</div>
              <div className="font-mono text-7xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                ₱{transaction.total.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Amount Received */}
          <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-xl">
            <label className="block text-sm text-gray-700 uppercase tracking-wider mb-3 font-bold">
              Cash Tendered
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-5xl font-bold font-mono text-gray-400">
                ₱
              </span>
              <input
                type="text"
                value={amountReceived}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full pl-20 pr-6 py-6 text-6xl font-bold font-mono bg-gray-50 border-4 border-pos-primary rounded-xl focus:border-blue-600 focus:outline-none text-right text-gray-900 shadow-inner"
              />
            </div>
          </div>

          {/* Change Display */}
          <div className={`border-4 rounded-xl p-8 shadow-2xl transition-all ${
            isValidAmount ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-800' : 
            numericAmount > 0 ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-800' : 
            'bg-gray-800 border-gray-600'
          }`}>
            <div className="text-center">
              <div className="text-sm uppercase tracking-widest mb-2 font-bold text-white">
                {numericAmount === 0 ? 'Change' : isValidAmount ? 'Change to Return' : 'Insufficient Payment'}
              </div>
              <div className="font-mono text-6xl font-bold text-white drop-shadow-lg">
                {numericAmount === 0 ? '₱0.00' : isValidAmount ? `₱${change.toFixed(2)}` : `₱${Math.abs(change).toFixed(2)} SHORT`}
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {[100, 200, 500, 1000].map((amount) => (
              <button
                key={amount}
                onClick={() => quickAmount(amount)}
                className="bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-4 rounded-lg border-b-4 border-gray-900 transition-all active:border-b-0 active:mt-1"
              >
                <div className="text-xs text-gray-300">Quick</div>
                <div className="text-xl font-mono">₱{amount}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Number Pad */}
        <div className="space-y-6">
          {/* Number Pad */}
          <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-xl">
            <div className="text-sm text-gray-700 uppercase tracking-wider mb-4 font-bold text-center">
              Numeric Keypad
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberPad(num.toString())}
                  className="bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 font-bold text-4xl py-8 rounded-lg border-b-4 border-gray-400 transition-all active:border-b-0 active:mt-1 shadow-lg font-mono"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleNumberPad('.')}
                className="bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold text-4xl py-8 rounded-lg border-b-4 border-yellow-600 transition-all active:border-b-0 active:mt-1 shadow-lg"
              >
                .
              </button>
              <button
                onClick={() => handleNumberPad('0')}
                className="bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 font-bold text-4xl py-8 rounded-lg border-b-4 border-gray-400 transition-all active:border-b-0 active:mt-1 shadow-lg font-mono"
              >
                0
              </button>
              <button
                onClick={() => handleNumberPad('clear')}
                className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg py-8 rounded-lg border-b-4 border-red-700 transition-all active:border-b-0 active:mt-1 shadow-lg"
              >
                CLEAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white border-t-4 border-gray-300 px-6 py-6 shadow-lg">
        <div className="grid grid-cols-2 gap-6">
          <button
            onClick={onBack}
            className="bg-gradient-to-b from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-6 px-8 rounded-lg text-xl uppercase tracking-wide border-b-4 border-gray-600 transition-all active:border-b-0 active:mt-1 shadow-lg"
          >
            Back to Items
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValidAmount}
            className={`font-bold py-6 px-8 rounded-lg text-xl uppercase tracking-wide border-b-4 transition-all shadow-lg ${
              isValidAmount
                ? 'bg-gradient-to-b from-pos-success to-green-700 hover:from-green-600 hover:to-green-800 text-white border-green-900 active:border-b-0 active:mt-1'
                : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
            }`}
          >
            {isValidAmount ? 'Complete Payment' : 'Insufficient Amount'}
          </button>
        </div>
      </div>
    </div>
  );
}
