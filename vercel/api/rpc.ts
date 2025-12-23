type RpcRequestBody = {
  name?: unknown;
  args?: unknown;
};

type RpcResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : JSON.stringify(e);
}

async function loadHandler(name: string) {
  // Keep lazy imports so Vercel cold starts don't pay cost when not needed.
  switch (name) {
    case 'getLogoDataUrl':
    case 'setDocLinkShare':
    case 'replaceDocWithMemo':
    case 'appendDocWithMemo':
    case 'createProjectDoc':
    case 'createTaskDoc':
    case 'createMinuteDoc':
    case 'createDailyReportDoc': {
      const docs = await import('../src/rpc/docs');
      return (docs as any)[
        {
          getLogoDataUrl: 'rpcGetLogoDataUrl',
          setDocLinkShare: 'rpcSetDocLinkShare',
          replaceDocWithMemo: 'rpcReplaceDocWithMemo',
          appendDocWithMemo: 'rpcAppendDocWithMemo',
          createProjectDoc: 'rpcCreateProjectDoc',
          createTaskDoc: 'rpcCreateTaskDoc',
          createMinuteDoc: 'rpcCreateMinuteDoc',
          createDailyReportDoc: 'rpcCreateDailyReportDoc',
        }[name] as any
      ];
    }
    default:
      return undefined;
  }
}

const handlers: Record<string, (...args: any[]) => Promise<any> | any> = {
  // Minimal stubs so the copied UI can boot on Vercel.
  async getAllData() {
    return {
      version: null,
      users: [],
      projects: [],
      tasks: [],
      subs: [],
      ledger: [],
      ledgerPlans: [],
      credentials: [],
      attachments: [],
      minutes: [],
      dailyReports: [],
      shareds: [],
    };
  },

  async getAllDataPlain() {
    return handlers.getAllData();
  },

  async ping() {
    return {
      ok: true,
      counts: {
        users: 0,
        projects: 0,
        tasks: 0,
        subs: 0,
      },
      now: new Date().toISOString(),
    };
  },

  async getSpreadsheetInfo() {
    return { url: null, name: null, id: null, via: 'vercel' };
  },

  async debugPeek(_table: unknown, _limit: unknown) {
    return { rows: [] };
  },

  async getUsageGuideHtml() {
    return '<div style="padding:12px">使い方ガイドは移行中です。</div>';
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    const body: RpcResponse = { ok: false, error: 'Method Not Allowed' };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
    return;
  }

  let body: RpcRequestBody = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const name = typeof body?.name === 'string' ? body.name : '';
  const args = Array.isArray(body?.args) ? body.args : [];

  const fn = handlers[name] ?? (await loadHandler(name));
  if (!fn) {
    res.statusCode = 404;
    const out: RpcResponse = { ok: false, error: `Unknown RPC: ${name}` };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
    return;
  }

  try {
    const result = await fn(...args);
    res.statusCode = 200;
    const out: RpcResponse = { ok: true, result };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 500;
    const out: RpcResponse = { ok: false, error: errorMessage(e) };
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  }
}
