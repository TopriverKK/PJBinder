type EchoOut = {
  ok: true;
  method: string;
  contentType: string | null;
  contentLength: string | null;
  bodyAccessError: string | null;
  hasReqBodyProp: boolean;
  typeofReqBody: string;
  reqBodyPreview: string;
  rawReadError: string | null;
  rawBody: string;
};

async function readRawBody(req: any): Promise<string> {
  return await new Promise((resolve, reject) => {
    try {
      let data = '';
      req.setEncoding?.('utf8');
      req.on?.('data', (chunk: any) => {
        data += String(chunk ?? '');
      });
      req.on?.('end', () => resolve(data));
      req.on?.('error', (err: any) => reject(err));
      if (!req.on) resolve('');
    } catch (e) {
      reject(e);
    }
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  let bodyAccessError: string | null = null;
  let typeofReqBody = 'undefined';
  let reqBodyPreview = '';
  try {
    typeofReqBody = typeof (req as any).body;
    const b = (req as any).body;
    if (b == null) {
      reqBodyPreview = '';
    } else if (typeof b === 'string') {
      reqBodyPreview = b.slice(0, 500);
    } else {
      try {
        reqBodyPreview = JSON.stringify(b).slice(0, 500);
      } catch {
        reqBodyPreview = String(b).slice(0, 500);
      }
    }
  } catch (e: any) {
    bodyAccessError = e?.message ? String(e.message) : String(e);
  }

  let rawBody = '';
  let rawReadError: string | null = null;
  try {
    rawBody = await readRawBody(req);
  } catch (e: any) {
    rawReadError = e?.message ? String(e.message) : String(e);
  }

  const out: EchoOut = {
    ok: true,
    method: String(req.method || ''),
    contentType: req.headers?.['content-type'] ? String(req.headers['content-type']) : null,
    contentLength: req.headers?.['content-length'] ? String(req.headers['content-length']) : null,
    bodyAccessError,
    hasReqBodyProp: Object.prototype.hasOwnProperty.call(req, 'body'),
    typeofReqBody,
    reqBodyPreview,
    rawReadError,
    rawBody,
  };

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out));
}
