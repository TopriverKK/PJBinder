function req(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env: ${name}`);
  return String(v).trim();
}

function getEnv() {
  return {
    url: req('SUPABASE_URL').replace(/\/+$/, ''),
    serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function baseHeaders(extra?: Record<string, string>) {
  const { serviceRoleKey } = getEnv();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: 'application/json',
    ...(extra || {}),
  };
}

export async function sbSelectAll(table: string, query = 'select=*', pageSize = 1000): Promise<any[]> {
  const { url } = getEnv();
  const out: any[] = [];

  // PostgREST supports RFC7233-style ranges.
  for (let offset = 0; offset < 200_000; offset += pageSize) {
    const from = offset;
    const to = offset + pageSize - 1;

    const path = `${encodeURIComponent(table)}?${query}`;
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method: 'GET',
      headers: baseHeaders({
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      }) as any,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status} ${table}: ${text}`);

    const rows = text ? JSON.parse(text) : [];
    if (!Array.isArray(rows)) return out;
    out.push(...rows);

    if (rows.length < pageSize) break;
  }

  return out;
}

export async function sbSelectAllSafe(table: string, query = 'select=*'): Promise<any[]> {
  try {
    return await sbSelectAll(table, query);
  } catch {
    return [];
  }
}
