type ImportResult =
  | { ok: true; spec: string; keys: string[] }
  | { ok: false; spec: string; error: string };

function errToString(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}\n${e.stack ?? ''}`.trim();
  return typeof e === 'string' ? e : JSON.stringify(e);
}

async function probe(spec: string): Promise<ImportResult> {
  try {
    const m: any = await import(spec);
    return { ok: true, spec, keys: Object.keys(m || {}).sort() };
  } catch (e) {
    return { ok: false, spec, error: errToString(e) };
  }
}

async function probeImport(spec: string, importer: () => Promise<any>): Promise<ImportResult> {
  try {
    const m: any = await importer();
    return { ok: true, spec, keys: Object.keys(m || {}).sort() };
  } catch (e) {
    return { ok: false, spec, error: errToString(e) };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  // NOTE:
  // Vercel serverless functions are file-traced/bundled per route.
  // If we only call import(spec) with a dynamic spec string, those modules may
  // not be included in the bundle. Keep these as explicit import() calls so the
  // tracer can include the files.
  const results = await Promise.all([
    probeImport('../src/rpc/data.js', () => import('../src/rpc/data.js')),
    probeImport('../src/rpc/crud.js', () => import('../src/rpc/crud.js')),
    probeImport('../src/rpc/docs.js', () => import('../src/rpc/docs.js')),
    probeImport('../src/rpc/attendance.js', () => import('../src/rpc/attendance.js')),
    probeImport('../src/supabase/selectAll.js', () => import('../src/supabase/selectAll.js')),
    probeImport('../src/supabase/rest.js', () => import('../src/supabase/rest.js')),
  ]);

  res.statusCode = results.every((r) => r.ok) ? 200 : 500;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: results.every((r) => r.ok),
      now: new Date().toISOString(),
      node: process.version,
      results,
    })
  );
}
