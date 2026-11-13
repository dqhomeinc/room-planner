import { describe, expect, it } from 'vitest';
import {
  fitSampleDimensions,
  sampleTimestamps,
  sampleVideoFrames,
  samplingBudget,
} from './video-frame-sampler';

describe('bounded video frame sampling', () => {
  it('spaces samples away from the start and end of the capture', () => {
    expect(sampleTimestamps(70)).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('limits the number of requested frames', () => {
    expect(() => sampleTimestamps(30, 1)).toThrow('2 to 8 frames');
    expect(() => sampleTimestamps(30, 9)).toThrow('2 to 8 frames');
  });

  it('downscales landscape and portrait frames within the pixel budget', () => {
    expect(fitSampleDimensions(1920, 1080)).toEqual({ width: 160, height: 90 });
    expect(fitSampleDimensions(1080, 1920)).toEqual({ width: 51, height: 90 });
    expect(fitSampleDimensions(80, 60)).toEqual({ width: 80, height: 60 });
  });

  it('keeps the default memory budget below half a megabyte', () => {
    const maximumBytes =
      samplingBudget.sampleCount *
      samplingBudget.maxWidth *
      samplingBudget.maxHeight *
      4;
    expect(maximumBytes).toBeLessThan(500_000);
  });

  it('stops before touching browser APIs when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      sampleVideoFrames('blob:cancelled', 30, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
