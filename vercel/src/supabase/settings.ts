import { sbSelectAllSafe } from './selectAll';

let settingsCache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now();
  
  // Refresh cache if expired
  if (!settingsCache || now - cacheTime > CACHE_TTL) {
    const rows = await sbSelectAllSafe('settings');
    settingsCache = {};
    for (const row of rows) {
      settingsCache[row.key] = row.value;
    }
    cacheTime = now;
  }
  
  return settingsCache[key] || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { sbUpsert } = await import('./rest');
  await sbUpsert('settings', { key, value }, 'key');
  
  // Invalidate cache
  settingsCache = null;
}
