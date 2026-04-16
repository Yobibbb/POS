'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { getConfig, saveConfig } from '@/lib/config';
import { FirebaseCheckoutService } from '@/lib/services/FirebaseCheckoutService';
import { LocalCheckoutService } from '@/lib/services/LocalCheckoutService';

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [config, setConfig] = useState({
    mode: 'online',
    localServerUrl: 'http://192.168.1.100:3000',
  });
  const [isClient, setIsClient] = useState(false);
  const [service, setService] = useState(null);
  const serviceRef = useRef(null);

  // Hydrate config from localStorage once on client
  useEffect(() => {
    setConfig(getConfig());
    setIsClient(true);
  }, []);

  // Recreate service whenever mode or server URL changes
  useEffect(() => {
    if (!isClient) return;

    // Dispose the previous service
    if (serviceRef.current) {
      serviceRef.current.dispose();
      serviceRef.current = null;
    }

    const svc =
      config.mode === 'local'
        ? new LocalCheckoutService(config.localServerUrl)
        : new FirebaseCheckoutService();

    serviceRef.current = svc;
    setService(svc);

    return () => {
      svc.dispose();
      serviceRef.current = null;
    };
  }, [config.mode, config.localServerUrl, isClient]);

  /**
   * Update one or more config fields, persist to localStorage, and update state.
   */
  const updateConfig = (patch) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  };

  return (
    <ModeContext.Provider value={{ config, updateConfig, service }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside ModeProvider');
  return ctx;
}
