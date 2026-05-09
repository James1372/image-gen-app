export interface ModelConfig {
  id: string;
  label: string;
  apiSystem: 'a' | 'b';
  endpoint: string;
  pollEndpoint: string;
  aspectRatios: string[];
  maxImages: number;
  supportsEnhance: boolean;
  supportsResolution: boolean;
  supportsReferenceImage: boolean;
  referenceImageParam?: string;
  referenceImageIsArray?: boolean;
  referenceImageModelId?: string;
}

export interface GenerateRequest {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  count: number;
  enhance: boolean;
  resolution?: string;
  referenceImageUrl?: string;
}

export interface StatusResponse {
  status: 'pending' | 'done' | 'error';
  imageUrls?: string[];
  progress?: string;
  error?: string;
}
