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
  clock_in?: string | null;
  clock_out?: string | null;
  breaks?: BreakSpan[];
  notes?: string;
  project_id?: string | null;
  task_id?: string | null;
  updated_at?: string;
};

type AttendanceWorklogRow = {
  id?: number;
  created_at?: string;
  user_id?: string;
  work_date?: string; // YYYY-MM-DD
  start_at?: string;
  end_at?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  source?: string;
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

function normId(v: unknown): string {
  return String(v || '').trim();
}

function isWorklogActive(r: AttendanceRow): boolean {
  // Counts time while working or out, but not during breaks.
  // Also requires an open work interval (clock_in without clock_out).
  if (!r.clock_in) return false;
  if (r.clock_out) return false;
  return r.status === 'working' || r.status === 'out';
}

async function selectOpenWorklog(userId: string, date: string): Promise<AttendanceWorklogRow | null> {
  // end_at=is.null for open segment
  const query = `select=*&user_id=eq.${encodeURIComponent(userId)}`
    + `&work_date=eq.${encodeURIComponent(date)}`
    + `&end_at=is.null&order=start_at.desc&limit=1`;
  const rows = await sbSelectAllSafe('attendance_worklogs', query);
  const r = Array.isArray(rows) ? (rows[0] as any) : null;
  return r ? (r as AttendanceWorklogRow) : null;
}

async function selectOpenWorklogs(userId: string, date: string): Promise<AttendanceWorklogRow[]> {
  // end_at=is.null for open segment
  const query = `select=*&user_id=eq.${encodeURIComponent(userId)}`
    + `&work_date=eq.${encodeURIComponent(date)}`
    + `&end_at=is.null&order=start_at.desc`;
  const rows = await sbSelectAllSafe('attendance_worklogs', query);
  return Array.isArray(rows) ? (rows as AttendanceWorklogRow[]) : [];
}

async function selectOpenWorklogsAnyDate(userId: string, limit = 50): Promise<AttendanceWorklogRow[]> {
  // end_at=is.null for open segment (across any work_date)
  const query = `select=*&user_id=eq.${encodeURIComponent(userId)}`
    + `&end_at=is.null&order=start_at.desc&limit=${encodeURIComponent(String(limit))}`;
  const rows = await sbSelectAllSafe('attendance_worklogs', query);
  return Array.isArray(rows) ? (rows as AttendanceWorklogRow[]) : [];
}

async function closeOpenWorklogsIfAny(userId: string, date: string, endAtIso: string) {
  const opens = await selectOpenWorklogs(userId, date);
  if (!opens.length) return;
  // Close all open segments defensively (prevents double-counting).
  for (const open of opens) {
    if (!open || !open.id) continue;
    // PostgREST upsert overwrites unspecified columns, so include required fields.
    await sbUpsert(
      'attendance_worklogs',
      {
        id: open.id,
        user_id: open.user_id,
        work_date: open.work_date,
        start_at: open.start_at,
        end_at: endAtIso,
        project_id: open.project_id ?? null,
        task_id: open.task_id ?? null,
        source: open.source || 'unknown',
      },
      'id'
    );
  }
}

async function closeOpenWorklogsAnyDateIfAny(userId: string, endAtIso: string) {
  const opens = await selectOpenWorklogsAnyDate(userId);
  if (!opens.length) return;
  for (const open of opens) {
    if (!open || !open.id) continue;
    // PostgREST upsert overwrites unspecified columns, so include required fields.
    await sbUpsert(
      'attendance_worklogs',
      {
        id: open.id,
        user_id: open.user_id,
        work_date: open.work_date,
        start_at: open.start_at,
        end_at: endAtIso,
        project_id: open.project_id ?? null,
        task_id: open.task_id ?? null,
        source: open.source || 'unknown',
      },
      'id'
    );
  }
}

async function openWorklog(userId: string, date: string, startAtIso: string, projectId: string, taskId: string, source: string) {
  const row: AttendanceWorklogRow = {
    user_id: userId,
    work_date: date,
    start_at: startAtIso,
    end_at: null,
    project_id: projectId ? projectId : null,
    task_id: taskId ? taskId : null,
    source: source || 'unknown',
  };
  await sbUpsert('attendance_worklogs', row as any);
}

async function syncWorklogsForPatch(
  before: AttendanceRow,
  after: AttendanceRow,
  actionType: string,
  now: string
) {
  const userId = normId(after.user_id || after.user);
  const date = normId(after.work_date);
  if (!userId || !date) return;

  const afterProjectId = normId(after.project_id);
  const afterTaskId = normId(after.task_id);
  const beforeActive = isWorklogActive(before);
  const afterActive = isWorklogActive(after);

  const closeAll = async () => {
    // Close any open segment(s) across any date (handles leftovers/day boundary)
    await closeOpenWorklogsAnyDateIfAny(userId, now);
  };
  const openNew = async () => {
    await openWorklog(userId, date, now, afterProjectId, afterTaskId, actionType);
  };

  // 強制終了: 退勤操作時は必ず全オープン区間を閉じる（状態が既に非稼働でも閉じる）
  if (actionType === 'clockOut') {
    await closeAll();
    return;
  }

  // 1) If now inactive, close any open segments
  if (!afterActive) {
    await closeAll();
    return;
  }

  // 2) Becoming active: close leftovers then open new
  if (!beforeActive && afterActive) {
    await closeAll();
    await openNew();
    return;
  }

  // 3) Always cut when project/task changes during active state
  if (actionType === 'setProjectTask') {
    await closeAll();
    await openNew();
    return;
  }

  // 4) Active->active self-heal (ensure one open segment matching current project/task)
  const beforeProjectId = normId(before.project_id);
  const beforeTaskId = normId(before.task_id);
  const changed = beforeProjectId !== afterProjectId || beforeTaskId !== afterTaskId;

  if (beforeActive && afterActive) {
    if (changed) {
      await closeAll();
      await openNew();
      return;
    }

    // Self-heal: ensure exactly one open segment and it matches current project/task.
    const opens = await selectOpenWorklogs(userId, date);
    if (opens.length !== 1) {
      await closeAll();
      await openNew();
      return;
    }
    const open = opens[0];
    const openProjectId = normId(open.project_id);
    const openTaskId = normId(open.task_id);
    if (openProjectId !== afterProjectId || openTaskId !== afterTaskId) {
      await closeAll();
      await openNew();
      return;
    }
  }
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
  const before = normalizeRow({ ...row });
  const now = nowIso();

  switch (action.type) {
    case 'clockIn': {
      if (!row.clock_in) row.clock_in = now;
      // If already clocked out, cancel the clock-out when clock-in is pressed.
      // (User likely clicked clock-out by mistake.)
      if (row.clock_out) row.clock_out = null;

      if (action.location) row.location = action.location;
      const effectiveLocation = (action.location || row.location || 'office') as AttendanceLocation;
      row.status = effectiveLocation === 'out' ? 'out' : 'working';
      break;
    }
    case 'clockOut': {
      // Toggle: if already clocked out, treat as cancel.
      if (row.clock_out) {
        row.clock_out = null;
        if (!row.clock_in) {
          row.status = 'not-clocked';
        } else {
          const effectiveLocation = (row.location || 'office') as AttendanceLocation;
          row.status = effectiveLocation === 'out' ? 'out' : 'working';
        }
        break;
      }

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
  const after = normalizeRow(saved as any);

  // Best-effort: record project/task time allocation segments.
  // This requires table `attendance_worklogs` (see SUPABASE_ATTENDANCE_WORKLOGS.sql).
  let worklogSyncError: string | null = null;
  try {
    await syncWorklogsForPatch(before, after, String((action as any).type || ''), now);
  } catch (e) {
    const msg = (e instanceof Error) ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
    worklogSyncError = msg;
    console.error('[attendance_worklogs] failed to sync worklogs:', e);
  }

  // Attach debug field for UI; not persisted to DB.
  return { ...after, _worklogSyncError: worklogSyncError } as any;
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
