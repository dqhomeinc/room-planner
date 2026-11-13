export const qualityThresholds = {
  minimumMedianLuminance: 45,
  minimumMedianSharpness: 100,
  minimumMedianFrameDifference: 3,
} as const;

export type PixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type QualityCheck = {
  code: 'too_dark' | 'too_blurry' | 'insufficient_motion';
  severity: 'warning';
  message: string;
};

export type QualityAssessment = {
  assessment: 'accepted' | 'warning';
  checks: QualityCheck[];
  metrics: {
    sampleCount: number;
    medianLuminance: number;
    medianSharpness: number;
    medianFrameDifference: number;
  };
};

type MeasuredFrame = {
  luminance: Float32Array;
  meanLuminance: number;
  sharpness: number;
};

export function assessSampledFrames(frames: PixelFrame[]): QualityAssessment {
  if (frames.length < 2) {
    throw new RangeError('quality assessment requires at least two frames');
  }

  const measuredFrames = frames.map(measureFrame);
  const firstFrame = frames[0];
  for (const frame of frames.slice(1)) {
    if (
      frame.width !== firstFrame.width ||
      frame.height !== firstFrame.height
    ) {
      throw new RangeError('sampled frames must have matching dimensions');
    }
  }

  const medianLuminance = median(
    measuredFrames.map(({ meanLuminance }) => meanLuminance),
  );
  const medianSharpness = median(
    measuredFrames.map(({ sharpness }) => sharpness),
  );
  const medianFrameDifference = median(
    measuredFrames
      .slice(1)
      .map((frame, index) =>
        meanAbsoluteDifference(
          measuredFrames[index].luminance,
          frame.luminance,
        ),
      ),
  );

  const checks: QualityCheck[] = [];
  if (medianLuminance < qualityThresholds.minimumMedianLuminance) {
    checks.push({
      code: 'too_dark',
      severity: 'warning',
      message:
        'The sampled frames are dark. Add light or record during the day.',
    });
  }
  if (medianSharpness < qualityThresholds.minimumMedianSharpness) {
    checks.push({
      code: 'too_blurry',
      severity: 'warning',
      message:
        'The sampled frames look blurry. Move slowly and hold the phone steady.',
    });
  }
  if (medianFrameDifference < qualityThresholds.minimumMedianFrameDifference) {
    checks.push({
      code: 'insufficient_motion',
      severity: 'warning',
      message: 'Show more viewpoints by walking slowly around the room.',
    });
  }

  return {
    assessment: checks.length ? 'warning' : 'accepted',
    checks,
    metrics: {
      sampleCount: frames.length,
      medianLuminance: round(medianLuminance),
      medianSharpness: round(medianSharpness),
      medianFrameDifference: round(medianFrameDifference),
    },
  };
}

function measureFrame(frame: PixelFrame): MeasuredFrame {
  if (
    !Number.isInteger(frame.width) ||
    !Number.isInteger(frame.height) ||
    frame.width < 3 ||
    frame.height < 3 ||
    frame.data.length !== frame.width * frame.height * 4
  ) {
    throw new RangeError('frame data must be RGBA pixels at least 3 by 3');
  }

  const luminance = new Float32Array(frame.width * frame.height);
  let total = 0;
  for (let pixel = 0; pixel < luminance.length; pixel += 1) {
    const offset = pixel * 4;
    const value =
      frame.data[offset] * 0.2126 +
      frame.data[offset + 1] * 0.7152 +
      frame.data[offset + 2] * 0.0722;
    luminance[pixel] = value;
    total += value;
  }

  return {
    luminance,
    meanLuminance: total / luminance.length,
    sharpness: laplacianVariance(luminance, frame.width, frame.height),
  };
}

function laplacianVariance(
  luminance: Float32Array,
  width: number,
  height: number,
): number {
  const values: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      values.push(
        4 * luminance[center] -
          luminance[center - 1] -
          luminance[center + 1] -
          luminance[center - width] -
          luminance[center + width],
      );
    }
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  );
}

function meanAbsoluteDifference(
  first: Float32Array,
  second: Float32Array,
): number {
  let total = 0;
  for (let index = 0; index < first.length; index += 1) {
    total += Math.abs(first[index] - second[index]);
  }
  return total / first.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
