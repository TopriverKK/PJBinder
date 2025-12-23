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

function req(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env: ${name}`);
  return String(v);
}

function opt(name: string): string | undefined {
  const v = process.env[name];
  const s = v == null ? '' : String(v).trim();
  return s ? s : undefined;
}

function normalizePrivateKey(key: string): string {
  // Vercelの環境変数は改行が \\n で入ることが多い
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

export function loadGoogleEnv(): GoogleEnv {
  return {
    clientEmail: req('GOOGLE_CLIENT_EMAIL'),
    privateKey: normalizePrivateKey(req('GOOGLE_PRIVATE_KEY')),
    driveId: opt('GOOGLE_DRIVE_ID'),
    baseFolderId: opt('GOOGLE_BASE_FOLDER_ID'),
    projectDocsFolderId: opt('GOOGLE_PROJECT_DOCS_FOLDER_ID'),
    minutesFolderId: opt('GOOGLE_MINUTES_FOLDER_ID'),
    dailyReportsFolderId: opt('GOOGLE_DAILY_REPORTS_FOLDER_ID'),
    logoFileId: opt('GOOGLE_LOGO_FILE_ID'),
  };
}
