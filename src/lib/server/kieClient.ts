import { getModel } from '$lib/models.js';
import type { GenerateRequest, StatusResponse } from '$lib/types.js';

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error('KIE_API_KEY environment variable is not set');
  return key;
}

export async function startGeneration(req: GenerateRequest): Promise<string> {
  const model = getModel(req.modelId);
  const apiKey = getApiKey();

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(req)),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (res.status === 402) throw new Error('INSUFFICIENT_CREDITS');
  if (!res.ok) throw new Error('API_ERROR');

  const data = await res.json();
  return data.data.taskId as string;
}

export async function getStatus(modelId: string, taskId: string): Promise<StatusResponse> {
  const model = getModel(modelId);
  const apiKey = getApiKey();

  const res = await fetch(`${model.pollEndpoint}?taskId=${taskId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error('POLL_ERROR');

  const data = await res.json();

  if (data.successFlag === 2) {
    return { status: 'error', error: 'Generierung fehlgeschlagen' };
  }
  if (data.successFlag === 1) {
    return {
      status: 'done',
      imageUrls: data.response.result_urls as string[],
      progress: data.progress as string,
    };
  }
  return { status: 'pending', progress: (data.progress ?? '0.00') as string };
}

function buildBody(req: GenerateRequest): Record<string, unknown> {
  if (req.modelId === 'gpt4o-image') {
    return {
      prompt: req.prompt,
      size: req.aspectRatio,
      nVariants: req.count,
      isEnhance: req.enhance,
    };
  }
  return {
    prompt: req.prompt,
    aspectRatio: req.aspectRatio,
    model: req.modelId,
    outputFormat: 'jpeg',
    promptUpsampling: req.enhance,
  };
}
