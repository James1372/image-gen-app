import { json, error } from '@sveltejs/kit';
import { startGeneration } from '$lib/server/kieClient.js';
import { MODELS } from '$lib/models.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    throw error(400, 'Ungültiger Request-Body');
  }

  const { prompt, modelId, aspectRatio, count, enhance } = body as Record<string, unknown>;

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw error(400, 'Prompt ist erforderlich');
  }
  if (typeof modelId !== 'string' || !MODELS.find(m => m.id === modelId)) {
    throw error(400, 'Ungültiges Modell');
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 4) {
    throw error(400, 'Anzahl muss 1–4 sein');
  }
  if (typeof aspectRatio !== 'string' || !aspectRatio) {
    throw error(400, 'Seitenverhältnis fehlt');
  }

  try {
    const taskId = await startGeneration({
      prompt: prompt.trim(),
      modelId,
      aspectRatio,
      count,
      enhance: enhance === true,
    });
    return json({ taskId, modelId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'RATE_LIMIT') throw error(429, 'Zu viele Anfragen – bitte kurz warten');
    if (msg === 'INSUFFICIENT_CREDITS') throw error(402, 'Nicht genügend Credits');
    throw error(500, 'Generierung fehlgeschlagen');
  }
};
