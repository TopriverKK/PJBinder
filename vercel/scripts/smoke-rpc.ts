/* Local smoke test for /api/rpc without Vercel.
   Compiles with tsconfig.smoke.json (CJS) then runs via node.
*/

import rpcHandler from '../api/rpc';

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (k: string, v: string) => void;
  end: (b: string) => void;
};

function makeRes(): MockRes {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = String(v);
    },
    end(b) {
      this.body = String(b ?? '');
    },
  };
}

async function callRpc(name: string, args: unknown[] = []) {
  const req = { method: 'POST', body: { name, args } } as any;
  const res = makeRes() as any;
  await (rpcHandler as any)(req, res);
  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body,
    json: (() => {
      try {
        return JSON.parse(res.body);
      } catch {
        return null;
      }
    })(),
  };
}

async function main() {
  console.log('== smoke: unknown ==');
  console.log(await callRpc('__unknown__'));

  console.log('== smoke: ping ==');
  console.log(await callRpc('ping'));

  console.log('== smoke: getAllData ==');
  const r = await callRpc('getAllData');
  console.log({ statusCode: r.statusCode, ok: r.json?.ok, error: r.json?.error });
}

main().catch((e) => {
  console.error('SMOKE FAILED', e);
  process.exitCode = 1;
});
