import { loadGoogleEnv } from '../google/env';
import {
  appendDocWithMemo,
  createGoogleDocInFolder,
  copyDocTemplate,
  ensureFolderPath,
  getLogoDataUrl,
  prependDocText,
  replaceDocWithMemo,
  setDocLinkShare,
} from '../google/driveDocs';
import { sbSelectOneById, sbUpsert } from '../supabase/rest';
import { getSetting } from '../supabase/settings';
import { randomUUID } from 'crypto';

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

  const env = loadGoogleEnv();
  const base = env.projectDocsFolderId || env.baseFolderId;
  if (!base) throw new Error('Missing env: GOOGLE_PROJECT_DOCS_FOLDER_ID (or GOOGLE_BASE_FOLDER_ID)');

  // GAS: ['プロジェクトDocs', projectName]
  const folderId = await ensureFolderPath(base, ['プロジェクトDocs', sanitizeName(p.name || p.id)]);
  const title = `プロジェクト ${p.name || p.id}`;

  const initialText =
    `${title}\n` +
    `期間: ${(p.startDate || '-')} 〜 ${(p.endDate || '-')}　予算: ${Number(p.budget || 0).toLocaleString()} 円\n` +
    `責任者: ${p.ownerUserId || '-'}\n`;

  const { docId, url } = await createGoogleDocInFolder({
    title,
    folderId,
    shareRole: 'editor',
    initialText,
  });

  await sbUpsert('projects', { id: pid, docId }, 'id');
  const updated = await sbSelectOneById('projects', pid);

  return { ok: true, project: updated, url };
}

export async function rpcCreateTaskDoc(taskId: string) {
  const tid = String(taskId);
  const t = await sbSelectOneById('tasks', tid);
  if (!t) throw new Error(`Task not found: ${tid}`);

  const proj = t.projectId ? await sbSelectOneById('projects', String(t.projectId)) : null;

  const env = loadGoogleEnv();
  const base = env.projectDocsFolderId || env.baseFolderId;
  if (!base) throw new Error('Missing env: GOOGLE_PROJECT_DOCS_FOLDER_ID (or GOOGLE_BASE_FOLDER_ID)');

  // GAS: ['プロジェクトDocs', projName, 'タスクDocs']
  const folderId = await ensureFolderPath(base, [
    'プロジェクトDocs',
    sanitizeName(proj ? proj.name || proj.id : '未割当'),
    'タスクDocs',
  ]);

  const title = `${proj ? `${proj.name || proj.id} - ` : ''}タスク ${t.title || t.id}`;
  const initialText =
    `${title}\n` +
    `期限: ${t.dueDate || '-'}　優先度: ${t.priority || '-'}　状態: ${t.status || 'todo'}\n` +
    (proj ? `プロジェクト: ${proj.name || proj.id}\n` : '');

  const { docId, url } = await createGoogleDocInFolder({
    title,
    folderId,
    shareRole: 'editor',
    initialText,
  });

  await sbUpsert('tasks', { id: tid, docId }, 'id');

  return { docId, url };
}

export async function rpcCreateMinuteDoc(input: any) {
  if (!input || !input.date || !input.title) throw new Error('date と title は必須です');

  const env = loadGoogleEnv();
  const base = env.minutesFolderId || env.baseFolderId;
  if (!base) throw new Error('Missing env: GOOGLE_MINUTES_FOLDER_ID (or GOOGLE_BASE_FOLDER_ID)');

  const dateStr = String(input.date);
  const dt = new Date(dateStr);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const dateFormatted = `${yyyy}_${mm}_${dd}`;
  
  const ym = `${yyyy}年${mm}月`;
  const folderId = await ensureFolderPath(base, ['議事録', ym]);

  const meetingKey = `${dateFormatted}_${input.title}`;
  const fileTitle = meetingKey;
  
  // Get template ID from settings
  const templateId = await getSetting('MINUTES_TEMPLATE_ID');
  
  let docId: string;
  let url: string;
  
  if (templateId) {
    // Use template
    const result = await copyDocTemplate({
      templateId,
      title: fileTitle,
      folderId,
      shareRole: 'editor',
      replacements: {
        '【会議名】': meetingKey,
        '【日付】': dateStr,
        '【プロジェクト】': input.projectId || '-',
        '【タスク】': String(input.taskIds || input.taskId || '') || '-',
        '【参加者】': input.attendees || '-',
      },
    });
    docId = result.docId;
    url = result.url;
  } else {
    // Fallback: create from scratch
    const initialText =
      `議事録: ${input.title}\n` +
      `日付: ${dateStr}　プロジェクト: ${input.projectId || '-'}　タスク: ${String(input.taskIds || '') || '-'}\n` +
      `参加者: ${input.attendees || '-'}\n` +
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

  // Ensure selected info is present even if the template has no placeholders.
  const metaLines: string[] = [];
  metaLines.push(`会議名: ${meetingKey}`);
  metaLines.push(`日付: ${dateStr}`);
  if (input.projectId) metaLines.push(`プロジェクト: ${input.projectId}`);
  const taskCsv = String(input.taskIds || input.taskId || '').trim();
  if (taskCsv) metaLines.push(`タスク: ${taskCsv}`);
  if (input.attendees) metaLines.push(`参加者: ${input.attendees}`);
  await prependDocText(docId, metaLines.join('\n'));

  // Supabase: Minutes row
  const id = randomUUID();
  const nowIso = new Date().toISOString();
  await sbUpsert(
    'minutes',
    {
      id,
      date: dateStr,
      title: input.title,
  
  // Get template ID from settings
  const templateId = await getSetting('DAILY_TEMPLATE_ID');
  
  let docId: string;
  let url: string;
  
  if (templateId) {
    // Use template
    const result = await copyDocTemplate({
      templateId,
      title: fileTitle,
      folderId,
      shareRole: 'editor',
      replacements: {
        '【日付】': dateStr,
        '【ユーザー名】': uname,
        '【工数】': String(Number(r?.hours || 0)),
        '【プロジェクト】': r?.projectId || '-',
        '【本文】': String(r?.body || ''),
      },
    });
    docId = result.docId;
    url = result.url;
  } else {
    // Fallback: create from scratch
    const titleLine = `日報 ${dateStr} / ${uname}`;
    const initialText =
      `${titleLine}\n` +
      `ユーザー: ${uname}　日付: ${dateStr}　工数: ${Number(r?.hours || 0)}h\n` +
      (r?.projectId ? `プロジェクト: ${r.projectId}\n` : '') +
      `\n${String(r?.body || '')}\n`;

    const result = await createGoogleDocInFolder({
      title: fileTitle,
      folderId,
      shareRole: 'editor',
      initialText,
    });
    docId = result.docId;
    url = result.url;
  }

  // Supabase: DailyReports row '');
  if (!userId) throw new Error('userId は必須です');

  const env = loadGoogleEnv();
  const base = env.dailyReportsFolderId || env.baseFolderId;
  if (!base) throw new Error('Missing env: GOOGLE_DAILY_REPORTS_FOLDER_ID (or GOOGLE_BASE_FOLDER_ID)');

  // ユーザー名（無ければ userId）
  let uname = userId;
  try {
    const u = await sbSelectOneById('users', userId);
    if (u) uname = u.name || u.email || userId;
  } catch {
    // ignore
  }

  const yyyy = dateStr.slice(0, 4) || String(new Date().getFullYear());
  const folderId = await ensureFolderPath(base, ['日報', sanitizeName(uname), yyyy]);

  const fileTitle = `日報 ${dateStr} ${uname}`;
  const titleLine = `日報 ${dateStr} / ${uname}`;

  const initialText =
    `${titleLine}\n` +
    `ユーザー: ${uname}　日付: ${dateStr}　工数: ${Number(r?.hours || 0)}h\n` +
    (r?.projectId ? `プロジェクト: ${r.projectId}\n` : '') +
    `\n${String(r?.body || '')}\n`;

  const { docId, url } = await createGoogleDocInFolder({
    title: fileTitle,
    folderId,
    shareRole: 'editor',
    initialText,
  });

  // Supabase: DailyReports row (最小)
  const id = String(r?.id || `dr_${randomUUID().slice(0, 8)}`);
  const nowIso = new Date().toISOString();
  await sbUpsert(
    'dailyreports',
    {
      id,
      date: dateStr,
      userId,
      hours: Number(r?.hours || 0),
      projectId: r?.projectId || null,
      body: r?.body || '',
      tasks: r?.tasks || '',
      docId,
      docUrl: url,
      updatedAt: nowIso,
      createdAt: r?.createdAt || nowIso,
    },
    'id'
  );

  return { ok: true, docId, url, id };
}
