import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData().catch(() => null);
  if (!formData) throw error(400, 'Ungültiger Form-Body');

  const file = formData.get('file');
  if (!(file instanceof File)) throw error(400, 'Feld "file" fehlt oder ist keine Datei');

  const upload = new FormData();
  upload.append('file', file, file.name);

  const res = await fetch('https://0x0.st', { method: 'POST', body: upload });
  if (!res.ok) throw error(502, 'Upload zu 0x0.st fehlgeschlagen');

  const url = (await res.text()).trim();
  return json({ url });
};
