'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMode } from '@/lib/ModeContext';

export default function SettingsPage() {
  const { config, updateConfig } = useMode();

  const [localUrl, setLocalUrl] = useState(config.localServerUrl);
  const [pingState, setPingState] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [pingMessage, setPingMessage] = useState('');

  const handleModeChange = (newMode) => {
    updateConfig({ mode: newMode });
  };

  const handleUrlSave = () => {
    const trimmed = localUrl.trim();
    if (!trimmed) return;
    updateConfig({ localServerUrl: trimmed });
  };

  const handleTestConnection = async () => {
    const url = localUrl.trim().replace(/\/$/, '');
    setPingState('testing');
    setPingMessage('');
    try {
      const res = await fetch(`${url}/products`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setPingState('ok');
        setPingMessage(`Connected! Server at ${url} is reachable.`);
      } else {
        setPingState('fail');
        setPingMessage(`Server responded with HTTP ${res.status}. Check the server.`);
      }
    } catch {
      setPingState('fail');
      setPingMessage(
        `Cannot reach server at ${url}. Make sure the laptop server is running and this device is on the same network.`
      );
    }
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
            <div className="text-gray-700 font-semibold text-lg">POS Settings</div>
          </div>
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
      </header>

      {/* Content */}
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-8">

        {/* Mode Selection */}
        <section className="bg-white border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 border-b-2 border-gray-300 px-6 py-3">
            <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
              Connection Mode
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Select how the POS connects to the backend. Changes are saved immediately.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* ONLINE */}
              <button
                onClick={() => handleModeChange('online')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-4 font-bold transition-all ${
                  config.mode === 'online'
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                }`}
              >
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <div className="text-center">
                  <div className="text-lg">ONLINE</div>
                  <div className="text-xs font-normal mt-1 opacity-75">Firebase / Internet</div>
                </div>
                {config.mode === 'online' && (
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                )}
              </button>

              {/* LOCAL */}
              <button
                onClick={() => handleModeChange('local')}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-4 font-bold transition-all ${
                  config.mode === 'local'
                    ? 'border-orange-500 bg-orange-50 text-orange-800'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                }`}
              >
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <div className="text-center">
                  <div className="text-lg">LOCAL</div>
                  <div className="text-xs font-normal mt-1 opacity-75">LAN Server / Offline</div>
                </div>
                {config.mode === 'local' && (
                  <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Local Server URL */}
        <section className="bg-white border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 border-b-2 border-gray-300 px-6 py-3">
            <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
              Local Server Address
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Enter the IP address of the laptop running the CartAlogue local server.
              This is only used when <strong>LOCAL</strong> mode is active.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-pos-primary"
              />
              <button
                onClick={handleUrlSave}
                className="bg-pos-primary hover:bg-pos-secondary text-white font-bold px-5 py-3 rounded-lg text-sm uppercase tracking-wide transition-colors"
              >
                Save
              </button>
            </div>

            {/* Saved URL display */}
            <div className="text-xs text-gray-500 font-mono">
              Saved: <span className="text-gray-700">{config.localServerUrl}</span>
            </div>

            {/* Test Connection */}
            <div className="pt-2">
              <button
                onClick={handleTestConnection}
                disabled={pingState === 'testing'}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-bold px-5 py-3 rounded-lg text-sm uppercase tracking-wide transition-colors disabled:opacity-50"
              >
                {pingState === 'testing' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {pingState === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>

              {pingState === 'ok' && (
                <div className="mt-3 flex items-start gap-2 bg-green-50 border-2 border-green-400 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {pingMessage}
                </div>
              )}
              {pingState === 'fail' && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border-2 border-red-400 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {pingMessage}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Info box */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-xl px-6 py-5 text-sm text-blue-800 space-y-2">
          <div className="font-bold uppercase tracking-wide">How modes work</div>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Online</strong> — uses Firebase (Firestore + Realtime DB). Requires internet.</li>
            <li><strong>Local</strong> — uses the CartAlogue Node.js server running on the demo laptop via hotspot. Zero internet required.</li>
            <li>Mode and server URL are saved in the browser and persist across page refreshes.</li>
          </ul>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-300 px-6 py-3 text-center text-xs text-gray-500 font-mono">
        CartAlogue POS — Settings
      </footer>
    </div>
  );
}
