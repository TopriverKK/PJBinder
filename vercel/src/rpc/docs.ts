import { loadGoogleEnv } from '../google/env.js';
import {
  appendDocWithMemo,
  createGoogleDocInFolder,
  copyDocTemplate,
  ensureFolderPath,
  getLogoDataUrl,
  prependDocText,
  replaceDocWithMemo,
  setDocLinkShare,
} from '../google/driveDocs.js';
import { sbSelectOneById, sbUpsert } from '../supabase/rest.js';
import { getSetting } from '../supabase/settings.js';

function sanitizeName(s: string) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, ' ').trim() || 'untitled';
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function rpcGetLogoDataUrl() {
  return getLogoDataUrl();
}

export async function rpcSetDocLinkShare(docId: string, role: 'viewer' | 'commenter' | 'editor') {
  return setDocLinkShare(String(docId), role);
}

export async function rpcReplaceDocWithMemo(docId: string, memoText: string) {
  return replaceDocWithMemo(String(docId), String(memoText ?? ''));
}

export async function rpcAppendDocWithMemo(docId: string, memoText: string) {
  return appendDocWithMemo(String(docId), String(memoText ?? ''));
}

export async function rpcCreateProjectDoc(projectId: string) {
  const pid = String(projectId);
  const p = await sbSelectOneById('projects', pid);
  if (!p) throw new Error(`Project not found: ${pid}`);

  const owner = p.ownerUserId ? await sbSelectOneById('users', String(p.ownerUserId)) : null;
  const parent = p.parentProjectId ? await sbSelectOneById('projects', String(p.parentProjectId)) : null;

  const env = loadGoogleEnv();
  const base = env.projectDocsFolderId || env.baseFolderId;

  // GAS: ['プロジェクトDocs', projectName]
  // If base folder is not configured, fall back to Drive root.
  const folderId = base ? await ensureFolderPath(base, ['プロジェクトDocs', sanitizeName(p.name || p.id)]) : undefined;
  const title = `プロジェクト ${p.name || p.id}`;

  const templateId = await getSetting('PROJECT_TEMPLATE_ID');

  const periodLabel = `${p.startDate || '-'}〜${p.endDate || '-'}`;
  const ownerLabel = owner ? (owner.name || owner.email || owner.id) : (p.ownerUserId || '-');
  const parentLabel = parent ? (parent.name || parent.id || '') : '';

  const replacements: Record<string, string> = {
    '【プロジェクト名】': String(p.name || p.id || ''),
    '【タスク名】': '',
    '【期間】': periodLabel,
    '【担当者】': String(ownerLabel || ''),
    '【親プロジェクト】': String(parentLabel || ''),
  };

  let docId = '';
  let url = '';

  if (templateId) {
    const result = await copyDocTemplate({
      templateId: String(templateId),
      title,
      folderId,
      shareRole: 'editor',
      replacements,
    });
    docId = result.docId;
    url = result.url;
  } else {
    const initialText =
      `${title}\n` +
      `期間: ${(p.startDate || '-')} 〜 ${(p.endDate || '-')}　予算: ${Number(p.budget || 0).toLocaleString()} 円\n` +
      `主担当者: ${ownerLabel || '-'}\n`;

    const created = await createGoogleDocInFolder({
      title,
      folderId,
      shareRole: 'editor',
      initialText,
    });
    docId = created.docId;
    url = created.url;
  }

  await sbUpsert('projects', { id: pid, docId, docUrl: url }, 'id');
  const updated = await sbSelectOneById('projects', pid);

  return { ok: true, docId, project: updated, url };
}

export async function rpcCreateTaskDoc(taskId: string) {
  const tid = String(taskId);
  const t = await sbSelectOneById('tasks', tid);
  if (!t) throw new Error(`Task not found: ${tid}`);

  const proj = t.projectId ? await sbSelectOneById('projects', String(t.projectId)) : null;
  const owner = t.ownerUserId ? await sbSelectOneById('users', String(t.ownerUserId)) : null;

  const env = loadGoogleEnv();
  const base = env.projectDocsFolderId || env.baseFolderId;

  // GAS: ['プロジェクトDocs', projName, 'タスクDocs']
  // If base folder is not configured, fall back to Drive root.
  const folderId = base
    ? await ensureFolderPath(base, [
        'プロジェクトDocs',
        sanitizeName(proj ? proj.name || proj.id : '未割当'),
        'タスクDocs',
      ])
    : undefined;

  const title = `${proj ? `${proj.name || proj.id} - ` : ''}タスク ${t.title || t.id}`;

  const templateId = await getSetting('TASK_TEMPLATE_ID');

  const periodLabel = String(t.dueDate || proj?.endDate || proj?.startDate || '-');
  const ownerLabel = owner ? (owner.name || owner.email || owner.id) : (t.ownerUserId || '-');
  const parentProjectLabel = proj ? (proj.name || proj.id || '') : '';

  const replacements: Record<string, string> = {
    '【プロジェクト名】': String(parentProjectLabel || ''),
    '【タスク名】': String(t.title || t.id || ''),
    '【期間】': periodLabel,
    '【担当者】': String(ownerLabel || ''),
    '【親プロジェクト】': String(parentProjectLabel || ''),
  };

  let docId = '';
  let url = '';

  if (templateId) {
    const result = await copyDocTemplate({
      templateId: String(templateId),
      title,
      folderId,
      shareRole: 'editor',
      replacements,
    });
    docId = result.docId;
    url = result.url;
  } else {
    const initialText =
      `${title}\n` +
      `期限: ${t.dueDate || '-'}　優先度: ${t.priority || '-'}　状態: ${t.status || 'todo'}\n` +
      (proj ? `プロジェクト: ${proj.name || proj.id}\n` : '');

    const created = await createGoogleDocInFolder({
      title,
      folderId,
      shareRole: 'editor',
      initialText,
    });
    docId = created.docId;
    url = created.url;
  }

  await sbUpsert('tasks', { id: tid, docId, docUrl: url }, 'id');
  return { docId, url };
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function normalizeCsv(v: any): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.map(x => String(x ?? '').trim()).filter(Boolean).join(',');
  return String(v).split(',').map(s => s.trim()).filter(Boolean).join(',');
}

export async function rpcCreateMinuteDoc(input: any) {
  if (!input || !input.date || !input.title) throw new Error('date と title は必須です');

  const env = loadGoogleEnv();
  const base = env.minutesFolderId || env.baseFolderId;

  const dateStr = String(input.date);
  const dt = new Date(dateStr);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const dateFormatted = `${yyyy}_${mm}_${dd}`;

  const ym = `${yyyy}年${mm}月`;
  // If base folder is not configured, fall back to Drive root.
  const folderId = base ? await ensureFolderPath(base, ['議事録', ym]) : undefined;

  const title = String(input.title);
  const meetingKey = `${dateFormatted}_${sanitizeName(title)}`;
  const fileTitle = meetingKey;

  const taskIdsCsv = normalizeCsv(input.taskIds || input.taskId || '');
  const attendees = String(input.attendees || '').trim();

  // Best-effort: resolve project name for display.
  let projectLabel = String(input.projectId || '').trim();
  if (projectLabel) {
    try {
      const proj = await sbSelectOneById('projects', projectLabel);
      projectLabel = proj?.name || proj?.id || projectLabel;
    } catch {
      // ignore
    }
  }

  // Template (settings) or fallback
  const templateId = await getSetting('MINUTES_TEMPLATE_ID');

  let docId: string | null = null;
  let url: string | null = null;

  try {
    if (templateId) {
      const result = await copyDocTemplate({
        templateId,
        title: fileTitle,
        folderId,
        shareRole: 'editor',
        replacements: {
          '【会議名】': meetingKey,
          '【日付】': dateStr,
          '【プロジェクト】': projectLabel || '-',
          '【タスク】': taskIdsCsv || '-',
          '【参加者】': attendees || '-',
        },
      });
      docId = result.docId;
      url = result.url;
    } else {
      const initialText =
        `議事録: ${title}\n` +
        `日付: ${dateStr}\n` +
        `プロジェクト: ${projectLabel || '-'}\n` +
        `タスク: ${taskIdsCsv || '-'}\n` +
        `参加者: ${attendees || '-'}\n` +
        `\n――――\n` +
        `■ アクションアイテム\n` +
        `■ 議題 / メモ\n`;

      const result = await createGoogleDocInFolder({
        title: fileTitle,
        folderId,
        shareRole: 'editor',
        initialText,
      });
      docId = result.docId;
      url = result.url;
    }
  } catch (e) {
    // If Google API or folder env isn't configured, still save the minutes row.
    console.error('[docs] Failed to create minute doc (will save row without doc):', e);
    docId = null;
    url = null;
  }

  // Ensure selected info is present even if the template has no placeholders.
  const metaLines: string[] = [];
  metaLines.push(`会議名: ${meetingKey}`);
  metaLines.push(`日付: ${dateStr}`);
  if (projectLabel) metaLines.push(`プロジェクト: ${projectLabel}`);
  if (taskIdsCsv) metaLines.push(`タスク: ${taskIdsCsv}`);
  if (attendees) metaLines.push(`参加者: ${attendees}`);
  if (docId) {
    await prependDocText(docId, metaLines.join('\n'));
  }

  // Supabase: Minutes row
  const now = isoDate(new Date());
  const id = String(input?.id || `min_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  await sbUpsert(
    'minutes',
    {
      ...(input || {}),
      id,
      date: dateStr,
      title,
      projectId: input.projectId || null,
      taskIds: taskIdsCsv,
      taskId: String(input.taskId || taskIdsCsv.split(',')[0] || ''),
      attendees: attendees || '',
      docId,
      docUrl: url,
      updatedAt: now,
      createdAt: String(input?.createdAt || now),
    },
    'id'
  );

  return { ok: true, docId, url, id };
}

export async function rpcCreateDailyReportDoc(r: any) {
  const dateStr = String(r?.date || todayYMD());
  const userId = String(r?.userId || '').trim();
  if (!userId) throw new Error('userId は必須です');

  const env = loadGoogleEnv();
  const base = env.dailyReportsFolderId || env.baseFolderId;

  // ユーザー名（無ければ userId）
  let uname = userId;
  try {
    const u = await sbSelectOneById('users', userId);
    if (u) uname = u.name || u.email || userId;
  } catch {
    // ignore
  }

  const yyyy = dateStr.slice(0, 4) || String(new Date().getFullYear());
  // If base folder is not configured, fall back to Drive root.
  const folderId = base ? await ensureFolderPath(base, ['日報', sanitizeName(uname), yyyy]) : undefined;
  const fileTitle = `日報 ${dateStr} ${uname}`;

  const templateId = await getSetting('DAILY_TEMPLATE_ID');
  const hours = Number(r?.hours || 0);
  const projectId = String(r?.projectId || '').trim();
  const body = String(r?.body || '');

  // Best-effort: resolve project name
  let projectLabel = projectId;
  if (projectLabel) {
    try {
      const proj = await sbSelectOneById('projects', projectLabel);
      projectLabel = proj?.name || proj?.id || projectLabel;
    } catch {
      // ignore
    }
  }

  let docId: string | null = null;
  let url: string | null = null;

  try {
    if (templateId) {
      const result = await copyDocTemplate({
        templateId,
        title: fileTitle,
        folderId,
        shareRole: 'editor',
        replacements: {
          '【日付】': dateStr,
          '【ユーザー名】': uname,
          '【工数】': String(hours),
          '【プロジェクト】': projectLabel || '-',
          '【本文】': body,
        },
      });
      docId = result.docId;
      url = result.url;
    } else {
      const titleLine = `日報 ${dateStr} / ${uname}`;
      const initialText =
        `${titleLine}\n` +
        `ユーザー: ${uname}　日付: ${dateStr}　工数: ${hours}h\n` +
        (projectLabel ? `プロジェクト: ${projectLabel}\n` : '') +
        `\n${body}\n`;

      const result = await createGoogleDocInFolder({
        title: fileTitle,
        folderId,
        shareRole: 'editor',
        initialText,
      });
      docId = result.docId;
      url = result.url;
    }
  } catch (e) {
    // If Google API or folder env isn't configured, still save the daily report row.
    console.error('[docs] Failed to create daily report doc (will save row without doc):', e);
    docId = null;
    url = null;
  }

  // Supabase: DailyReports row
  const now = isoDate(new Date());
  const id = String(r?.id || `dr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  await sbUpsert(
    'dailyreports',
    {
      ...(r || {}),
      id,
      date: dateStr,
      userId,
      hours,
      projectId: projectId || null,
      body,
      tasks: String(r?.tasks || ''),
      docId,
      docUrl: url,
      updatedAt: now,
      createdAt: String(r?.createdAt || now),
    },
    'id'
  );

  return { ok: true, docId, url, id };
}
