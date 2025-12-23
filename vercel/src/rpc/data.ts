import { sbSelectAllSafe } from '../supabase/selectAll';

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

export async function rpcGetAllData(): Promise<AllData> {
  // Table names follow the existing Supabase schema used by GAS.
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
  ] = await Promise.all([
    sbSelectAllSafe('Users'),
    sbSelectAllSafe('Projects'),
    sbSelectAllSafe('Tasks'),
    sbSelectAllSafe('Subscriptions'),
    sbSelectAllSafe('Ledger'),
    sbSelectAllSafe('LedgerPlans'),
    sbSelectAllSafe('Credentials'),
    sbSelectAllSafe('Attachments'),
    sbSelectAllSafe('Minutes'),
    sbSelectAllSafe('DailyReports'),
    // shareds はlowercaseの可能性が高い
    sbSelectAllSafe('shareds'),
  ]);

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
