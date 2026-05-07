import { json, error } from '@sveltejs/kit';
import { getStatus } from '$lib/server/kieClient.js';
import { MODELS } from '$lib/models.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params, url }) => {
  const { taskId } = params;
  const modelId = url.searchParams.get('modelId');

  if (!modelId || !MODELS.find(m => m.id === modelId)) {
    throw error(400, 'Ungültige oder fehlende modelId');
  }
  if (!taskId) {
    throw error(400, 'taskId fehlt');
  }

  try {
    const status = await getStatus(modelId, taskId);
    return json(status);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
    throw error(500, msg);
  }
};
