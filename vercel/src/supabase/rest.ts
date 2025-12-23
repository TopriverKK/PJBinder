type SupabaseEnv = {
  url: string;
  serviceRoleKey: string;
};

function req(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env: ${name}`);
  return String(v).trim();
}

function getEnv(): SupabaseEnv {
  return {
    url: req('SUPABASE_URL').replace(/\/+$/, ''),
    serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  };
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

export async function sbSelectOneById(table: string, id: string) {
  const rows = await sbFetch(`${encodeURIComponent(table)}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`, {
    method: 'GET',
  });
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function sbUpsert(table: string, row: Record<string, any>, onConflict?: string) {
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const rows = await sbFetch(`${encodeURIComponent(table)}${qs}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify([row]),
  });
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}
