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

  const body = model.apiSystem === 'b'
    ? buildSystemBBody(req)
    : buildSystemABody(req);

  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (res.status === 402) throw new Error('INSUFFICIENT_CREDITS');
  if (!res.ok) throw new Error('API_ERROR');

  const data = await res.json();

  // System A: data.data.taskId — System B: data.data.taskId
  return data.data.taskId as string;
}

export async function getStatus(modelId: string, taskId: string): Promise<StatusResponse> {
  const model = getModel(modelId);
  const apiKey = getApiKey();

  const url = `${model.pollEndpoint}?taskId=${taskId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error('POLL_ERROR');

  const data = await res.json();

  return model.apiSystem === 'b'
    ? parseSystemBResponse(data)
    : parseSystemAResponse(data);
}

function parseSystemAResponse(data: Record<string, unknown>): StatusResponse {
  if (data.successFlag === 2) return { status: 'error', error: 'Generierung fehlgeschlagen' };
  if (data.successFlag === 1) {
    const response = data.response as Record<string, unknown>;
    return {
      status: 'done',
      imageUrls: response.result_urls as string[],
      progress: data.progress as string,
    };
  }
  return { status: 'pending', progress: (data.progress ?? '0.00') as string };
}

function parseSystemBResponse(data: Record<string, unknown>): StatusResponse {
  const inner = data.data as Record<string, unknown> | undefined;
  if (!inner) return { status: 'pending', progress: '0.00' };

  const status = inner.status as string;

  if (status === 'fail') return { status: 'error', error: 'Generierung fehlgeschlagen' };

  if (status === 'success') {
    const result = inner.result as Record<string, unknown> | undefined;
    const images = (result?.images as Array<{ url: string }> | undefined) ?? [];
    return {
      status: 'done',
      imageUrls: images.map(img => img.url),
      progress: '1.00',
    };
  }

  const progressMap: Record<string, string> = {
    waiting: '0.05',
    queuing: '0.15',
    generating: '0.50',
  };
  return { status: 'pending', progress: progressMap[status] ?? '0.10' };
}

function buildSystemABody(req: GenerateRequest): Record<string, unknown> {
  if (req.modelId === 'gpt4o-image') {
    return { prompt: req.prompt, size: req.aspectRatio, nVariants: req.count, isEnhance: req.enhance };
  }
  // flux-kontext-pro / flux-kontext-max
  return { prompt: req.prompt, aspectRatio: req.aspectRatio, model: req.modelId, outputFormat: 'jpeg', promptUpsampling: req.enhance };
}

function buildSystemBBody(req: GenerateRequest): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt: req.prompt };

  // aspect ratio key varies by model family
  if (req.modelId.startsWith('ideogram/')) {
    input['image_size'] = req.aspectRatio;
  } else {
    input['aspect_ratio'] = req.aspectRatio;
  }

  if (req.resolution) input['resolution'] = req.resolution;

  // models that support num_images
  const multiImageModels = ['google/imagen4-fast', 'wan/2-7-image'];
  if (multiImageModels.includes(req.modelId) && req.count > 1) {
    input['num_images'] = req.count;
  }

  return { model: req.modelId, input };
}
