// Cache environment variables to avoid repeated reads
let cachedEnv: { url: string; serviceRoleKey: string } | null = null;

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
  
  console.error(`Missing environment variable: ${name}`);
  throw new Error(`Missing env: ${name}. Please set ${name} in your environment variables.`);
}

function getEnv() {
  if (cachedEnv) return cachedEnv;
  
  try {
    cachedEnv = {
      url: req('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']).replace(/\/+$/, ''),
      serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_KEY']),
    };
    return cachedEnv;
  } catch (e) {
    console.error('Environment configuration error:', e);
    throw e;
  }
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

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Retry on 429 (rate limit) or 5xx errors
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = backoff * Math.pow(2, attempt - 1);
        console.warn(`[Supabase] Retry ${attempt}/${retries} after ${delay}ms for ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return res;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[Supabase] Request timeout for ${url}`);
      }
      if (attempt === retries) throw err;
      
      const delay = backoff * Math.pow(2, attempt - 1);
      console.warn(`[Supabase] Retry ${attempt}/${retries} after ${delay}ms due to error:`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: Max retries exceeded');
}

export async function sbSelectAll(table: string, query = 'select=*', pageSize = 1000): Promise<any[]> {
  const { url } = getEnv();
  const out: any[] = [];

  console.log(`[Supabase] Fetching all rows from ${table}`);
  
  // PostgREST supports RFC7233-style ranges.
  for (let offset = 0; offset < 200_000; offset += pageSize) {
    const from = offset;
    const to = offset + pageSize - 1;

    const path = `${encodeURIComponent(table)}?${query}`;
    const fullUrl = `${url}/rest/v1/${path}`;
    
    try {
      const res = await fetchWithRetry(fullUrl, {
        method: 'GET',
        headers: baseHeaders({
          Range: `${from}-${to}`,
          'Range-Unit': 'items',
        }) as any,
      });

      const text = await res.text();
      if (!res.ok) {
        console.error(`[Supabase] Error ${res.status} for ${table}:`, text);
        throw new Error(`Supabase ${res.status} ${table}: ${text}`);
      }

      const rows = text ? JSON.parse(text) : [];
      if (!Array.isArray(rows)) return out;
      out.push(...rows);

      if (rows.length < pageSize) break;
    } catch (err) {
      console.error(`[Supabase] Failed to fetch ${table}:`, err);
      throw err;
    }
  }

  console.log(`[Supabase] Fetched ${out.length} rows from ${table}`);
  return out;
}

export async function sbSelectAllSafe(table: string, query = 'select=*'): Promise<any[]> {
  try {
    return await sbSelectAll(table, query);
  } catch (err) {
    console.error(`[Supabase] sbSelectAllSafe failed for ${table}:`, err);
    return [];
  }
}
