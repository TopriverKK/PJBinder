import { sbUpsert, sbSelect, sbSelectOneById, sbDelete, sbDeleteWhere } from '../supabase/rest.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  rpcCreateDailyReportDoc,
  rpcCreateMinuteDoc,
  rpcCreateProjectDoc,
  rpcCreateTaskDoc,
} from './docs.js';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD for text columns
}

function isoTimestamp(d: Date): string {
  return d.toISOString(); // Full ISO timestamp for timestamp columns
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = String(text ?? '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      const next = src[i + 1];
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((v) => String(v ?? '').trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((v) => String(v ?? '').trim() !== '')) rows.push(row);
  return rows;
}

// Upsert functions
export async function rpcUpsertProject(p: any) {
  p.updatedAt = isoDate(new Date());
  if (!p.id) {
    p.id = `pj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    p.createdAt = p.updatedAt;
  }
  
  const results = await sbUpsert('projects', p, 'id');
  const saved = Array.isArray(results) ? results[0] : results;
  
  // Auto-create doc if needed and docId is missing
  if (saved && !saved.docId) {
    try {
      const created = await rpcCreateProjectDoc(saved.id);
      if ((created as any)?.docId) saved.docId = (created as any).docId;
      if ((created as any)?.url) saved.docUrl = (created as any).url;
    } catch (e) {
      console.error('Failed to create project doc:', e);
      // Continue without doc
    }
  }
  
  return saved;
}

export async function rpcUpsertTask(t: any) {
  t.updatedAt = isoDate(new Date());
  if (!t.id) {
    t.id = `tk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    t.createdAt = t.updatedAt;
  }
  
  const results = await sbUpsert('tasks', t, 'id');
  const saved = Array.isArray(results) ? results[0] : results;
  
  // Auto-create doc if needed and docId is missing
  if (saved && !saved.docId && saved.type !== 'recurring') {
    try {
      const created = await rpcCreateTaskDoc(saved.id);
      if ((created as any)?.docId) saved.docId = (created as any).docId;
      if ((created as any)?.url) saved.docUrl = (created as any).url;
    } catch (e) {
      console.error('Failed to create task doc:', e);
      // Continue without doc
    }
  }
  
  return saved;
}

export async function rpcUpsertSubscription(s: any) {
  s.updatedAt = isoDate(new Date());
  if (!s.id) {
    s.id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    s.createdAt = s.updatedAt;
  }
  
  const results = await sbUpsert('subscriptions', s, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertFacilityReservation(r: any) {
  r.updatedAt = isoDate(new Date());
  if (!r.id) {
    r.id = `fr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    r.createdAt = r.updatedAt;
  }

  const results = await sbUpsert('facility_reservations', r, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertFacilityAsset(a: any) {
  a.updatedAt = isoDate(new Date());
  if (!a.id) {
    a.id = `fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    a.createdAt = a.updatedAt;
  }

  const results = await sbUpsert('facility_assets', a, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertPaymentRequest(r: any) {
  r.updatedAt = isoDate(new Date());
  if (!r.id) {
    r.id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    r.createdAt = r.updatedAt;
  }

  const results = await sbUpsert('payment_requests', r, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertWorkflowRequest(r: any) {
  r.updatedAt = isoDate(new Date());
  if (!r.id) {
    if (!r.title || !String(r.title).trim()) {
      throw new Error('title is required');
    }
    if (!r.requesterId || !String(r.requesterId).trim()) {
      throw new Error('requesterId is required');
    }
    r.id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    r.createdAt = r.updatedAt;
  }

  const results = await sbUpsert('workflow_requests', r, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcAddWorkflowApproval(a: any) {
  a.updatedAt = isoTimestamp(new Date());
  if (!a.id) {
    a.id = `wfa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    a.createdAt = a.updatedAt;
  }
  if (!a.actedAt) a.actedAt = a.updatedAt;

  const results = await sbUpsert('workflow_approvals', a, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertLedgerEntry(e: any) {
  e.updatedAt = isoDate(new Date());
  if (!e.id) {
    e.id = `ldg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    e.createdAt = e.updatedAt;
  }
  
  const results = await sbUpsert('ledger', e, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertUser(u: any) {
  const incomingPassword = typeof u?.userPassword === 'string' ? u.userPassword.trim() : '';
  const currentPassword = typeof u?.currentPassword === 'string' ? u.currentPassword.trim() : '';

  u.updatedAt = isoDate(new Date());
  if (!u.id) {
    u.id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    u.createdAt = u.updatedAt;
  }

  const row = { ...(u || {}) } as any;
  delete row.currentPassword;

  if (incomingPassword) {
    const existing = await sbSelectOneById('users', String(u.id));
    const stored = existing && typeof (existing as any).userPassword === 'string'
      ? String((existing as any).userPassword)
      : '';
    if (stored) {
      if (!currentPassword) throw new Error('現在のパスワードを入力してください');
      const check = verifyPassword(stored, currentPassword);
      if (!check.ok) throw new Error('現在のパスワードが一致しません');
    }
    row.userPassword = hashPassword(incomingPassword);
  } else {
    delete row.userPassword;
  }

  const results = await sbUpsert('users', row, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertLedgerPlan(p: any) {
  p.updatedAt = isoDate(new Date());
  if (!p.id) {
    p.id = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    p.createdAt = p.updatedAt;
  }
  
  const results = await sbUpsert('ledgerplans', p, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertCredential(c: any) {
  c.updatedAt = isoDate(new Date());
  if (!c.id) {
    c.id = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    c.createdAt = c.updatedAt;
  }
  
  const results = await sbUpsert('credentials', c, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertMinute(m: any) {
  // If no docId, create doc first
  if (!m.docId) {
    try {
      const result = await rpcCreateMinuteDoc(m);
      return result; // Already saved in createMinuteDoc
    } catch (e) {
      console.error('Failed to create minute doc:', e);
      // Fall through and save the row without a doc.
    }
  }
  
  // Update existing
  m.updatedAt = isoDate(new Date());
  if (!m.id) {
    m.id = `min_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    m.createdAt = m.updatedAt;
  }
  
  const results = await sbUpsert('minutes', m, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertDailyReport(r: any) {
  // If no docId, create doc first
  if (!r.docId) {
    try {
      const result = await rpcCreateDailyReportDoc(r);
      return result; // Already saved in createDailyReportDoc
    } catch (e) {
      console.error('Failed to create daily report doc:', e);
      // Fall through and save the row without a doc.
    }
  }
  
  // Update existing
  r.updatedAt = isoDate(new Date());
  if (!r.id) {
    r.id = `dr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    r.createdAt = r.updatedAt;
  }
  
  const results = await sbUpsert('dailyreports', r, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcSetTaskStatus(id: string, status: string) {
  const taskId = String(id || '').trim();
  const next = String(status || '').trim();
  if (!taskId) throw new Error('setTaskStatus: id is required');
  if (!next) throw new Error('setTaskStatus: status is required');

  const allowed = new Set(['todo', 'doing', 'blocked', 'done']);
  if (!allowed.has(next)) throw new Error(`setTaskStatus: invalid status: ${next}`);

  const patch: any = { id: taskId, status: next, updatedAt: isoDate(new Date()) };
  const results = await sbUpsert('tasks', patch, 'id');
  return Array.isArray(results) ? results[0] : results;
}

// Delete functions
export async function rpcDeleteProject(id: string) {
  await sbDelete('projects', id);
  return { ok: true, id };
}

export async function rpcDeleteProjectHard(id: string) {
  const pid = String(id || '').trim();
  if (!pid) throw new Error('deleteProjectHard: id is required');

  // 1) Collect task ids under project
  const tasks = await sbSelect('tasks', `select=id&projectId=eq.${encodeURIComponent(pid)}&limit=10000`);
  const taskIds = Array.isArray(tasks) ? tasks.map((t: any) => String(t?.id || '')).filter(Boolean) : [];

  // 2) Delete attachments for tasks (if any)
  if (taskIds.length) {
    const inList = taskIds.map((x) => `"${x.replaceAll('"', '')}"`).join(',');
    await sbDeleteWhere('attachments', `parentType=eq.task&parentId=in.(${encodeURIComponent(inList)})`);
  }

  // 3) Delete attachments for project
  await sbDeleteWhere('attachments', `parentType=eq.project&parentId=eq.${encodeURIComponent(pid)}`);

  // 4) Delete tasks under project
  await sbDeleteWhere('tasks', `projectId=eq.${encodeURIComponent(pid)}`);

  // 5) Delete project
  await sbDelete('projects', pid);

  return { ok: true, id: pid, deletedTaskCount: taskIds.length };
}

export async function rpcDeleteTask(id: string) {
  await sbDelete('tasks', id);
  return { ok: true, id };
}

export async function rpcDeleteSubscription(id: string) {
  await sbDelete('subscriptions', id);
  return { ok: true, id };
}

export async function rpcDeleteFacilityReservation(id: string) {
  await sbDelete('facility_reservations', id);
  return { ok: true, id };
}

export async function rpcDeleteFacilityAsset(id: string) {
  await sbDelete('facility_assets', id);
  return { ok: true, id };
}

export async function rpcDeletePaymentRequest(id: string) {
  await sbDelete('payment_requests', id);
  return { ok: true, id };
}

export async function rpcDeleteWorkflowRequest(id: string) {
  const wid = String(id || '').trim();
  if (wid) {
    await sbDeleteWhere('workflow_approvals', `workflowId=eq.${encodeURIComponent(wid)}`);
    await sbDelete('workflow_requests', wid);
  }
  return { ok: true, id: wid };
}

export async function rpcDeleteLedgerEntry(id: string) {
  await sbDelete('ledger', id);
  return { ok: true, id };
}

export async function rpcDeleteUser(id: string) {
  await sbDelete('users', id);
  return { ok: true, id };
}

export async function rpcDeleteLedgerPlan(id: string) {
  await sbDelete('ledgerplans', id);
  return { ok: true, id };
}

export async function rpcDeleteCredential(id: string) {
  await sbDelete('credentials', id);
  return { ok: true, id };
}

export async function rpcDeleteMinute(id: string) {
  await sbDelete('minutes', id);
  return { ok: true, id };
}

export async function rpcDeleteDailyReport(id: string) {
  await sbDelete('dailyreports', id);
  return { ok: true, id };
}

export async function rpcDeleteAttachment(id: string) {
  await sbDelete('attachments', id);
  return { ok: true, id };
}

export async function rpcUpsertShared(s: any) {
  s.updatedAt = isoTimestamp(new Date());
  if (!s.id) {
    s.createdAt = s.updatedAt;
    delete s.id; // Let Supabase generate UUID
  }
  
  const results = await sbUpsert('shareds', s, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertIcdProgress(p: any) {
  const row = { ...(p || {}) };
  if (!row.userId) throw new Error('userId is required');
  if (!row.icdId) throw new Error('icdId is required');
  row.updatedAt = isoDate(new Date());
  if (!row.id) row.createdAt = row.updatedAt;
  const onConflict = row.id ? 'id' : 'userId,icdId';
  const results = await sbUpsert('icd_progress', row, onConflict);
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcImportIcdCsv(csvText: string) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return { inserted: 0, replaced: 0 };

  const header = rows[0].map((v) => String(v ?? '').trim());
  const idxBig = header.indexOf('タスク大分類');
  const idxBigDesc = header.indexOf('タスク大分類説明');
  const idxMiddle = header.indexOf('タスク中分類');
  const idxSmall = header.indexOf('タスク小分類');
  const idxEval = header.indexOf('評価項目');
  const idxEvalDesc = header.indexOf('評価項目説明');
  const idxOrder = header.indexOf('表示順');
  const idxCreated = header.indexOf('作成日');
  const idxUpdated = header.indexOf('最終更新日');
  const idxChanged = header.indexOf('変更日');
  const idxDeleted = header.indexOf('削除日');
  const idxDupMiddle = header.indexOf('重複対象タスク中分類識別子');
  const idxDupSmall = header.indexOf('重複対象タスク小分類識別子');
  const idxDupEval = header.indexOf('重複対象評価項目識別子');
  let roleStart = Math.max(idxDupMiddle, idxDupSmall, idxDupEval);
  if (roleStart >= 0) roleStart += 1;
  const roleSeed = header.findIndex((h) =>
    ['営農１年目','営農２年目','営農','農場長','営業','事務','総務','顧問','管理者'].includes(h)
  );
  if (roleStart < 0 && roleSeed >= 0) roleStart = roleSeed;
  if (roleStart < 0) roleStart = header.length;
  const roleHeaders = header.slice(roleStart).map((v) => String(v ?? '').trim());

  let startRow = 1;
  if (rows.length > 1) {
    const r1 = rows[1] || [];
    const hasCore = String(r1[idxBig] ?? '').trim() || String(r1[idxEval] ?? '').trim();
    if (!hasCore) startRow = 2;
  }

  const items: any[] = [];
  const now = isoDate(new Date());
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] || [];
    const big = String(r[idxBig] ?? '').trim();
    const bigDesc = String(r[idxBigDesc] ?? '').trim();
    const middle = String(r[idxMiddle] ?? '').trim();
    const small = String(r[idxSmall] ?? '').trim();
    const evalItem = String(r[idxEval] ?? '').trim();
    const evalDesc = String(r[idxEvalDesc] ?? '').trim();
    const orderRaw = String(r[idxOrder] ?? '').trim();
    const orderVal = Number(orderRaw);
    const displayOrder = Number.isFinite(orderVal) ? orderVal : 0;
    const duplicateMiddleKey = String(r[idxDupMiddle] ?? '').trim();
    const duplicateSmallKey = String(r[idxDupSmall] ?? '').trim();
    const duplicateEvalKey = String(r[idxDupEval] ?? '').trim();
    const createdAt = String(r[idxCreated] ?? '').trim() || now;
    const updatedAt = String(r[idxUpdated] ?? '').trim() || String(r[idxChanged] ?? '').trim() || now;
    const deletedAt = String(r[idxDeleted] ?? '').trim();
    if (!big && !middle && !small && !evalItem) continue;

    const roles: string[] = [];
    for (let j = roleStart; j < header.length; j++) {
      const h = roleHeaders[j - roleStart];
      if (!h) continue;
      const val = String(r[j] ?? '').trim();
      if (val) roles.push(h);
    }

    items.push({
      bigCategory: big,
      bigDesc,
      middleCategory: middle,
      smallCategory: small,
      evalItem,
      evalDesc,
      displayOrder,
      duplicateMiddleKey,
      duplicateSmallKey,
      duplicateEvalKey,
      roles: roles.join(','),
      createdAt,
      updatedAt,
      deletedAt,
    });
  }

  const existing = await sbSelect('icd_master', 'select=id');
  const replaced = Array.isArray(existing) ? existing.length : 0;
  if (replaced) {
    await sbDeleteWhere('icd_master', 'id=not.is.null');
  }
  for (const row of items) {
    await sbUpsert('icd_master', row);
  }
  return { inserted: items.length, replaced };
}

export async function rpcDeleteShared(id: string) {
  await sbDelete('shareds', id);
  return { ok: true, id };
}

export async function rpcUpsertAttachments(kind: string, parentId: string, items: any[]) {
  const results = [];
  for (const item of items) {
    const attachment = {
      id: item.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      kind,
      parentId,
      parentType: item.parentType || kind, // Map to correct column names
      title: item.name || item.title,
      url: item.url,
      mime: item.mimeType || item.mime || '',
      type: item.type || '',
      fileId: item.fileId || '',
      createdBy: item.createdBy || '',
      createdAt: item.createdAt || isoDate(new Date()),
      updatedAt: isoTimestamp(new Date()), // timestamp with time zone
    };
    const result = await sbUpsert('attachments', attachment, 'id');
    results.push(Array.isArray(result) ? result[0] : result);
  }
  return results;
}
