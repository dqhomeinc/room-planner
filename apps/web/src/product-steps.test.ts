import { describe, expect, it } from 'vitest';
import { productSteps } from './product-steps';

describe('product workflow', () => {
  it('keeps the pilot workflow in its intended order', () => {
    expect(productSteps.map(({ title }) => title)).toEqual([
      'Capture',
      'Calibrate',
      'Explore',
    ]);
  });
});
