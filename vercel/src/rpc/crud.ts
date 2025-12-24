import { sbUpsert, sbSelectOneById, sbDelete } from '../supabase/rest';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
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
  
  // TODO: Auto-create doc if needed
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
  
  // TODO: Auto-create doc if needed
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
  m.updatedAt = isoDate(new Date());
  if (!m.id) {
    m.id = `min_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    m.createdAt = m.updatedAt;
  }
  
  const results = await sbUpsert('minutes', m, 'id');
  return Array.isArray(results) ? results[0] : results;
}

export async function rpcUpsertDailyReport(r: any) {
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
  s.updatedAt = isoDate(new Date());
  if (!s.id) {
    s.id = `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    s.createdAt = s.updatedAt;
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
      name: item.name,
      url: item.url,
      mimeType: item.mimeType || '',
      size: item.size || 0,
      createdAt: item.createdAt || isoDate(new Date()),
      updatedAt: isoDate(new Date()),
    };
    const result = await sbUpsert('attachments', attachment, 'id');
    results.push(Array.isArray(result) ? result[0] : result);
  }
  return results;
}
