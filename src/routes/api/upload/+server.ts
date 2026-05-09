import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw error(503, 'IMGBB_API_KEY nicht konfiguriert');

  const formData = await request.formData().catch(() => null);
  if (!formData) throw error(400, 'Ungültiger Form-Body');

  const file = formData.get('file');
  if (!(file instanceof File)) throw error(400, 'Feld "file" fehlt oder ist keine Datei');
  if (!file.type.startsWith('image/')) throw error(400, 'Nur Bilddateien erlaubt');
  if (file.size > 32 * 1024 * 1024) throw error(413, 'Datei zu groß (max. 32 MB)');

  const upload = new FormData();
  upload.append('image', file, file.name);

  let res: Response;
  try {
    res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: upload,
    });
  } catch (e) {
    throw error(502, `Netzwerkfehler: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) throw error(502, `imgbb: HTTP ${res.status}`);

  const data = await res.json() as { success: boolean; data?: { url: string } };
  if (!data.success || !data.data?.url) throw error(502, 'imgbb: kein URL in Antwort');
  return json({ url: data.data.url });
};
