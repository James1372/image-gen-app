import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv('IMGBB_API_KEY', 'test-key');
});

describe('POST /api/upload', () => {
  it('gibt 503 zurück wenn kein IMGBB_API_KEY', async () => {
    vi.stubEnv('IMGBB_API_KEY', '');
    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 503 });
  });

  it('gibt 400 zurück wenn kein file-Feld', async () => {
    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 400 });
  });

  it('gibt URL zurück wenn Upload erfolgreich', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { url: 'https://i.ibb.co/aBcD.jpg' } }),
    }));

    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];
    const res = await POST(event);
    const body = await res.json();

    expect(body.url).toBe('https://i.ibb.co/aBcD.jpg');
  });

  it('gibt 502 zurück wenn imgbb fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 502 });
  });

  it('gibt 400 zurück bei Nicht-Bild-Datei', async () => {
    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    formData.append('file', file);
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 400 });
  });

  it('gibt 413 zurück bei zu großer Datei', async () => {
    const { POST } = await import('./+server.js');

    const formData = new FormData();
    const file = new File([new ArrayBuffer(33 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    const req = new Request('http://localhost/api/upload', { method: 'POST', body: formData });
    const event = { request: req } as Parameters<typeof POST>[0];

    await expect(POST(event)).rejects.toMatchObject({ status: 413 });
  });
});
