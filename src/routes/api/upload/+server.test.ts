import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/upload', () => {
  it('gibt 400 zurück wenn kein file-Feld', async () => {
    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 400 });
  });

  it('gibt URL zurück wenn Upload erfolgreich', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'https://0x0.st/aBcD.jpg\n',
    }));

    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const event = { request: req } as Parameters<typeof POST>[0];
    const res = await POST(event);
    const body = await res.json();

    expect(body.url).toBe('https://0x0.st/aBcD.jpg');
  });

  it('gibt 502 zurück wenn 0x0.st-Upload fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);

    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const event = { request: req } as Parameters<typeof POST>[0];
    await expect(POST(event)).rejects.toMatchObject({ status: 502 });
  });
});
