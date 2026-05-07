export interface ModelConfig {
  id: string;
  label: string;
  endpoint: string;
  pollEndpoint: string;
  aspectRatios: string[];
  maxImages: number;
  supportsEnhance: boolean;
}

export interface GenerateRequest {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  count: number;
  enhance: boolean;
}

export interface StatusResponse {
  status: 'pending' | 'done' | 'error';
  imageUrls?: string[];
  progress?: string;
  error?: string;
}
