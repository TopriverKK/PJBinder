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

function main() {
  const email = req('GOOGLE_CLIENT_EMAIL');
  const key = req('GOOGLE_PRIVATE_KEY');

  const keyNormalized = key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;

  console.log('GOOGLE_CLIENT_EMAIL:', email);
  console.log('GOOGLE_PRIVATE_KEY looks like PEM:', keyNormalized.includes('BEGIN PRIVATE KEY'));
  console.log('GOOGLE_DRIVE_ID:', opt('GOOGLE_DRIVE_ID') || '(none)');
  console.log('GOOGLE_BASE_FOLDER_ID:', opt('GOOGLE_BASE_FOLDER_ID') || '(none)');
  console.log('GOOGLE_PROJECT_DOCS_FOLDER_ID:', opt('GOOGLE_PROJECT_DOCS_FOLDER_ID') || '(none)');
  console.log('GOOGLE_MINUTES_FOLDER_ID:', opt('GOOGLE_MINUTES_FOLDER_ID') || '(none)');
  console.log('GOOGLE_DAILY_REPORTS_FOLDER_ID:', opt('GOOGLE_DAILY_REPORTS_FOLDER_ID') || '(none)');

  console.log('SUPABASE_URL:', opt('SUPABASE_URL') ? '(set)' : '(none)');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', opt('SUPABASE_SERVICE_ROLE_KEY') ? '(set)' : '(none)');
}

main();
