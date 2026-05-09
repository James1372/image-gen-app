import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[upload] start, content-type:', request.headers.get('content-type'));

    const formData = await request.formData();
    console.log('[upload] formData parsed');

    const file = formData.get('file');
    console.log('[upload] file:', typeof file, file instanceof File ? `File(${(file as File).type}, ${(file as File).size})` : String(file));

    if (!(file instanceof File)) throw error(400, 'Feld "file" fehlt oder ist keine Datei');
    if (!file.type.startsWith('image/')) throw error(400, `Nur Bilddateien erlaubt (type: ${file.type})`);
    if (file.size > 50 * 1024 * 1024) throw error(413, 'Datei zu groß (max. 50 MB)');

    const upload = new FormData();
    upload.append('reqtype', 'fileupload');
    upload.append('fileToUpload', file, file.name);

    console.log('[upload] sending to catbox.moe');
    let res: Response;
    try {
      res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: upload });
    } catch (e) {
      throw error(502, `Netzwerkfehler: ${e instanceof Error ? e.message : String(e)}`);
    }

    console.log('[upload] catbox.moe status:', res.status);
    if (!res.ok) throw error(502, `catbox.moe: HTTP ${res.status}`);

    const url = (await res.text()).trim();
    console.log('[upload] url:', url);
    if (!url.startsWith('https://')) throw error(502, `Ungültige URL: ${url.slice(0, 60)}`);
    return json({ url });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    console.error('[upload] unhandled error:', e);
    throw error(500, `Debug: ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`);
  }
};
