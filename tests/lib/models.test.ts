import { describe, it, expect } from 'vitest';
import { MODELS, getModel } from '../../src/lib/models.js';

describe('MODELS', () => {
  it('contains at least 3 models', () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(3);
  });

  it('each model has all required fields', () => {
    for (const model of MODELS) {
      expect(model.id, `${model.id} missing id`).toBeTruthy();
      expect(model.label, `${model.id} missing label`).toBeTruthy();
      expect(model.endpoint, `${model.id} missing endpoint`).toMatch(/^https:\/\//);
      expect(model.pollEndpoint, `${model.id} missing pollEndpoint`).toMatch(/^https:\/\//);
      expect(model.aspectRatios.length, `${model.id} has no aspectRatios`).toBeGreaterThan(0);
      expect(model.maxImages, `${model.id} maxImages must be >= 1`).toBeGreaterThanOrEqual(1);
      expect(typeof model.supportsEnhance).toBe('boolean');
    }
  });

  it('all model ids are unique', () => {
    const ids = MODELS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getModel', () => {
  it('returns the correct model by id', () => {
    const model = getModel('gpt4o-image');
    expect(model.id).toBe('gpt4o-image');
    expect(model.label).toBe('GPT-4o Image');
  });

  it('throws for an unknown model id', () => {
    expect(() => getModel('does-not-exist')).toThrow('Unknown model: does-not-exist');
  });
});
