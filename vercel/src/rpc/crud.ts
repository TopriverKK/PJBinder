import { sbUpsert, sbSelect, sbSelectOneById, sbDelete, sbDeleteWhere } from '../supabase/rest.js';
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

export async function rpcUpsertPaymentRequest(r: any) {
  r.updatedAt = isoDate(new Date());
  if (!r.id) {
    r.id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    r.createdAt = r.updatedAt;
  }

  const results = await sbUpsert('payment_requests', r, 'id');
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
  u.updatedAt = isoDate(new Date());
  if (!u.id) {
    u.id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    u.createdAt = u.updatedAt;
  }
  
  const results = await sbUpsert('users', u, 'id');
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

export async function rpcDeletePaymentRequest(id: string) {
  await sbDelete('payment_requests', id);
  return { ok: true, id };
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

export async function rpcUpsertShared(s: any) {
  s.updatedAt = isoTimestamp(new Date());
  if (!s.id) {
    s.createdAt = s.updatedAt;
    delete s.id; // Let Supabase generate UUID
  }
  
  const results = await sbUpsert('shareds', s, 'id');
  return Array.isArray(results) ? results[0] : results;
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
