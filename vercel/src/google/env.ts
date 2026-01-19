import { getSetting } from '../supabase/settings.js';

export type GoogleEnv = {
  clientEmail: string;
  privateKey: string;
  driveId?: string;
  baseFolderId?: string;
  projectDocsFolderId?: string;
  minutesFolderId?: string;
  dailyReportsFolderId?: string;
  logoFileId?: string;
};

async function readSetting(name: string, fallbacks: string[] = [], required = false): Promise<string | undefined> {
  const keys = [name, ...fallbacks];
  for (const key of keys) {
    const v = await getSetting(key);
    if (v && String(v).trim()) return String(v).trim();
  }
  for (const key of keys) {
    const v = process.env[key];
    if (v && String(v).trim()) return String(v).trim();
  }
  if (required) throw new Error(`Missing setting: ${name}`);
  return undefined;
}

function normalizePrivateKey(key: string): string {
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

export async function loadGoogleEnv(): Promise<GoogleEnv> {
  const clientEmail = await readSetting('GOOGLE_CLIENT_EMAIL', ['GOOGLE_SERVICE_ACCOUNT_EMAIL'], true);
  const privateKeyRaw = await readSetting('GOOGLE_PRIVATE_KEY', [], true);
  return {
    clientEmail: String(clientEmail),
    privateKey: normalizePrivateKey(String(privateKeyRaw)),
    driveId: await readSetting('GOOGLE_DRIVE_ID'),
    baseFolderId: await readSetting('GOOGLE_BASE_FOLDER_ID', ['GOOGLE_FOLDER_ID']),
    projectDocsFolderId: await readSetting('GOOGLE_PROJECT_DOCS_FOLDER_ID'),
    minutesFolderId: await readSetting('GOOGLE_MINUTES_FOLDER_ID'),
    dailyReportsFolderId: await readSetting('GOOGLE_DAILY_REPORTS_FOLDER_ID'),
    logoFileId: await readSetting('GOOGLE_LOGO_FILE_ID'),
  };
}
