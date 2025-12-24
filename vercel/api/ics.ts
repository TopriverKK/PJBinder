/**
 * ICS Proxy Endpoint
 * 
 * Proxies requests to external ICS (iCalendar) files to bypass CORS restrictions.
 * Primarily used for fetching Google Calendar public ICS feeds.
 */

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const url = req.query?.url;
  
  if (!url || typeof url !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Missing or invalid url parameter' }));
    return;
  }

  // Security: Only allow calendar.google.com URLs
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.endsWith('calendar.google.com')) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Only calendar.google.com URLs are allowed' }));
      return;
    }
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Invalid URL format' }));
    return;
  }

  // Fetch the ICS file with timeout and retry
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PJBinder/1.0)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`Upstream returned ${response.status}`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw lastError;
      }

      const icsText = await response.text();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.end(icsText);
      return;

    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        console.error('[/api/ics] Request timeout for', url);
      } else {
        console.error(`[/api/ics] Attempt ${attempt} failed:`, err);
      }
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // All attempts failed
  res.statusCode = 502;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ 
    ok: false, 
    error: 'Failed to fetch ICS file from upstream',
    details: lastError?.message || 'Unknown error'
  }));
}
