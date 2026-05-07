import type { ModelConfig } from './types.js';

export const MODELS: ModelConfig[] = [
  {
    id: 'gpt4o-image',
    label: 'GPT-4o Image',
    endpoint: 'https://api.kie.ai/api/v1/gpt4o-image/generate',
    pollEndpoint: 'https://api.kie.ai/api/v1/gpt4o-image/record-info',
    aspectRatios: ['1:1', '3:2', '2:3'],
    maxImages: 4,
    supportsEnhance: true,
  },
  {
    id: 'flux-kontext-pro',
    label: 'Flux Kontext Pro',
    endpoint: 'https://api.kie.ai/api/v1/flux/kontext/generate',
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    maxImages: 1,
    supportsEnhance: true,
  },
  {
    id: 'flux-kontext-max',
    label: 'Flux Kontext Max',
    endpoint: 'https://api.kie.ai/api/v1/flux/kontext/generate',
    pollEndpoint: 'https://api.kie.ai/api/v1/flux/kontext/record-info',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    maxImages: 1,
    supportsEnhance: true,
  },
  {
    id: 'midjourney',
    label: 'Midjourney',
    endpoint: 'https://api.kie.ai/api/v1/midjourney/imagine',
    pollEndpoint: 'https://api.kie.ai/api/v1/midjourney/record-info',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'],
    maxImages: 4,
    supportsEnhance: false,
  },
];

export function getModel(id: string): ModelConfig {
  const model = MODELS.find(m => m.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}
