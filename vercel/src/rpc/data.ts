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
  // Table names are all lowercase in Supabase
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
    sbSelectAllSafe('users'),
    sbSelectAllSafe('projects'),
    sbSelectAllSafe('tasks'),
    sbSelectAllSafe('subscriptions'),
    sbSelectAllSafe('ledger'),
    sbSelectAllSafe('ledgerplans'),
    sbSelectAllSafe('credentials'),
    sbSelectAllSafe('attachments'),
    sbSelectAllSafe('minutes'),
    sbSelectAllSafe('dailyreports'),
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
