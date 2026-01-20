import { sbSelectAllSafe } from './selectAll.js';
import { sbSelect } from './rest.js';
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
  
  const cached = settingsCache[tenantId]?.[key];
  if (cached && String(cached).trim()) return cached;
  try {
    const legacyRows = await sbSelect(
      'settings',
      `select=key,value&tenant_id=is.null&key=eq.${encodeURIComponent(key)}&limit=1`
    );
    const legacyRow = Array.isArray(legacyRows) ? legacyRows[0] : null;
    const legacyValue = legacyRow?.value;
    if (legacyValue && String(legacyValue).trim()) {
      try {
        await setSetting(key, String(legacyValue));
      } catch (_e) {
        // If migration fails, still use the legacy value for this request.
      }
      return String(legacyValue).trim();
    }
  } catch (_e) {
    // ignore legacy fallback failures
  }
  try {
    const rows = await sbSelect('settings_template', `select=key,value&key=eq.${encodeURIComponent(key)}&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    const fallback = row?.value;
    if (fallback && String(fallback).trim()) return String(fallback).trim();
  } catch (_e) {
    // ignore template fallback failures
  }
  return cached || null;
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
