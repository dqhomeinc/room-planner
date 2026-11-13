import type { PixelFrame } from './capture-quality';

export const samplingBudget = {
  sampleCount: 6,
  maxWidth: 160,
  maxHeight: 90,
  eventTimeoutMilliseconds: 10_000,
} as const;

export function sampleTimestamps(
  durationSeconds: number,
  sampleCount: number = samplingBudget.sampleCount,
): number[] {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isInteger(sampleCount) ||
    sampleCount < 2 ||
    sampleCount > 8
  ) {
    throw new RangeError('sampling requires a duration and 2 to 8 frames');
  }

  return Array.from(
    { length: sampleCount },
    (_, index) => (durationSeconds * (index + 1)) / (sampleCount + 1),
  );
}

export function fitSampleDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('video dimensions must be positive integers');
  }

  const scale = Math.min(
    1,
    samplingBudget.maxWidth / width,
    samplingBudget.maxHeight / height,
  );
  return {
    width: Math.max(3, Math.round(width * scale)),
    height: Math.max(3, Math.round(height * scale)),
  };
}

export async function sampleVideoFrames(
  sourceUrl: string,
  durationSeconds: number,
  signal: AbortSignal,
): Promise<PixelFrame[]> {
  signal.throwIfAborted();
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = sourceUrl;

  try {
    video.load();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, 'loadeddata', signal);
    }

    const dimensions = fitSampleDimensions(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas pixel sampling is unavailable in this browser.');
    }

    const frames: PixelFrame[] = [];
    for (const timestamp of sampleTimestamps(durationSeconds)) {
      signal.throwIfAborted();
      await seekVideo(video, timestamp, signal);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
      });
    }
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

async function seekVideo(
  video: HTMLVideoElement,
  timestamp: number,
  signal: AbortSignal,
): Promise<void> {
  if (Math.abs(video.currentTime - timestamp) < 0.01) {
    return;
  }
  const seeked = waitForMediaEvent(video, 'seeked', signal);
  video.currentTime = timestamp;
  await seeked;
}

function waitForMediaEvent(
  video: HTMLVideoElement,
  eventName: 'loadeddata' | 'seeked',
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error('Video sampling timed out.'))),
      samplingBudget.eventTimeoutMilliseconds,
    );
    const onEvent = () => finish(resolve);
    const onError = () =>
      finish(() =>
        reject(new Error('The browser could not sample this video.')),
      );
    const onAbort = () =>
      finish(() =>
        reject(new DOMException('Sampling cancelled', 'AbortError')),
      );
    const finish = (complete: () => void) => {
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
      signal.removeEventListener('abort', onAbort);
      complete();
    };

    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener('error', onError, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
