import {
  rpcDeleteCredential,
  rpcDeleteLedgerPlan,
  rpcDeleteMinute,
  rpcDeleteShared,
  rpcDeleteSubscription,
  rpcDeleteTask,
  rpcDeleteUser,
  rpcGetAllData,
  rpcPing,
  rpcUpsertAttachments,
  rpcUpsertCredential,
  rpcUpsertDailyReport,
  rpcUpsertLedgerEntry,
  rpcUpsertLedgerPlan,
  rpcUpsertProject,
  rpcUpsertShared,
  rpcUpsertSubscription,
  rpcUpsertTask,
  rpcUpsertUser,
} from '../src/rpc/data';

type RpcRequestBody = {
  name?: unknown;
  args?: unknown;
};

type RpcResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : JSON.stringify(e);
}

const handlers: Record<string, (...args: any[]) => Promise<any> | any> = {
  // Data
  getAllData: rpcGetAllData,
  getAllDataPlain: rpcGetAllData,
  ping: rpcPing,

  // Mutations (Supabase)
  upsertProject: rpcUpsertProject,
  upsertTask: rpcUpsertTask,
  upsertUser: rpcUpsertUser,
  upsertCredential: rpcUpsertCredential,
  upsertSubscription: rpcUpsertSubscription,
  upsertLedgerEntry: rpcUpsertLedgerEntry,
  upsertLedgerPlan: rpcUpsertLedgerPlan,
  upsertDailyReport: rpcUpsertDailyReport,
  upsertShared: rpcUpsertShared,
  upsertAttachments: rpcUpsertAttachments,

  deleteUser: rpcDeleteUser,
  deleteTask: rpcDeleteTask,
  deleteMinute: rpcDeleteMinute,
  deleteSubscription: rpcDeleteSubscription,
  deleteLedgerPlan: rpcDeleteLedgerPlan,
  deleteCredential: rpcDeleteCredential,
  deleteShared: rpcDeleteShared,

  // CRUD operations (lazy import)
  async upsertProject(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertProject(...args);
  },
  async upsertTask(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertTask(...args);
  },
  async upsertSubscription(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertSubscription(...args);
  },
  async upsertLedgerEntry(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertLedgerEntry(...args);
  },
  async upsertUser(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertUser(...args);
  },
  async upsertLedgerPlan(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertLedgerPlan(...args);
  },
  async upsertCredential(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertCredential(...args);
  },
  async upsertMinute(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertMinute(...args);
  },
  async upsertDailyReport(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcUpsertDailyReport(...args);
  },
  
  async deleteProject(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteProject(...args);
  },
  async deleteTask(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteTask(...args);
  },
  async deleteSubscription(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteSubscription(...args);
  },
  async deleteLedgerEntry(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteLedgerEntry(...args);
  },
  async deleteUser(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteUser(...args);
  },
  async deleteLedgerPlan(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteLedgerPlan(...args);
  },
  async deleteCredential(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteCredential(...args);
  },
  async deleteMinute(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteMinute(...args);
  },
  async deleteDailyReport(...args: any[]) {
    const m = await import('../src/rpc/crud');
    return m.rpcDeleteDailyReport(...args);
  },

  // Docs
  // (lazy import to avoid loading googleapis on every cold start)
  async getLogoDataUrl() {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcGetLogoDataUrl();
  },
  async setDocLinkShare(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcSetDocLinkShare(...args);
  },
  async replaceDocWithMemo(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcReplaceDocWithMemo(...args);
  },
  async appendDocWithMemo(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcAppendDocWithMemo(...args);
  },
  async createProjectDoc(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcCreateProjectDoc(...args);
  },
  async createTaskDoc(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcCreateTaskDoc(...args);
  },
  async createMinuteDoc(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcCreateMinuteDoc(...args);
  },
  async createDailyReportDoc(...args: any[]) {
    const m = await import('../src/rpc/docs');
    return (m as any).rpcCreateDailyReportDoc(...args);
  },

  // Minimal stubs so the copied UI can boot on Vercel.

  async getSpreadsheetInfo() {
    return { url: null, name: null, id: null, via: 'vercel' };
  },

  async debugPeek(_table: unknown, _limit: unknown) {
    return { rows: [] };
  },

  async getUsageGuideHtml() {
    return '<div style="padding:12px">使い方ガイドは移行中です。</div>';
  },
};

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    const body: RpcResponse = { ok: false, error: 'Method Not Allowed' };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
    return;
  }

  let body: RpcRequestBody = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const name = typeof body?.name === 'string' ? body.name : '';
  const args = Array.isArray(body?.args) ? body.args : [];

  const fn = handlers[name];
  if (!fn) {
    res.statusCode = 404;
    const out: RpcResponse = { ok: false, error: `Unknown RPC: ${name}` };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
    return;
  }

  try {
    console.log(`[RPC] Calling ${name} with args:`, JSON.stringify(args));
    const result = await fn(...args);
    console.log(`[RPC] ${name} succeeded`);
    res.statusCode = 200;
    const out: RpcResponse = { ok: true, result };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  } catch (e) {
    console.error(`[RPC] ${name} failed:`, e);
    console.error('Stack:', e instanceof Error ? e.stack : 'no stack');
    res.statusCode = 500;
    const out: RpcResponse = { ok: false, error: errorMessage(e) };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  }
}
