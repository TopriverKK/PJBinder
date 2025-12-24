import type { drive_v3, docs_v1 } from 'googleapis';
import { createRequire } from 'module';
import { loadGoogleEnv } from './env';

// Works in both CommonJS and ESM runtimes.
// - In CJS: `require` exists.
// - In ESM: use createRequire with a stable base path.
const localRequire: NodeRequire =
  typeof require === 'function' ? (require as unknown as NodeRequire) : createRequire(process.cwd() + '/');

let cachedGoogle: any | null = null;

function getGoogleModule(): any {
  if (cachedGoogle) return cachedGoogle;
  // Lazy-load to avoid import-time crashes for non-Docs RPCs (e.g., getAllData on app load).
  const mod = localRequire('googleapis');
  cachedGoogle = mod?.google ?? mod;
  return cachedGoogle;
}

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
];
const DOCS_SCOPES = [
  'https://www.googleapis.com/auth/documents',
];

export type GoogleClients = {
  drive: drive_v3.Drive;
  docs: docs_v1.Docs;
};

export function getGoogleClients(): GoogleClients {
  const env = loadGoogleEnv();

  const google = getGoogleModule();

  const auth = new google.auth.JWT({
    email: env.clientEmail,
    key: env.privateKey,
    scopes: [...new Set([...DRIVE_SCOPES, ...DOCS_SCOPES])],
  });

  cachedClients = {
    drive: google.drive({ version: 'v3', auth }),
    docs: google.docs({ version: 'v1', auth }),
  };

  return cachedClients;
}
