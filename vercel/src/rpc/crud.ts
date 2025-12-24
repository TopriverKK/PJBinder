import { sbUpsert, sbSelectOneById, sbDelete } from '../supabase/rest';

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
      const { rpcCreateProjectDoc } = await import('./docs');
      const { docId, url } = await rpcCreateProjectDoc(saved.id);
      saved.docId = docId;
      saved.docUrl = url;
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
      const { rpcCreateTaskDoc } = await import('./docs');
      const { docId, url } = await rpcCreateTaskDoc(saved.id);
      saved.docId = docId;
      saved.docUrl = url;
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
      const { rpcCreateMinuteDoc } = await import('./docs');
      const result = await rpcCreateMinuteDoc(m);
      return result; // Already saved in createMinuteDoc
    } catch (e) {
      console.error('Failed to create minute doc:', e);
      throw e;
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
      const { rpcCreateDailyReportDoc } = await import('./docs');
      const result = await rpcCreateDailyReportDoc(r);
      return result; // Already saved in createDailyReportDoc
    } catch (e) {
      console.error('Failed to create daily report doc:', e);
      throw e;
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

// Delete functions
export async function rpcDeleteProject(id: string) {
  await sbDelete('projects', id);
  return { ok: true, id };
}

export async function rpcDeleteTask(id: string) {
  await sbDelete('tasks', id);
  return { ok: true, id };
}

export async function rpcDeleteSubscription(id: string) {
  await sbDelete('subscriptions', id);
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
