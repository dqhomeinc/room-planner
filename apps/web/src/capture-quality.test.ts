import { describe, expect, it } from 'vitest';
import { assessSampledFrames, type PixelFrame } from './capture-quality';

function frame(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): PixelFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = pixel(x, y);
      data.set([red, green, blue, 255], offset);
    }
  }
  return { width, height, data };
}

function checkerboard(shift = 0, low = 30, high = 230): PixelFrame {
  return frame(8, 8, (x, y) => {
    const value = (x + y + shift) % 2 ? high : low;
    return [value, value, value];
  });
}

describe('sampled capture quality', () => {
  it('accepts bright, sharp frames with viewpoint changes', () => {
    const result = assessSampledFrames([
      checkerboard(0),
      checkerboard(1),
      checkerboard(0),
    ]);

    expect(result).toMatchObject({
      assessment: 'accepted',
      checks: [],
      metrics: { sampleCount: 3 },
    });
    expect(result.metrics.medianLuminance).toBe(130);
    expect(result.metrics.medianFrameDifference).toBe(200);
  });

  it('warns when most sampled frames are dark', () => {
    const dark = checkerboard(0, 0, 40);
    const codes = assessSampledFrames([dark, dark]).checks.map(
      ({ code }) => code,
    );

    expect(codes).toContain('too_dark');
  });

  it('warns when sampled frames lack sharp detail', () => {
    const gradient = frame(8, 8, (x) => {
      const value = 100 + x * 4;
      return [value, value, value];
    });
    const shifted = frame(8, 8, (x) => {
      const value = 110 + x * 4;
      return [value, value, value];
    });

    expect(
      assessSampledFrames([gradient, shifted]).checks.map(({ code }) => code),
    ).toContain('too_blurry');
  });

  it('warns when frames have no viewpoint change', () => {
    expect(
      assessSampledFrames([checkerboard(), checkerboard()]).checks.map(
        ({ code }) => code,
      ),
    ).toContain('insufficient_motion');
  });

  it('reports all applicable warnings without rejecting the capture', () => {
    const flatDarkFrame = frame(4, 4, () => [10, 10, 10]);
    const result = assessSampledFrames([flatDarkFrame, flatDarkFrame]);

    expect(result.assessment).toBe('warning');
    expect(result.checks.map(({ code }) => code)).toEqual([
      'too_dark',
      'too_blurry',
      'insufficient_motion',
    ]);
  });

  it('rejects invalid or inconsistent sample data', () => {
    expect(() => assessSampledFrames([checkerboard()])).toThrow(
      'at least two frames',
    );
    expect(() =>
      assessSampledFrames([checkerboard(), frame(7, 8, () => [100, 100, 100])]),
    ).toThrow('matching dimensions');
    expect(() =>
      assessSampledFrames([
        { width: 8, height: 8, data: new Uint8ClampedArray(4) },
        checkerboard(),
      ]),
    ).toThrow('RGBA pixels');
  });
});
