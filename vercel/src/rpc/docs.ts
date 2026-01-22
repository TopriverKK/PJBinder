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
import { sbSelect, sbSelectOneById, sbUpsert } from '../supabase/rest.js';
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

async function tryLoadGoogleEnv(context: string) {
  try {
    return await loadGoogleEnv();
  } catch (e) {
    console.error(`[docs] ${context} missing Google settings:`, e);
    return null;
  }
}

async function safeEnsureFolderPath(base: string | undefined, parts: string[]) {
  if (!base) return undefined;
  try {
    return await ensureFolderPath(base, parts);
  } catch (e) {
    console.error('[docs] Failed to ensure folder path:', e);
    return undefined;
  }
}

async function getSettingWithTemplate(key: string): Promise<string | null> {
  const value = await getSetting(key);
  if (value && String(value).trim()) return String(value).trim();
  try {
    const rows = await sbSelect('settings_template', `select=key,value&key=eq.${encodeURIComponent(key)}&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    const fallback = row?.value;
    if (fallback && String(fallback).trim()) return String(fallback).trim();
  } catch (_) {
    // ignore fallback failures
  }
  return null;
}

export async function rpcGetLogoDataUrl() {
  const raw = String(await getSetting('GOOGLE_LOGO_FILE_ID') || '').trim();
  if (raw) {
    const fileId = extractDriveId(raw) || raw;
    const dataUrl = await getLogoDataUrl(fileId);
    if (dataUrl) return dataUrl;
  }
  return getLogoDataUrl();
}

function extractDriveId(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    const match = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    try {
      const u = new URL(raw);
      const id = u.searchParams.get('id');
      if (id) return id;
    } catch (_) {
      return '';
    }
    return '';
  }
  return raw.replace(/\s+/g, '');
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

  const env = await tryLoadGoogleEnv('project doc');
  if (!env) {
    return { ok: false, error: 'Missing Google settings', project: p };
  }
  const base = env.projectDocsFolderId || env.baseFolderId;

  // GAS: ['プロジェクトDocs', projectName]
  // If base folder is not configured, fall back to Drive root.
  const folderId = await safeEnsureFolderPath(base, ['プロジェクトDocs', sanitizeName(p.name || p.id)]);
  const title = `プロジェクト ${p.name || p.id}`;

  const templateId = await getSettingWithTemplate('PROJECT_TEMPLATE_ID');

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

  const env = await tryLoadGoogleEnv('task doc');
  if (!env) {
    return { ok: false, error: 'Missing Google settings' };
  }
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

  const templateId = await getSettingWithTemplate('TASK_TEMPLATE_ID');

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

  const env = await tryLoadGoogleEnv('minute doc');
  const base = env ? (env.minutesFolderId || env.baseFolderId) : undefined;

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
  const templateId = await getSettingWithTemplate('MINUTES_TEMPLATE_ID');

  let docId: string | null = null;
  let url: string | null = null;

  if (env) {
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

  const env = await tryLoadGoogleEnv('daily report doc');
  const base = env ? (env.dailyReportsFolderId || env.baseFolderId) : undefined;

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

  const templateId = await getSettingWithTemplate('DAILY_TEMPLATE_ID');
  const hours = Number(r?.hours || 0);
  const projectId = String(r?.projectId || '').trim();
  const body = String(r?.body || '');

  // 残タスク（担当者に割り当てられていて未完了のもの）
  let remainingTasks: Array<{ id: string; title: string; projectId: string; memoText: string }> = [];
  let remainingTaskRows: any[] = [];
  try {
    const uid = encodeURIComponent(userId);
    const rows = await sbSelect(
      'tasks',
      `select=id,title,status,assignees,ownerUserId,projectId,memoText,docId,docUrl&or=(ownerUserId.eq.${uid},assignees.ilike.*${uid}*)`
    );
    remainingTaskRows = Array.isArray(rows) ? rows : [];
    remainingTasks = remainingTaskRows
      .filter((t) => String(t?.status || '').toLowerCase() !== 'done')
      .map((t) => ({
        id: String(t?.id || '').trim(),
        title: String(t?.title || t?.id || '').trim(),
        projectId: String(t?.projectId || '').trim(),
        memoText: String(t?.memoText || '').trim(),
      }))
      .filter((t) => t.title);
  } catch {
    // ignore
  }
  let remainingBlock = '- なし';
  try {
    if (remainingTasks.length) {
      const projectIds = Array.from(new Set(remainingTasks.map((t) => t.projectId).filter(Boolean)));
      const projects = projectIds.length
        ? await sbSelect('projects', `select=id,name,docId,docUrl&id=in.(${projectIds.map((p) => `"${p}"`).join(',')})`)
        : [];
      const projectMap = new Map(
        (Array.isArray(projects) ? projects : []).map((p: any) => [
          String(p?.id || ''),
          {
            name: String(p?.name || p?.id || '').trim(),
            url: p?.docUrl || (p?.docId ? `https://docs.google.com/document/d/${p.docId}` : ''),
          },
        ])
      );
      const taskUrlMap = new Map(
        remainingTaskRows.map((t: any) => [
          String(t?.id || ''),
          t?.docUrl || (t?.docId ? `https://docs.google.com/document/d/${t.docId}` : ''),
        ])
      );
      const grouped = new Map<string, typeof remainingTasks>();
      remainingTasks.forEach((t) => {
        const key = t.projectId || '';
        const list = grouped.get(key) || [];
        list.push(t);
        grouped.set(key, list);
      });
      const lines: string[] = [];
      grouped.forEach((tasks, pid) => {
        const proj = projectMap.get(pid) || { name: pid || '未設定', url: '' };
        const projLine = proj.url ? `- ${proj.name} ${proj.url}` : `- ${proj.name}`;
        lines.push(projLine);
        tasks.forEach((t) => {
          const tUrl = taskUrlMap.get(t.id) || '';
          const taskLine = tUrl ? `  - ${t.title} ${tUrl}` : `  - ${t.title}`;
          lines.push(taskLine);
          if (t.memoText) {
            lines.push(`    - ${t.memoText}`);
          }
        });
      });
      remainingBlock = lines.join('\n');
    }
  } catch {
    // ignore
  }
  const memoOnly = body || '';
  const bodyFilled = memoOnly;
  const fallbackTemplateText =
    `# 本日の作業予定\n\n` +
    `- [ ] 午前  \n      - [ ]   \n` +
    `- [ ] 午後  \n      - [ ] \n\n` +
    `# 残タスク\n\n` +
    `${remainingBlock}\n\n` +
    `# メモ\n\n` +
    `* ${memoOnly}\n`;

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

  if (env) {
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
          '【本文】': bodyFilled,
          '【残タスク】': remainingBlock,
        },
      });
      docId = result.docId;
      url = result.url;
    } else {
      const initialText =
        `ユーザー: ${uname}　日付: ${dateStr}　工数: ${hours}h\n` +
        (projectLabel ? `プロジェクト: ${projectLabel}\n` : '') +
        `\n${fallbackTemplateText}\n`;

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
      body: bodyFilled,
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

