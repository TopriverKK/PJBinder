import { sbSelectAllSafe } from '../supabase/selectAll.js';
import { sbUpsert } from '../supabase/rest.js';
import { getSetting, setSetting } from '../supabase/settings.js';

type AttendanceStatus = 'not-clocked' | 'working' | 'break' | 'out' | 'done';
type AttendanceLocation = 'office' | 'remote' | 'out';

type BreakSpan = { start: string; end?: string };

type AttendanceRow = {
  id?: number;
  created_at?: string;
  user?: string;
  value?: string;

  user_id?: string;
  work_date?: string; // YYYY-MM-DD
  status?: AttendanceStatus;
  location?: AttendanceLocation;
  clock_in?: string;
  clock_out?: string;
  breaks?: BreakSpan[];
  notes?: string;
  project_id?: string | null;
  task_id?: string | null;
  updated_at?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function assertYmd(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);
}

function normalizeRow(r: AttendanceRow): AttendanceRow {
  const breaks = Array.isArray(r.breaks) ? r.breaks : [];
  const status = (r.status || 'not-clocked') as AttendanceStatus;
  const location = (r.location || 'office') as AttendanceLocation;
  return {
    ...r,
    breaks,
    status,
    location,
  };
}

function makeValueJson(r: AttendanceRow): string {
  // Keep a compact backup payload in value for debugging/fallback.
  const payload = {
    v: 1,
    user_id: r.user_id,
    work_date: r.work_date,
    status: r.status,
    location: r.location,
    clock_in: r.clock_in,
    clock_out: r.clock_out,
    breaks: r.breaks || [],
    notes: r.notes || '',
    project_id: r.project_id || '',
    task_id: r.task_id || '',
    updated_at: r.updated_at,
  };
  return JSON.stringify(payload);
}

async function selectAttendanceDay(date: string): Promise<AttendanceRow[]> {
  assertYmd(date);

  // Requires schema with work_date.
  const query = `select=*&work_date=eq.${encodeURIComponent(date)}`;
  const rows = await sbSelectAllSafe('attendancemanager', query);
  return Array.isArray(rows) ? rows.map((r) => normalizeRow(r as any)) : [];
}

async function selectAttendanceMonth(month: string): Promise<AttendanceRow[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`Invalid month: ${month}`);
  const start = `${month}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const end = ymd(endDate);

  const query = `select=*&work_date=gte.${encodeURIComponent(start)}&work_date=lt.${encodeURIComponent(end)}`;
  const rows = await sbSelectAllSafe('attendancemanager', query);
  return Array.isArray(rows) ? rows.map((r) => normalizeRow(r as any)) : [];
}

async function getOrInitRow(userId: string, date: string): Promise<AttendanceRow> {
  const dayRows = await selectAttendanceDay(date);
  const found = dayRows.find((r) => String(r.user_id || r.user || '') === String(userId));
  if (found) return normalizeRow(found);

  return normalizeRow({
    user_id: userId,
    user: userId,
    work_date: date,
    status: 'not-clocked',
    location: 'office',
    breaks: [],
    updated_at: nowIso(),
  });
}

export async function rpcGetAttendanceDay(date?: unknown) {
  const d = typeof date === 'string' && date ? date : ymd(new Date());
  return await selectAttendanceDay(d);
}

export async function rpcGetAttendanceMonth(month?: unknown) {
  const m = typeof month === 'string' && month ? month : ymd(new Date()).slice(0, 7);
  return await selectAttendanceMonth(m);
}

type PatchAction =
  | { type: 'clockIn'; location?: AttendanceLocation }
  | { type: 'clockOut' }
  | { type: 'toggleBreak' }
  | { type: 'toggleOut' }
  | { type: 'setLocation'; location: AttendanceLocation }
  | { type: 'setProjectTask'; projectId?: string; taskId?: string }
  | { type: 'setNotes'; notes: string };

export async function rpcPatchAttendance(userIdRaw: unknown, dateRaw: unknown, actionRaw: unknown) {
  const userId = String(userIdRaw || '').trim();
  const date = String(dateRaw || '').trim();
  if (!userId) throw new Error('userId is required');
  assertYmd(date);

  const action = actionRaw as PatchAction;
  if (!action || typeof action !== 'object' || !('type' in action)) throw new Error('action is required');

  const row = await getOrInitRow(userId, date);
  const now = nowIso();

  switch (action.type) {
    case 'clockIn': {
      if (!row.clock_in) row.clock_in = now;
      // If already clocked out, keep the clock_out but mark as done.
      if (row.clock_out) {
        row.status = 'done';
      } else {
        row.status = 'working';
      }
      if (action.location) row.location = action.location;
      break;
    }
    case 'clockOut': {
      // Close open break if exists
      const breaks = Array.isArray(row.breaks) ? [...row.breaks] : [];
      const last = breaks[breaks.length - 1];
      if (last && !last.end) {
        breaks[breaks.length - 1] = { ...last, end: now };
      }
      row.breaks = breaks;
      if (!row.clock_in) row.clock_in = now; // defensive
      row.clock_out = now;
      row.status = 'done';
      break;
    }
    case 'toggleBreak': {
      const breaks = Array.isArray(row.breaks) ? [...row.breaks] : [];
      if (row.status === 'break') {
        const last = breaks[breaks.length - 1];
        if (last && !last.end) breaks[breaks.length - 1] = { ...last, end: now };
        row.breaks = breaks;
        row.status = 'working';
      } else {
        if (!row.clock_in) row.clock_in = now; // defensive
        row.breaks = [...breaks, { start: now }];
        row.status = 'break';
      }
      break;
    }
    case 'toggleOut': {
      if (row.status === 'out') {
        row.status = 'working';
        // keep location as-is; if it was out, switch back to office
        if (row.location === 'out') row.location = 'office';
      } else {
        if (!row.clock_in) row.clock_in = now;
        row.status = 'out';
        row.location = 'out';
      }
      break;
    }
    case 'setLocation': {
      row.location = action.location;
      // If location changes from out, ensure status isn't out.
      if (row.status === 'out' && action.location !== 'out') row.status = 'working';
      break;
    }
    case 'setProjectTask': {
      row.project_id = String(action.projectId || '').trim() || null;
      row.task_id = String(action.taskId || '').trim() || null;
      break;
    }
    case 'setNotes': {
      row.notes = String(action.notes || '');
      break;
    }
    default:
      throw new Error(`Unknown action: ${(action as any).type}`);
  }

  row.user_id = userId;
  row.user = userId;
  row.work_date = date;
  row.updated_at = now;
  row.value = makeValueJson(row);

  // Requires unique index on (user_id, work_date) to be safe under concurrency.
  const saved = await sbUpsert('attendancemanager', row as any, 'user_id,work_date');
  return normalizeRow(saved as any);
}

export async function rpcGetAttendanceSettings() {
  const holidayUrl = (await getSetting('attendanceHolidayUrl')) || '';
  const companyHolidayUrl = (await getSetting('attendanceCompanyHolidayUrl')) || '';
  return { holidayUrl, companyHolidayUrl };
}

export async function rpcSetAttendanceSettings(settingsRaw: unknown) {
  const s = (settingsRaw && typeof settingsRaw === 'object') ? (settingsRaw as any) : {};
  const holidayUrl = String(s.holidayUrl || '').trim();
  const companyHolidayUrl = String(s.companyHolidayUrl || '').trim();
  await Promise.all([
    setSetting('attendanceHolidayUrl', holidayUrl),
    setSetting('attendanceCompanyHolidayUrl', companyHolidayUrl),
  ]);
  return { ok: true };
}
