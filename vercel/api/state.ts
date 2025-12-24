/**
 * Legacy state endpoint (stub)
 * 
 * This endpoint was previously used for remote state storage via Supabase Storage.
 * It's now deprecated but kept as a stub to prevent frontend errors.
 * 
 * Returns empty state to maintain compatibility.
 */

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Handle GET - return empty state
  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, state: null, message: 'State endpoint is deprecated' }));
    return;
  }

  // Handle PUT/POST - accept but don't save
  if (req.method === 'PUT' || req.method === 'POST') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, message: 'State endpoint is deprecated, data not saved' }));
    return;
  }

  // Handle DELETE - accept but don't delete
  if (req.method === 'DELETE') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, message: 'State endpoint is deprecated' }));
    return;
  }

  // Method not allowed
  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
}
