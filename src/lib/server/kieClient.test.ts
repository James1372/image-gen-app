import { describe, it, expect } from 'vitest';
import { buildSystemABody, buildSystemBBody } from './kieClient.js';

const baseReq = {
  prompt: 'a cat',
  aspectRatio: '1:1',
  count: 1,
  enhance: false,
};

describe('buildSystemABody', () => {
  it('gpt4o-image: baut korrekten Body ohne Referenzbild', () => {
    const body = buildSystemABody({ ...baseReq, modelId: 'gpt4o-image' });
    expect(body).toEqual({ prompt: 'a cat', size: '1:1', nVariants: 1, isEnhance: false });
    expect(body['filesUrl']).toBeUndefined();
  });

  it('gpt4o-image: fügt filesUrl hinzu wenn Referenzbild gesetzt', () => {
    const body = buildSystemABody({
      ...baseReq,
      modelId: 'gpt4o-image',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    });
    expect(body['filesUrl']).toEqual(['https://0x0.st/test.jpg']);
  });

  it('flux-kontext-pro: baut korrekten Body ohne Referenzbild', () => {
    const body = buildSystemABody({ ...baseReq, modelId: 'flux-kontext-pro' });
    expect(body['model']).toBe('flux-kontext-pro');
    expect(body['inputImage']).toBeUndefined();
  });

  it('flux-kontext-pro: fügt inputImage hinzu wenn Referenzbild gesetzt', () => {
    const body = buildSystemABody({
      ...baseReq,
      modelId: 'flux-kontext-pro',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    });
    expect(body['inputImage']).toBe('https://0x0.st/test.jpg');
  });
});

describe('buildSystemBBody', () => {
  it('nano-banana-2: übergibt resolution korrekt', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'nano-banana-2',
      resolution: '2K',
    }) as { input: Record<string, unknown> };
    expect(body.input['resolution']).toBe('2K');
  });

  it('nano-banana-2: fügt image_input als Array hinzu', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'nano-banana-2',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    }) as { model: string; input: Record<string, unknown> };
    expect(body.input['image_input']).toEqual(['https://0x0.st/test.jpg']);
    expect(body.model).toBe('nano-banana-2');
  });

  it('gpt-image-2-text-to-image: wechselt Model-ID bei Referenzbild', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'gpt-image-2-text-to-image',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    }) as { model: string; input: Record<string, unknown> };
    expect(body.model).toBe('gpt-image-2-image-to-image');
    expect(body.input['input_urls']).toEqual(['https://0x0.st/test.jpg']);
  });

  it('gpt-image-2-text-to-image: behält Original-Model-ID ohne Referenzbild', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'gpt-image-2-text-to-image',
    }) as { model: string };
    expect(body.model).toBe('gpt-image-2-text-to-image');
  });

  it('midjourney: referenceImageUrl wird ignoriert (supportsReferenceImage: false)', () => {
    const body = buildSystemABody({
      ...baseReq,
      modelId: 'midjourney',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    }) as Record<string, unknown>;
    expect(body['inputImage']).toBeUndefined();
    expect(body['filesUrl']).toBeUndefined();
  });

  it('ideogram: kein referenceImageParam → kein Bild-Feld gesetzt', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'ideogram/v3-text-to-image',
      aspectRatio: 'square',
      referenceImageUrl: 'https://0x0.st/test.jpg',
    }) as { input: Record<string, unknown> };
    expect(body.input['image_size']).toBe('square');
    expect(body.input['referenceImageUrl']).toBeUndefined();
  });

  it('wan/2-7-image: schickt num_images wenn count > 1', () => {
    const body = buildSystemBBody({
      ...baseReq,
      modelId: 'wan/2-7-image',
      count: 3,
    }) as { input: Record<string, unknown> };
    expect(body.input['num_images']).toBe(3);
  });
});
