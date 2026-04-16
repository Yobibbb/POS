'use client';

import Link from 'next/link';
import { useMode } from '@/lib/ModeContext';

/**
 * Displays a small badge showing the current mode (LOCAL / ONLINE).
 * Drop this anywhere inside a ModeProvider tree.
 */
export default function ModeIndicatorBadge() {
  const { config } = useMode();
  const isLocal = config.mode === 'local';

  return (
    <Link
      href="/settings"
      title="Open POS Settings"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
        isLocal
          ? 'bg-orange-500 border-orange-700 text-white hover:bg-orange-600'
          : 'bg-green-600 border-green-800 text-white hover:bg-green-700'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isLocal ? 'bg-orange-200 animate-pulse' : 'bg-green-200'
        }`}
      />
      {isLocal ? 'LOCAL' : 'ONLINE'}
    </Link>
  );
}
