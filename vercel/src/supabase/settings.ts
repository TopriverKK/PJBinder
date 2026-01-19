import { sbSelectAllSafe } from './selectAll.js';
import { requireTenantId } from './tenant.js';

const settingsCache: Record<string, Record<string, string>> = {};
const cacheTime: Record<string, number> = {};
const CACHE_TTL = 60000; // 1 minute

export async function getSetting(key: string): Promise<string | null> {
  const tenantId = requireTenantId('settings');
  const now = Date.now();
  
  // Refresh cache if expired
  if (!settingsCache[tenantId] || now - (cacheTime[tenantId] || 0) > CACHE_TTL) {
    const rows = await sbSelectAllSafe('settings', 'select=key,value');
    settingsCache[tenantId] = {};
    for (const row of rows) {
      settingsCache[tenantId][row.key] = row.value;
    }
    cacheTime[tenantId] = now;
  }
  
  return settingsCache[tenantId]?.[key] || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { sbUpsert } = await import('./rest.js');
  const updatedAt = new Date().toISOString();
  try {
    await sbUpsert('settings', { key, value, updatedAt }, 'tenant_id,key');
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/no unique|unique constraint|on_conflict/i.test(msg)) {
      await sbUpsert('settings', { key, value, updatedAt });
    } else {
      throw e;
    }
  }
  
  // Invalidate cache
  const tenantId = requireTenantId('settings');
  delete settingsCache[tenantId];
  delete cacheTime[tenantId];
}
