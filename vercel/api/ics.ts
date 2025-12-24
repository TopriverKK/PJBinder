// Server-side ICS proxy to avoid browser CORS issues.
// Security note: this endpoint restricts outbound requests to known-safe hosts.

const ALLOWED_HOSTS = new Set(['www.google.com', 'calendar.google.com', 'accounts.google.com']);

function text(res: any, statusCode: number, body: string, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = statusCode;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

function isPrivateHostname(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '127.0.0.1' || h === '::1') return true;
  return false;
}

function isPrivateIpV4(hostname: string) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map((v) => Number(v));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function canonicalizeIcsUrl(raw: string) {
  const input = String(raw || '').trim();
  if (!input) return '';
  const normalized = input.startsWith('http') ? input : `https://${input}`;
  try {
    const u = new URL(normalized);
    if (u.pathname.includes('/calendar/embed')) {
      const src = u.searchParams.get('src');
      if (src) {
        return `https://calendar.google.com/calendar/ical/${encodeURIComponent(src)}/public/basic.ics`;
      }
    }
    return u.toString();
  } catch {
    return normalized;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return text(res, 405, 'Method not allowed');
  }

  const urlParam = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!urlParam) {
    return text(res, 400, 'Missing url query parameter');
  }

  const target = canonicalizeIcsUrl(String(urlParam));

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return text(res, 400, 'Invalid url');
  }

  if (u.protocol !== 'https:') {
    return text(res, 400, 'Only https URLs are allowed');
  }

  if (isPrivateHostname(u.hostname) || isPrivateIpV4(u.hostname)) {
    return text(res, 400, 'Target host is not allowed');
  }

  const host = u.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host) && !host.endsWith('.google.com')) {
    return text(res, 400, 'Target host is not allowed');
  }

  const maxRetries = 3;
  const initialDelay = 500;
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const upstream = await fetch(u.toString(), {
        headers: {
          Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
          'User-Agent': 'pj-binder/ics-proxy',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!upstream.ok) {
        lastError = `Upstream returned ${upstream.status}`;
        if (upstream.status >= 500 || upstream.status === 429) {
          if (attempt < maxRetries - 1) {
            const delay = initialDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        return text(res, 502, lastError);
      }

      const icsText = await upstream.text();
      if (!icsText || !icsText.trim()) {
        lastError = 'Upstream returned empty body';
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return text(res, 502, lastError);
      }

      res.setHeader('Cache-Control', 'public, max-age=300');
      return text(res, 200, icsText, 'text/calendar; charset=utf-8');
    } catch (e: any) {
      lastError = e?.name === 'AbortError' ? 'Request timeout' : 'Upstream fetch failed';
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  return text(res, 502, `Failed after ${maxRetries} attempts: ${lastError}`);
}
