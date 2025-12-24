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

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  // NOTE: These are the exact specifiers used by api/rpc.ts.
  const specs = [
    '../src/rpc/data.js',
    '../src/rpc/crud.js',
    '../src/rpc/docs.js',
    '../src/rpc/attendance.js',
    '../src/supabase/selectAll.js',
    '../src/supabase/rest.js',
  ];

  const results = await Promise.all(specs.map((s) => probe(s)));

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
