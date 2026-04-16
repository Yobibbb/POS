const CONFIG_KEY = 'cartalogue_pos_config';

const DEFAULT_CONFIG = {
  mode: 'online', // 'online' | 'local'
  localServerUrl: 'http://192.168.1.100:3000',
};

export function getConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
