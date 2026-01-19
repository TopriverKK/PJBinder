import { requireTenantId, isTenantScoped } from './tenant.js';

type SupabaseEnv = {
  url: string;
  serviceRoleKey: string;
};

// Cache environment variables to avoid repeated reads
let cachedEnv: SupabaseEnv | null = null;

function req(name: string, fallbackNames?: string[]): string {
  const v = process.env[name];
  if (v && String(v).trim()) {
    return String(v).trim();
  }
  
  // Try fallback names
  if (fallbackNames) {
    for (const fallback of fallbackNames) {
      const fv = process.env[fallback];
      if (fv && String(fv).trim()) {
        console.log(`Using fallback env: ${fallback} for ${name}`);
        return String(fv).trim();
      }
    }
  }
  
  throw new Error(`Missing env: ${name}`);
}

function getEnv(): SupabaseEnv {
  if (cachedEnv) return cachedEnv;
  
  cachedEnv = {
    url: req('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']).replace(/\/+$/, ''),
    serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_KEY']),
  };
  
  return cachedEnv;
}

function headers(extra?: Record<string, string>) {
  const { serviceRoleKey } = getEnv();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(extra || {}),
  };
}

function hasTenantFilter(query: string): boolean {
  return /(^|&)tenant_id=/.test(query);
}

function withTenantQuery(table: string, query: string): string {
  const q = String(query || '').trim();
  if (!isTenantScoped(table)) return q;
  if (hasTenantFilter(q)) return q;
  const tenantId = requireTenantId(table);
  const filter = `tenant_id=eq.${encodeURIComponent(tenantId)}`;
  return q ? `${q}&${filter}` : filter;
}

async function sbFetch(path: string, init?: RequestInit) {
  const { url } = getEnv();
  const res = await fetch(`${url}/rest/v1/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) } as any,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function sbSelect(table: string, query: string) {
  const q = withTenantQuery(table, String(query || '').trim());
  const suffix = q ? `?${q}` : '';
  return await sbFetch(`${encodeURIComponent(table)}${suffix}`, { method: 'GET' });
}

export async function sbSelectOneById(table: string, id: string) {
  const q = withTenantQuery(table, `select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  const rows = await sbFetch(`${encodeURIComponent(table)}?${q}`, {
    method: 'GET',
  });
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function sbUpsert(table: string, row: Record<string, any>, onConflict?: string) {
  const rowWithTenant = isTenantScoped(table)
    ? { ...row, tenant_id: requireTenantId(table) }
    : row;
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const rows = await sbFetch(`${encodeURIComponent(table)}${qs}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify([rowWithTenant]),
  });
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

export async function sbDelete(table: string, id: string) {
  const q = withTenantQuery(table, `id=eq.${encodeURIComponent(id)}`);
  await sbFetch(`${encodeURIComponent(table)}?${q}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
  return { ok: true };
}

export async function sbDeleteWhere(table: string, query: string) {
  const q = withTenantQuery(table, String(query || '').trim());
  if (!q) throw new Error('sbDeleteWhere: query is required');
  await sbFetch(`${encodeURIComponent(table)}?${q}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
  return { ok: true };
}
