// IMPORTANT:
// Do not import app modules at top-level.
// If any optional module (e.g., Google/Docs) fails to load, Vercel will return
// FUNCTION_INVOCATION_FAILED and ALL RPCs break. We lazy-load per RPC instead.
import { runWithTenant, getTenantId } from '../src/supabase/tenant.js';
import { sbSelect } from '../src/supabase/rest.js';

type DataMod = typeof import('../src/rpc/data.js');
type CrudMod = typeof import('../src/rpc/crud.js');
type DocsMod = typeof import('../src/rpc/docs.js');
type AttendanceMod = typeof import('../src/rpc/attendance.js');
type WeeklyMod = typeof import('../src/rpc/weekly.js');
type SettingsMod = typeof import('../src/supabase/settings.js');

let _dataMod: Promise<DataMod> | null = null;
let _crudMod: Promise<CrudMod> | null = null;
let _docsMod: Promise<DocsMod> | null = null;
let _attendanceMod: Promise<AttendanceMod> | null = null;
let _weeklyMod: Promise<WeeklyMod> | null = null;
let _settingsMod: Promise<SettingsMod> | null = null;

function getDataMod(): Promise<DataMod> {
  return (_dataMod ||= import('../src/rpc/data.js'));
}
function getCrudMod(): Promise<CrudMod> {
  return (_crudMod ||= import('../src/rpc/crud.js'));
}
function getDocsMod(): Promise<DocsMod> {
  return (_docsMod ||= import('../src/rpc/docs.js'));
}
function getAttendanceMod(): Promise<AttendanceMod> {
  return (_attendanceMod ||= import('../src/rpc/attendance.js'));
}
function getWeeklyMod(): Promise<WeeklyMod> {
  return (_weeklyMod ||= import('../src/rpc/weekly.js'));
}
function getSettingsMod(): Promise<SettingsMod> {
  return (_settingsMod ||= import('../src/supabase/settings.js'));
}

type RpcRequestBody = {
  name?: unknown;
  args?: unknown;
  tenantId?: unknown;
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
      if (typeof existing === 'object') {
        // Avoid mistaking streams/buffers for a parsed JSON payload.
        const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(existing);
        const isStreamLike = typeof (existing as any).pipe === 'function' || typeof (existing as any).on === 'function';
        const looksLikeRpc =
          Object.prototype.hasOwnProperty.call(existing, 'name') ||
          Object.prototype.hasOwnProperty.call(existing, 'args');
        if (!isBuffer && !isStreamLike && looksLikeRpc) return existing as RpcRequestBody;
      }
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

function headerValue(value: unknown): string {
  if (Array.isArray(value)) return headerValue(value[0]);
  return String(value ?? '').trim();
}

function normalizeHost(value: unknown): string {
  if (Array.isArray(value)) return normalizeHost(value[0]);
  const host = String(value ?? '').trim().toLowerCase();
  if (!host) return '';
  const base = host.split(',')[0]?.trim() ?? '';
  return base.replace(/:\d+$/, '');
}

async function resolveTenantId(req: any, body: RpcRequestBody): Promise<string> {
  const fromBody = typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
  if (fromBody) return fromBody;

  const headerId = headerValue(req?.headers?.['x-tenant-id']);
  if (headerId) return headerId;

  const host = normalizeHost(req?.headers?.['x-forwarded-host'] ?? req?.headers?.host);
  if (host) {
    try {
      const rows = await sbSelect('tenants', `select=id,host&host=eq.${encodeURIComponent(host)}&limit=1`);
      const match = Array.isArray(rows) ? rows[0] : null;
      const id = match && typeof (match as any).id === 'string' ? String((match as any).id).trim() : '';
      if (id) return id;
    } catch (e) {
      console.warn('[RPC] tenant host lookup failed:', e);
    }
  }

  const fallback = String(process.env.DEFAULT_TENANT_ID || process.env.TENANT_ID || '').trim();
  return fallback;
}

const handlers: Record<string, (...args: any[]) => Promise<any> | any> = {
  // Data
  async getAllData() {
    const m = await getDataMod();
    return await m.rpcGetAllData();
  },
  async getAllDataPlain() {
    const m = await getDataMod();
    return await m.rpcGetAllData();
  },
  async getAttendanceWorklogs() {
    const m = await getDataMod();
    return await m.rpcGetAttendanceWorklogs();
  },
  async ping() {
    const m = await getDataMod();
    return await m.rpcPing();
  },
  async getTenantInfo() {
    const id = getTenantId();
    if (!id) return null;
    const rows = await sbSelect('tenants', `select=id,name,host&limit=1&id=eq.${encodeURIComponent(id)}`);
    const row = Array.isArray(rows) ? rows[0] ?? null : null;
    return row ?? { id };
  },
  async getSettingsEntries() {
    const { sbSelectAllSafe } = await import('../src/supabase/selectAll.js');
    return await sbSelectAllSafe('settings', 'select=id,key,value,updatedAt');
  },
  async ensureTenantSettings() {
    const { sbSelectAllSafe } = await import('../src/supabase/selectAll.js');
    const fallbackTemplates = [
      { key: 'DAILY_TEMPLATE_ID', value: '' },
      { key: 'MINUTES_TEMPLATE_ID', value: '' },
      { key: 'NOTES_FOLDER_ID', value: '' },
      { key: 'PROJECT_TEMPLATE_ID', value: '' },
      { key: 'TASK_TEMPLATE_ID', value: '' },
      { key: 'LOGO_URL', value: '' },
      { key: 'GOOGLE_CLIENT_EMAIL', value: '' },
      { key: 'GOOGLE_PRIVATE_KEY', value: '' },
      { key: 'GOOGLE_DRIVE_ID', value: '' },
      { key: 'GOOGLE_BASE_FOLDER_ID', value: '' },
      { key: 'GOOGLE_PROJECT_DOCS_FOLDER_ID', value: '' },
      { key: 'GOOGLE_MINUTES_FOLDER_ID', value: '' },
      { key: 'GOOGLE_DAILY_REPORTS_FOLDER_ID', value: '' },
      { key: 'GOOGLE_LOGO_FILE_ID', value: '' },
    ];

    try {
      const templateRows = await sbSelectAllSafe('settings_template', 'select=key,value');
      const templates = Array.isArray(templateRows)
        ? templateRows
            .map((row) => ({
              key: String(row?.key || '').trim(),
              value: row?.value == null ? '' : String(row?.value),
            }))
            .filter((row) => row.key)
        : [];
      const seeds = templates.length ? templates : fallbackTemplates;

      const currentRows = await sbSelectAllSafe('settings', 'select=key');
      const currentKeys = new Set(
        Array.isArray(currentRows)
          ? currentRows.map((row) => String(row?.key || '').trim()).filter(Boolean)
          : []
      );

      const missing = seeds.filter((row) => !currentKeys.has(row.key));
      if (missing.length) {
        const settings = await getSettingsMod();
        for (const row of missing) {
          try {
            await settings.setSetting(row.key, row.value);
          } catch (e) {
            console.warn('[RPC] ensureTenantSettings failed for key:', row.key, e);
          }
        }
      }

      return { ok: true, created: missing.length, keys: seeds.length };
    } catch (e) {
      console.warn('[RPC] ensureTenantSettings failed:', e);
      return { ok: true, created: 0, keys: fallbackTemplates.length };
    }
  },
  async setSettingEntry(...args: any[]) {
    const key = String(args[0] ?? '').trim();
    const value = String(args[1] ?? '');
    if (!key) throw new Error('key is required');
    const settings = await getSettingsMod();
    await settings.setSetting(key, value);
    return { ok: true };
  },

  // Weekly progress
  async getWeeklyReports(...args: any[]) {
    const m = await getWeeklyMod();
    return await m.rpcGetWeeklyReports(args[0]);
  },
  async upsertWeeklyReport(...args: any[]) {
    const m = await getWeeklyMod();
    return await m.rpcUpsertWeeklyReport(args[0]);
  },

  // CRUD operations
  async upsertProject(...args: any[]) {
    const crud = await getCrudMod();
    const saved = await crud.rpcUpsertProject(args[0]);
    if (saved && saved.id && !saved.docId) {
      // Best-effort: create project doc automatically for newly-created projects.
      try {
        const docs = await getDocsMod();
        const r = await docs.rpcCreateProjectDoc(String(saved.id));
        return (r as any)?.project ?? saved;
      } catch {
        return saved;
      }
    }
    return saved;
  },
  async upsertTask(...args: any[]) {
    const crud = await getCrudMod();
    const saved = await crud.rpcUpsertTask(args[0]);
    if (saved && saved.id && !saved.docId) {
      // Best-effort: create task doc automatically for newly-created tasks.
      try {
        const docs = await getDocsMod();
        const r = await docs.rpcCreateTaskDoc(String(saved.id));
        return (r as any) ?? saved;
      } catch {
        return saved;
      }
    }
    return saved;
  },
  async upsertSubscription(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertSubscription(args[0]);
  },
  async upsertFacilityReservation(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcUpsertFacilityReservation(args[0]);
  },
  async upsertFacilityAsset(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcUpsertFacilityAsset(args[0]);
  },
  async upsertPaymentRequest(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcUpsertPaymentRequest(args[0]);
  },
  async upsertWorkflowRequest(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcUpsertWorkflowRequest(args[0]);
  },
  async addWorkflowApproval(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcAddWorkflowApproval(args[0]);
  },
  async upsertLedgerEntry(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertLedgerEntry(args[0]);
  },
  async upsertUser(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertUser(args[0]);
  },
  async upsertLedgerPlan(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertLedgerPlan(args[0]);
  },
  async upsertCredential(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertCredential(args[0]);
  },
  async upsertMinute(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertMinute(args[0]);
  },
  async upsertDailyReport(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertDailyReport(args[0]);
  },
  async upsertShared(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertShared(args[0]);
  },
  async upsertAttachments(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcUpsertAttachments(args[0], args[1], args[2]);
  },
  async deleteAttachment(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteAttachment(String(args[0]));
  },

  async setTaskStatus(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcSetTaskStatus(String(args[0]), String(args[1]));
  },
  
  async deleteProject(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteProject(String(args[0]));
  },
  async deleteProjectHard(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcDeleteProjectHard(String(args[0]));
  },
  async deleteTask(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteTask(String(args[0]));
  },
  async deleteSubscription(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteSubscription(String(args[0]));
  },
  async deleteFacilityReservation(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcDeleteFacilityReservation(String(args[0]));
  },
  async deleteFacilityAsset(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcDeleteFacilityAsset(String(args[0]));
  },
  async deletePaymentRequest(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcDeletePaymentRequest(String(args[0]));
  },
  async deleteWorkflowRequest(...args: any[]) {
    const crud = await getCrudMod();
    return await (crud as any).rpcDeleteWorkflowRequest(String(args[0]));
  },
  async deleteLedgerEntry(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteLedgerEntry(String(args[0]));
  },
  async deleteUser(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteUser(String(args[0]));
  },
  async deleteLedgerPlan(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteLedgerPlan(String(args[0]));
  },
  async deleteCredential(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteCredential(String(args[0]));
  },
  async deleteMinute(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteMinute(String(args[0]));
  },
  async deleteDailyReport(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteDailyReport(String(args[0]));
  },
  async deleteShared(...args: any[]) {
    const crud = await getCrudMod();
    return await crud.rpcDeleteShared(String(args[0]));
  },

  // Docs
  async getLogoDataUrl() {
    // Logo is optional; never let it break app boot.
    try {
      const docs = await getDocsMod();
      return await docs.rpcGetLogoDataUrl();
    } catch (e) {
      console.warn('[RPC] getLogoDataUrl failed (ignored):', e);
      return null;
    }
  },
  async setDocLinkShare(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcSetDocLinkShare(String(args[0]), args[1]);
  },
  async replaceDocWithMemo(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcReplaceDocWithMemo(String(args[0]), String(args[1] ?? ''));
  },
  async appendDocWithMemo(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcAppendDocWithMemo(String(args[0]), String(args[1] ?? ''));
  },
  async createProjectDoc(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcCreateProjectDoc(String(args[0]));
  },
  async createTaskDoc(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcCreateTaskDoc(String(args[0]));
  },
  async createMinuteDoc(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcCreateMinuteDoc(args[0]);
  },
  async createDailyReportDoc(...args: any[]) {
    const docs = await getDocsMod();
    return await docs.rpcCreateDailyReportDoc(args[0]);
  },

  // Attendance
  async getAttendanceDay(...args: any[]) {
    const att = await getAttendanceMod();
    return await att.rpcGetAttendanceDay(args[0]);
  },
  async getAttendanceMonth(...args: any[]) {
    const att = await getAttendanceMod();
    return await att.rpcGetAttendanceMonth(args[0]);
  },
  async patchAttendance(...args: any[]) {
    const att = await getAttendanceMod();
    return await att.rpcPatchAttendance(args[0], args[1], args[2]);
  },
  async getAttendanceSettings() {
    const att = await getAttendanceMod();
    return await att.rpcGetAttendanceSettings();
  },
  async setAttendanceSettings(...args: any[]) {
    const att = await getAttendanceMod();
    return await att.rpcSetAttendanceSettings(args[0]);
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id');

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
    const tenantId = await resolveTenantId(req, body);
    if (!tenantId) {
      res.statusCode = 400;
      const out: RpcResponse = { ok: false, error: 'tenant_id is required' };
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(out));
      return;
    }

    console.log(`[RPC] Calling ${name} with args:`, JSON.stringify(args));
    const result = await runWithTenant(tenantId, () => fn(...args));
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
