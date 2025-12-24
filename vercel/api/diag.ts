type Diag = {
  ok: true;
  now: string;
  node: string;
  hasFetch: boolean;
  vercel: Record<string, string | null>;
  env: Record<string, boolean>;
};

function has(name: string) {
  const v = process.env[name];
  return !!(v && String(v).trim());
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const out: Diag = {
    ok: true,
    now: new Date().toISOString(),
    node: process.version,
    hasFetch: typeof (globalThis as any).fetch === 'function',
    vercel: {
      VERCEL: process.env.VERCEL ? String(process.env.VERCEL) : null,
      VERCEL_ENV: process.env.VERCEL_ENV ? String(process.env.VERCEL_ENV) : null,
      VERCEL_REGION: process.env.VERCEL_REGION ? String(process.env.VERCEL_REGION) : null,
      VERCEL_URL: process.env.VERCEL_URL ? String(process.env.VERCEL_URL) : null,
      VERCEL_GIT_PROVIDER: process.env.VERCEL_GIT_PROVIDER ? String(process.env.VERCEL_GIT_PROVIDER) : null,
      VERCEL_GIT_REPO_SLUG: process.env.VERCEL_GIT_REPO_SLUG ? String(process.env.VERCEL_GIT_REPO_SLUG) : null,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ? String(process.env.VERCEL_GIT_COMMIT_REF) : null,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ? String(process.env.VERCEL_GIT_COMMIT_SHA) : null,
      VERCEL_GIT_COMMIT_MESSAGE: process.env.VERCEL_GIT_COMMIT_MESSAGE ? String(process.env.VERCEL_GIT_COMMIT_MESSAGE) : null,
    },
    env: {
      SUPABASE_URL: has('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
      GOOGLE_CLIENT_EMAIL: has('GOOGLE_CLIENT_EMAIL'),
      GOOGLE_PRIVATE_KEY: has('GOOGLE_PRIVATE_KEY'),
      GOOGLE_DRIVE_ID: has('GOOGLE_DRIVE_ID'),
      GOOGLE_BASE_FOLDER_ID: has('GOOGLE_BASE_FOLDER_ID'),
      GOOGLE_PROJECT_DOCS_FOLDER_ID: has('GOOGLE_PROJECT_DOCS_FOLDER_ID'),
      GOOGLE_MINUTES_FOLDER_ID: has('GOOGLE_MINUTES_FOLDER_ID'),
      GOOGLE_DAILY_REPORTS_FOLDER_ID: has('GOOGLE_DAILY_REPORTS_FOLDER_ID'),
      GOOGLE_LOGO_FILE_ID: has('GOOGLE_LOGO_FILE_ID'),
    },
  };

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out));
}
