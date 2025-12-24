type EchoOut = {
  ok: true;
  method: string;
  contentType: string | null;
  contentLength: string | null;
  hasReqBodyProp: boolean;
  typeofReqBody: string;
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

  const rawBody = await readRawBody(req);

  const out: EchoOut = {
    ok: true,
    method: String(req.method || ''),
    contentType: req.headers?.['content-type'] ? String(req.headers['content-type']) : null,
    contentLength: req.headers?.['content-length'] ? String(req.headers['content-length']) : null,
    hasReqBodyProp: Object.prototype.hasOwnProperty.call(req, 'body'),
    typeofReqBody: typeof (req as any).body,
    rawBody,
  };

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out));
}
