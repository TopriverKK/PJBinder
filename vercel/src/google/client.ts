import { google } from 'googleapis';
import type { drive_v3, docs_v1 } from 'googleapis';
import { loadGoogleEnv } from './env';

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

  const auth = new google.auth.JWT({
    email: env.clientEmail,
    key: env.privateKey,
    scopes: [...new Set([...DRIVE_SCOPES, ...DOCS_SCOPES])],
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    docs: google.docs({ version: 'v1', auth }),
  };
}
