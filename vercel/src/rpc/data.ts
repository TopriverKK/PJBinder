import { sbSelectAllSafe } from '../supabase/selectAll.js';
import { sbDelete, sbUpsert } from '../supabase/rest.js';

export type AllData = {
  version: string | null;
  users: any[];
  projects: any[];
  tasks: any[];
  subs: any[];
  ledger: any[];
  ledgerPlans: any[];
  credentials: any[];
  attachments: any[];
  minutes: any[];
  dailyReports: any[];
  shareds: any[];
};

// Batch fetch to limit concurrent requests and avoid connection pool exhaustion
async function batchFetch<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

export async function rpcGetAllData(): Promise<AllData> {
  console.log('[rpcGetAllData] Starting data fetch...');
  
  // Fetch tables in batches of 3 to avoid overwhelming Supabase connection pool
  const tableNames = [
    'users',
    'projects', 
    'tasks',
    'subscriptions',
    'ledger',
    'ledgerplans',
    'credentials',
    'attachments',
    'minutes',
    'dailyreports',
    'shareds',
  ];
  
  const fetchTasks = tableNames.map(table => () => sbSelectAllSafe(table));
  const results = await batchFetch(fetchTasks, 3);
  
  const [
    users,
    projects,
    tasks,
    subs,
    ledger,
    ledgerPlans,
    credentials,
    attachments,
    minutes,
    dailyReports,
    shareds,
  ] = results;

  console.log('[rpcGetAllData] Data fetch complete');
  
  return {
    version: null,
    users,
    projects,
    tasks,
    subs,
    ledger,
    ledgerPlans,
    credentials,
    attachments,
    minutes,
    dailyReports,
    shareds,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function ensureId(input: any, prefix: string) {
  const existing = input && typeof input.id === 'string' ? input.id : input && input.id != null ? String(input.id) : '';
  if (existing) return existing;
  // keep ids short-ish but unique enough for UI
  return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
}

function ensureUpdatedAt(input: any) {
  return input && input.updatedAt ? input.updatedAt : nowIso();
}

function ensureCreatedAt(input: any) {
  return input && input.createdAt ? input.createdAt : nowIso();
}

function deriveUserIdFromEmailOrName(input: any) {
  const explicit = input && input.id != null ? String(input.id).trim() : '';
  if (explicit) return explicit;

  const email = input && input.email != null ? String(input.email).trim() : '';
  const local = email.includes('@') ? email.split('@')[0] : email;
  const base = (local || (input && input.name != null ? String(input.name) : '')).trim();
  const normalized = base.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  if (normalized) return normalized.toUpperCase().slice(0, 32);

  return `USER_${crypto.randomUUID().slice(0, 8)}`;
}

export async function rpcUpsertProject(p: any) {
  const id = ensureId(p, 'p');
  const row = {
    ...(p || {}),
    id,
    updatedAt: ensureUpdatedAt(p),
    createdAt: ensureCreatedAt(p),
  };
  return await sbUpsert('projects', row, 'id');
}

export async function rpcUpsertTask(t: any) {
  const id = ensureId(t, 't');
  const row = {
    ...(t || {}),
    id,
    updatedAt: ensureUpdatedAt(t),
    createdAt: ensureCreatedAt(t),
  };
  return await sbUpsert('tasks', row, 'id');
}

export async function rpcUpsertSubscription(s: any) {
  const id = ensureId(s, 'sub');
  const row = {
    ...(s || {}),
    id,
    updatedAt: ensureUpdatedAt(s),
    createdAt: ensureCreatedAt(s),
  };
  return await sbUpsert('subscriptions', row, 'id');
}

export async function rpcUpsertLedgerEntry(e: any) {
  const id = ensureId(e, 'le');
  const row = {
    ...(e || {}),
    id,
    updatedAt: ensureUpdatedAt(e),
    createdAt: ensureCreatedAt(e),
  };
  return await sbUpsert('ledger', row, 'id');
}

export async function rpcUpsertLedgerPlan(p: any) {
  const id = ensureId(p, 'lp');
  const row = {
    ...(p || {}),
    id,
    updatedAt: ensureUpdatedAt(p),
    createdAt: ensureCreatedAt(p),
  };
  return await sbUpsert('ledgerplans', row, 'id');
}

export async function rpcUpsertDailyReport(r: any) {
  const id = ensureId(r, 'dr');
  const row = {
    ...(r || {}),
    id,
    updatedAt: ensureUpdatedAt(r),
    createdAt: ensureCreatedAt(r),
  };
  return await sbUpsert('dailyreports', row, 'id');
}

export async function rpcUpsertShared(s: any) {
  const id = ensureId(s, 'sh');
  const row = {
    ...(s || {}),
    id,
    updatedAt: ensureUpdatedAt(s),
    createdAt: ensureCreatedAt(s),
  };
  return await sbUpsert('shareds', row, 'id');
}

export async function rpcUpsertCredential(c: any) {
  const id = ensureId(c, 'cred');
  const row = {
    ...(c || {}),
    id,
    updatedAt: ensureUpdatedAt(c),
    createdAt: ensureCreatedAt(c),
  };
  return await sbUpsert('credentials', row, 'id');
}

export async function rpcUpsertUser(u: any) {
  const id = deriveUserIdFromEmailOrName(u);
  const row = {
    ...(u || {}),
    id,
    updatedAt: ensureUpdatedAt(u),
    createdAt: ensureCreatedAt(u),
  };
  return await sbUpsert('users', row, 'id');
}

export async function rpcUpsertAttachments(kind: any, parentId: any, items: any[]) {
  const parentType = String(kind || '').trim();
  const pid = String(parentId || '').trim();
  const list = Array.isArray(items) ? items : [];
  if (!parentType || !pid) throw new Error('upsertAttachments: kind ‚Æ id ‚Í•K{‚Å‚·');

  const createdAt = nowIso();
  await Promise.all(
    list.map((it) => {
      const row = {
        id: `att_${crypto.randomUUID().slice(0, 12)}`,
        parentType,
        parentId: pid,
        type: it?.type ?? null,
        title: it?.title ?? null,
        url: it?.url ?? null,
        fileId: it?.fileId ?? null,
        createdAt,
        updatedAt: createdAt,
      };
      return sbUpsert('attachments', row, 'id');
    })
  );

  return { ok: true };
}

export async function rpcDeleteUser(id: string) {
  return await sbDelete('users', String(id));
}

export async function rpcDeleteTask(id: string) {
  return await sbDelete('tasks', String(id));
}

export async function rpcDeleteMinute(id: string) {
  return await sbDelete('minutes', String(id));
}

export async function rpcDeleteSubscription(id: string) {
  return await sbDelete('subscriptions', String(id));
}

export async function rpcDeleteLedgerPlan(id: string) {
  return await sbDelete('ledgerplans', String(id));
}

export async function rpcDeleteCredential(id: string) {
  return await sbDelete('credentials', String(id));
}

export async function rpcDeleteShared(id: string) {
  return await sbDelete('shareds', String(id));
}

export async function rpcPing() {
  const d = await rpcGetAllData();
  return {
    ok: true,
    counts: {
      users: d.users.length,
      projects: d.projects.length,
      tasks: d.tasks.length,
      subs: d.subs.length,
      ledger: d.ledger.length,
      credentials: d.credentials.length,
    },
    now: new Date().toISOString(),
  };
}
