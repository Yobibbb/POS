'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ModeIndicatorBadge from '@/components/ModeIndicatorBadge';

export default function IdleScreen({ onScanCode, isLoading, scanError }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true
      }));
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-focus input for barcode scanner
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle barcode scanner input
  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (barcodeInput.trim() && !isLoading) {
        onScanCode(barcodeInput.trim());
        setBarcodeInput('');
      }
    }
  };

  // Keep focus on input field
  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* POS Header Bar */}
      <header className="bg-white border-b-4 border-pos-primary shadow-md">
        <div className="px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-pos-primary px-6 py-2 rounded font-bold text-white text-xl tracking-wide">
                CARTALOGUE
              </div>
              <div className="text-gray-600 text-sm">
                <div className="font-semibold">Register #1</div>
                <div className="text-xs text-gray-500">LANE 01</div>
              </div>
              <ModeIndicatorBadge />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Cashier</div>
                <div className="font-bold text-gray-800 text-lg">Dariuz Opiana</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Digital Clock Display */}
        <div className="bg-gray-800 border-4 border-gray-300 rounded-lg p-8 mb-8 shadow-xl">
          <div className="text-center">
            <div className="font-mono text-6xl font-bold text-green-400 tracking-wider mb-2">
              {currentTime}
            </div>
            <div className="font-mono text-xl text-green-300">{currentDate}</div>
          </div>
        </div>

        {/* Status Display */}
        <div className="bg-pos-success border-2 border-green-600 rounded-lg px-8 py-4 mb-8 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-xl tracking-wide uppercase">
              READY - Waiting for Customer
            </span>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="w-full max-w-3xl">
          <div className="bg-white border-4 border-gray-300 rounded-xl p-8 shadow-xl">
            <div 
              className={`bg-gray-50 border-4 border-dashed rounded-lg p-12 transition-all mb-6 ${
                isLoading
                  ? 'border-yellow-400 bg-yellow-50 cursor-wait'
                  : 'border-pos-primary'
              }`}
            >
              <div className="text-center">
                <div className="mb-4">
                  {isLoading ? (
                    <svg className="w-20 h-20 mx-auto text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-20 h-20 mx-auto text-pos-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  {isLoading ? 'Loading Basket...' : 'Scan or Enter Basket Code'}
                </div>
                <div className="text-gray-500 text-sm font-mono">
                  {isLoading ? 'Fetching data from database...' : 'Use a barcode scanner or type the code below'}
                </div>
              </div>
            </div>

            {/* Manual / Scanner Input Row */}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyPress}
                disabled={isLoading}
                placeholder="Scan barcode or type basket ID..."
                className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-pos-primary disabled:opacity-50 disabled:cursor-wait"
                autoFocus
              />
              <button
                onClick={() => {
                  if (barcodeInput.trim() && !isLoading) {
                    onScanCode(barcodeInput.trim());
                    setBarcodeInput('');
                  }
                }}
                disabled={!barcodeInput.trim() || isLoading}
                className="bg-pos-primary text-white px-6 py-3 rounded-lg text-lg font-bold uppercase tracking-wide hover:bg-pos-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>

            {scanError && (
              <div className="mt-4 bg-red-100 border-2 border-red-400 rounded-lg px-4 py-3 text-red-700 font-semibold text-sm">
                {scanError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-white border-t-2 border-gray-300 px-6 py-3 shadow-inner">
        <div className="flex justify-between items-center text-sm">
          <div className="text-gray-600 font-mono">
            CartAlogue POS v2.5.1
          </div>
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-mono text-xs">Network: OK</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-mono text-xs">Printer: Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
