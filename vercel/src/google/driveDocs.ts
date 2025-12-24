import { getGoogleClients } from './client';
import { loadGoogleEnv } from './env';

const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';

function driveParams() {
  const { driveId } = loadGoogleEnv();
  return driveId
    ? {
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive' as const,
        driveId,
      }
    : {
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives' as const,
      };
}

async function findFolderId(parentId: string, name: string): Promise<string | null> {
  const { drive } = getGoogleClients();
  const params = driveParams();

  const q = [
    `mimeType='${GOOGLE_FOLDER_MIME}'`,
    `name='${name.replace(/'/g, "\\'")}'`,
    `'${parentId}' in parents`,
    'trashed=false',
  ].join(' and ');

  const res = await drive.files.list({
    ...params,
    q,
    fields: 'files(id,name)',
    pageSize: 1,
  });
  const file = res.data.files?.[0];
  return file?.id ?? null;
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const { drive } = getGoogleClients();
  const params = driveParams();

  const res = await drive.files.create({
    ...params,
    requestBody: {
      name,
      mimeType: GOOGLE_FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id',
  });
  if (!res.data.id) throw new Error('Failed to create folder');
  return res.data.id;
}

export async function ensureFolderPath(parentId: string, parts: string[]): Promise<string> {
  let cur = parentId;
  for (const part of parts) {
    const name = String(part || '').trim();
    if (!name) continue;
    const found = await findFolderId(cur, name);
    cur = found ?? (await createFolder(cur, name));
  }
  return cur;
}

export type DocShareRole = 'viewer' | 'commenter' | 'editor';

export async function setDocLinkShare(docId: string, role: DocShareRole) {
  const { drive } = getGoogleClients();
  const params = driveParams();

  const driveRole = role === 'editor' ? 'writer' : role === 'commenter' ? 'commenter' : 'reader';

  await drive.permissions.create({
    ...params,
    fileId: docId,
    requestBody: {
      type: 'anyone',
      role: driveRole,
    },
  });

  const meta = await drive.files.get({
    ...params,
    fileId: docId,
    fields: 'id,webViewLink',
  });

  return {
    docId,
    url: meta.data.webViewLink ?? `https://docs.google.com/document/d/${docId}`,
  };
}

export async function createGoogleDocInFolder(opts: {
  title: string;
  folderId: string;
  shareRole?: DocShareRole;
  initialText?: string;
}) {
  const { drive, docs } = getGoogleClients();
  const params = driveParams();

  // 1) create doc
  const created = await docs.documents.create({ requestBody: { title: opts.title } });
  const docId = created.data.documentId;
  if (!docId) throw new Error('Failed to create document');

  // 2) move into folder
  const parents = await drive.files.get({
    ...params,
    fileId: docId,
    fields: 'parents',
  });
  const prevParents = (parents.data.parents || []).join(',');

  await drive.files.update({
    ...params,
    fileId: docId,
    addParents: opts.folderId,
    removeParents: prevParents || undefined,
    fields: 'id,webViewLink',
  });

  // 3) optional text
  if (opts.initialText && opts.initialText.trim()) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: opts.initialText,
            },
          },
        ],
      },
    });
  }

  // 4) share
  if (opts.shareRole) {
    try {
      await setDocLinkShare(docId, opts.shareRole);
    } catch {
      // sharing can fail in some org policies; still return doc
    }
  }

  const url = `https://docs.google.com/document/d/${docId}`;
  return { docId, url };
}

export async function prependDocText(docId: string, text: string) {
  const { docs } = getGoogleClients();
  const t = String(text || '');
  if (!t.trim()) return true;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: `${t}\n`,
          },
        },
      ],
    },
  });

  return true;
}

/**
 * Copy a Google Doc template to a new document
 */
export async function copyDocTemplate(opts: {
  templateId: string;
  title: string;
  folderId: string;
  shareRole?: DocShareRole;
  replacements?: Record<string, string>;
}): Promise<{ docId: string; url: string }> {
  const { drive, docs } = getGoogleClients();
  const params = driveParams();

  // Copy the template
  const copyRes = await drive.files.copy({
    ...params,
    fileId: opts.templateId,
    requestBody: {
      name: opts.title,
      parents: [opts.folderId],
    },
    fields: 'id,webViewLink',
  });

  const docId = copyRes.data.id;
  if (!docId) throw new Error('Failed to copy template');

  let url = copyRes.data.webViewLink ?? `https://docs.google.com/document/d/${docId}`;

  // Apply text replacements if provided
  if (opts.replacements && Object.keys(opts.replacements).length > 0) {
    const requests: any[] = [];

    for (const [search, replace] of Object.entries(opts.replacements)) {
      requests.push({
        replaceAllText: {
          containsText: {
            text: search,
            matchCase: false,
          },
          replaceText: replace,
        },
      });
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests },
      });
    }
  }

  if (opts.shareRole) {
    const shared = await setDocLinkShare(docId, opts.shareRole);
    url = shared.url;
  }

  return { docId, url };
}

export async function replaceDocWithMemo(docId: string, memoText: string) {
  const { docs } = getGoogleClients();
  const text = String(memoText || '');

  // 1) try placeholder replacement
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: { text: '{{BODY}}', matchCase: false },
            replaceText: text,
          },
        },
        {
          replaceAllText: {
            containsText: { text: '【本文】', matchCase: false },
            replaceText: text,
          },
        },
        {
          replaceAllText: {
            containsText: { text: '＜本文＞', matchCase: false },
            replaceText: text,
          },
        },
      ],
    },
  });

  // 2) append at end (safe fallback)
  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body?.content?.at(-1)?.endIndex;
  const insertIndex = typeof endIndex === 'number' ? Math.max(1, endIndex - 1) : 1;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text: `\n${text}`,
          },
        },
      ],
    },
  });

  return true;
}

export async function appendDocWithMemo(docId: string, memoText: string) {
  const { docs } = getGoogleClients();
  const text = String(memoText || '');

  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body?.content?.at(-1)?.endIndex;
  const insertIndex = typeof endIndex === 'number' ? Math.max(1, endIndex - 1) : 1;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text: `\n${text}`,
          },
        },
      ],
    },
  });

  return true;
}

export async function getLogoDataUrl() {
  const { drive } = getGoogleClients();
  const { logoFileId } = loadGoogleEnv();
  if (!logoFileId) throw new Error('Missing env: GOOGLE_LOGO_FILE_ID');

  const params = driveParams();

  // `alt=media` returns binary; googleapis gives it back in `data`.
  const res: any = await drive.files.get(
    { ...params, fileId: logoFileId, alt: 'media' as any },
    { responseType: 'arraybuffer' }
  );

  const meta = await drive.files.get({
    ...params,
    fileId: logoFileId,
    fields: 'mimeType',
  });

  const mimeType = meta.data.mimeType || 'application/octet-stream';
  const buf = Buffer.from(res.data as ArrayBuffer);
  const base64 = buf.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}
