import { rpcGetAllData, rpcPing } from '../src/rpc/data';
import {
  rpcUpsertProject,
  rpcUpsertTask,
  rpcUpsertSubscription,
  rpcUpsertLedgerEntry,
  rpcUpsertUser,
  rpcUpsertLedgerPlan,
  rpcUpsertCredential,
  rpcUpsertMinute,
  rpcUpsertDailyReport,
  rpcUpsertShared,
  rpcUpsertAttachments,
  rpcDeleteProject,
  rpcDeleteTask,
  rpcDeleteSubscription,
  rpcDeleteLedgerEntry,
  rpcDeleteUser,
  rpcDeleteLedgerPlan,
  rpcDeleteCredential,
  rpcDeleteMinute,
  rpcDeleteDailyReport,
  rpcDeleteShared,
} from '../src/rpc/crud';
import {
  rpcAppendDocWithMemo,
  rpcCreateDailyReportDoc,
  rpcCreateMinuteDoc,
  rpcCreateProjectDoc,
  rpcCreateTaskDoc,
  rpcGetLogoDataUrl,
  rpcReplaceDocWithMemo,
  rpcSetDocLinkShare,
} from '../src/rpc/docs';

type RpcRequestBody = {
  name?: unknown;
  args?: unknown;
};

type RpcResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

async function readRawBody(req: any): Promise<string> {
  return await new Promise((resolve, reject) => {
    try {
      let data = '';
      req.setEncoding?.('utf8');
      req.on?.('data', (chunk: any) => {
        data += String(chunk ?? '');
      });
      req.on?.('end', () => resolve(data));
      req.on?.('error', (err: any) => reject(err));
      // If req isn't a stream, resolve empty.
      if (!req.on) resolve('');
    } catch (e) {
      reject(e);
    }
  });
}

async function readJsonBody(req: any): Promise<RpcRequestBody> {
  // Prefer whatever the platform already parsed.
  try {
    const existing = (req as any).body;
    if (existing != null) {
      if (typeof existing === 'string') {
        try {
          return JSON.parse(existing);
        } catch {
          return {};
        }
      }
      if (typeof existing === 'object') return existing as RpcRequestBody;
    }
  } catch (e) {
    // Some runtimes expose req.body as a getter that can throw.
    console.warn('[RPC] Failed to access req.body; falling back to raw stream:', e);
  }

  const raw = await readRawBody(req);
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : JSON.stringify(e);
}

const handlers: Record<string, (...args: any[]) => Promise<any> | any> = {
  // Data
  getAllData: rpcGetAllData,
  getAllDataPlain: rpcGetAllData,
  ping: rpcPing,

  // CRUD operations
  async upsertProject(...args: any[]) {
    const saved = await rpcUpsertProject(...args);
    if (saved && saved.id && !saved.docId) {
      // Best-effort: create project doc automatically for newly-created projects.
      try {
        const r = await rpcCreateProjectDoc(String(saved.id));
        return (r as any)?.project ?? saved;
      } catch {
        return saved;
      }
    }
    return saved;
  },
  async upsertTask(...args: any[]) {
    const saved = await rpcUpsertTask(...args);
    if (saved && saved.id && !saved.docId) {
      // Best-effort: create task doc automatically for newly-created tasks.
      try {
        const r = await rpcCreateTaskDoc(String(saved.id));
        return (r as any) ?? saved;
      } catch {
        return saved;
      }
    }
    return saved;
  },
  upsertSubscription: rpcUpsertSubscription,
  upsertLedgerEntry: rpcUpsertLedgerEntry,
  upsertUser: rpcUpsertUser,
  upsertLedgerPlan: rpcUpsertLedgerPlan,
  upsertCredential: rpcUpsertCredential,
  upsertMinute: rpcUpsertMinute,
  upsertDailyReport: rpcUpsertDailyReport,
  upsertShared: rpcUpsertShared,
  upsertAttachments: rpcUpsertAttachments,
  
  deleteProject: rpcDeleteProject,
  deleteTask: rpcDeleteTask,
  deleteSubscription: rpcDeleteSubscription,
  deleteLedgerEntry: rpcDeleteLedgerEntry,
  deleteUser: rpcDeleteUser,
  deleteLedgerPlan: rpcDeleteLedgerPlan,
  deleteCredential: rpcDeleteCredential,
  deleteMinute: rpcDeleteMinute,
  deleteDailyReport: rpcDeleteDailyReport,
  deleteShared: rpcDeleteShared,

  // Docs
  getLogoDataUrl: rpcGetLogoDataUrl,
  setDocLinkShare: rpcSetDocLinkShare,
  replaceDocWithMemo: rpcReplaceDocWithMemo,
  appendDocWithMemo: rpcAppendDocWithMemo,
  createProjectDoc: rpcCreateProjectDoc,
  createTaskDoc: rpcCreateTaskDoc,
  createMinuteDoc: rpcCreateMinuteDoc,
  createDailyReportDoc: rpcCreateDailyReportDoc,

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

  const body: RpcRequestBody = await readJsonBody(req);

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
