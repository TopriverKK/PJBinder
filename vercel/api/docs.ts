type DocName = 'BEGINNER' | 'USER_GUIDE' | 'SPEC';

type DocsOk = { ok: true; name: DocName; markdown: string };

type DocsNg = { ok: false; error: string };

function asDocName(v: unknown): DocName | null {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'BEGINNER') return 'BEGINNER';
  if (s === 'USER_GUIDE' || s === 'USERGUIDE' || s === 'USER-GUIDE') return 'USER_GUIDE';
  if (s === 'SPEC') return 'SPEC';
  return null;
}

function sendJson(res: any, status: number, body: DocsOk | DocsNg) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const name = asDocName(req.query?.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: 'Invalid or missing name' });
    return;
  }

  // Keep built-in imports local & simple to reduce cold-start failures.
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const fileName = name === 'BEGINNER' ? 'BEGINNER.md' : name === 'USER_GUIDE' ? 'USER_GUIDE.md' : 'SPEC.md';
  const candidates = [
    // original
    path.join(process.cwd(), 'docs', fileName),
    // static docs under public (preferred for deploy reliability)
    path.join(process.cwd(), 'public', 'docs', fileName),
    // if cwd differs (e.g., running from repo root)
    path.join(process.cwd(), 'vercel', 'docs', fileName),
    path.join(process.cwd(), 'vercel', 'public', 'docs', fileName),
  ];

  try {
    let markdown: string | null = null;
    for (const p of candidates) {
      try {
        markdown = await fs.readFile(p, 'utf8');
        break;
      } catch (_e) {
        // keep trying
      }
    }
    if (markdown == null) {
      throw new Error('not found');
    }
    sendJson(res, 200, { ok: true, name, markdown });
  } catch (e: any) {
    sendJson(res, 404, { ok: false, error: `Not found: ${fileName}` });
  }
}
