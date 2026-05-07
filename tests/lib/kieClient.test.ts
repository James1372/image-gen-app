import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenerateRequest } from '../../src/lib/types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubEnv('KIE_API_KEY', 'test-key-123');

const { startGeneration, getStatus } = await import('../../src/lib/server/kieClient.js');

const baseRequest: GenerateRequest = {
  prompt: 'A mountain at sunset',
  modelId: 'gpt4o-image',
  aspectRatio: '1:1',
  count: 1,
  enhance: false,
};

describe('startGeneration', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls gpt4o endpoint and returns taskId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, msg: 'success', data: { taskId: 'task_abc123' } }),
    });

    const taskId = await startGeneration(baseRequest);

    expect(taskId).toBe('task_abc123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/gpt4o-image/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key-123',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('sends correct body for gpt4o-image model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, data: { taskId: 'task_xyz' } }),
    });

    await startGeneration({ ...baseRequest, count: 2, enhance: true });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      prompt: 'A mountain at sunset',
      size: '1:1',
      nVariants: 2,
      isEnhance: true,
    });
  });

  it('sends correct body for flux-kontext-pro model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, data: { taskId: 'task_flux' } }),
    });

    await startGeneration({ ...baseRequest, modelId: 'flux-kontext-pro', aspectRatio: '16:9' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      prompt: 'A mountain at sunset',
      aspectRatio: '16:9',
      model: 'flux-kontext-pro',
    });
  });

  it('throws RATE_LIMIT on HTTP 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(startGeneration(baseRequest)).rejects.toThrow('RATE_LIMIT');
  });

  it('throws INSUFFICIENT_CREDITS on HTTP 402', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 402 });
    await expect(startGeneration(baseRequest)).rejects.toThrow('INSUFFICIENT_CREDITS');
  });

  it('throws API_ERROR on other non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(startGeneration(baseRequest)).rejects.toThrow('API_ERROR');
  });
});

describe('getStatus', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns pending when successFlag is 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ successFlag: 0, progress: '0.45' }),
    });

    const result = await getStatus('gpt4o-image', 'task_abc123');
    expect(result).toEqual({ status: 'pending', progress: '0.45' });
  });

  it('returns done with imageUrls when successFlag is 1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successFlag: 1,
        progress: '1.00',
        response: { result_urls: ['https://cdn.kie.ai/img/abc.jpg'] },
      }),
    });

    const result = await getStatus('gpt4o-image', 'task_abc123');
    expect(result).toEqual({
      status: 'done',
      imageUrls: ['https://cdn.kie.ai/img/abc.jpg'],
      progress: '1.00',
    });
  });

  it('returns error when successFlag is 2', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ successFlag: 2, progress: '0.00' }),
    });

    const result = await getStatus('gpt4o-image', 'task_abc123');
    expect(result.status).toBe('error');
    expect(result.error).toBeTruthy();
  });

  it('polls the correct endpoint with taskId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ successFlag: 0, progress: '0.10' }),
    });

    await getStatus('gpt4o-image', 'task_abc123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId=task_abc123',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-key-123' }),
      })
    );
  });
});

describe('System B: startGeneration', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls unified createTask endpoint for nano-banana-2', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, data: { taskId: 'task_nb2_abc' } }),
    });

    const taskId = await startGeneration({
      prompt: 'A sunset',
      modelId: 'nano-banana-2',
      aspectRatio: '16:9',
      count: 1,
      enhance: false,
      resolution: '2K',
    });

    expect(taskId).toBe('task_nb2_abc');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.kie.ai/api/v1/jobs/createTask',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('nano-banana-2');
    expect(body.input.prompt).toBe('A sunset');
    expect(body.input.resolution).toBe('2K');
  });
});

describe('System B: getStatus', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns pending for queuing status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 200, data: { taskId: 'task_nb2_abc', status: 'queuing' } }),
    });
    const result = await getStatus('nano-banana-2', 'task_nb2_abc');
    expect(result.status).toBe('pending');
    expect(result.progress).toBe('0.15');
  });

  it('returns done with imageUrls on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          taskId: 'task_nb2_abc',
          status: 'success',
          result: { images: [{ url: 'https://cdn.kie.ai/nb2.jpg' }] },
        },
      }),
    });
    const result = await getStatus('nano-banana-2', 'task_nb2_abc');
    expect(result).toEqual({ status: 'done', imageUrls: ['https://cdn.kie.ai/nb2.jpg'], progress: '1.00' });
  });

  it('returns error on fail status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 200, data: { status: 'fail' } }),
    });
    const result = await getStatus('nano-banana-2', 'task_nb2_abc');
    expect(result.status).toBe('error');
  });
});
