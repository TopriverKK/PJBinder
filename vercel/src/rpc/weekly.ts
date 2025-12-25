import { sbSelect, sbUpsert } from '../supabase/rest.js';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function normalizeWeekStart(s: any): string {
  const v = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('weekStart must be YYYY-MM-DD');
  return v;
}

function normalizeUserId(s: any): string {
  const v = String(s ?? '').trim();
  if (!v) throw new Error('userId is required');
  return v;
}

export async function rpcGetWeeklyReports(weekStart: any) {
  const ws = normalizeWeekStart(weekStart);
  const rows = await sbSelect('weeklyreports', `select=*&weekStart=eq.${encodeURIComponent(ws)}&limit=10000`);
  return Array.isArray(rows) ? rows : [];
}

export async function rpcUpsertWeeklyReport(input: any) {
  const ws = normalizeWeekStart(input?.weekStart);
  const userId = normalizeUserId(input?.userId);

  const issues = input?.issues != null ? String(input.issues) : '';
  const done = input?.done != null ? String(input.done) : '';

  const row: any = {
    weekStart: ws,
    userId,
    issues,
    done,
    updatedAt: isoDate(new Date()),
  };

  const saved = await sbUpsert('weeklyreports', row, 'weekStart,userId');
  return saved;
}
