type RpcRequestBody = {
  name?: unknown;
  args?: unknown;
};

type RpcResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

import { rpcGetAllData, rpcPing } from '../src/rpc/data';
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

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : JSON.stringify(e);
}

const handlers: Record<string, (...args: any[]) => Promise<any> | any> = {
  // Data
  getAllData: rpcGetAllData,
  getAllDataPlain: rpcGetAllData,
  ping: rpcPing,

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
    const result = await fn(...args);
    res.statusCode = 200;
    const out: RpcResponse = { ok: true, result };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 500;
    const out: RpcResponse = { ok: false, error: errorMessage(e) };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  }
}
