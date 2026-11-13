export const captureLimits = {
  maxFileSizeBytes: 1024 * 1024 * 1024,
  minDurationSeconds: 10,
  maxDurationSeconds: 5 * 60,
  minLongEdgePixels: 1280,
  minShortEdgePixels: 720,
} as const;

const supportedVideoTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
]);
const supportedVideoExtensions = new Set(['mp4', 'mov', 'm4v', 'webm']);

export type MetadataCheck = {
  code:
    | 'unsupported_format'
    | 'file_too_large'
    | 'duration_too_short'
    | 'duration_too_long'
    | 'resolution_too_low'
    | 'metadata_unavailable';
  message: string;
};

export type VideoMetadata = {
  durationSeconds: number;
  widthPixels: number;
  heightPixels: number;
};

export type MetadataAssessment = {
  assessment: 'checking' | 'accepted' | 'rejected';
  checks: MetadataCheck[];
  metadata?: VideoMetadata;
};

type FileFacts = { fileName: string; fileSizeBytes: number; mimeType: string };

export function assessVideoFile(file: FileFacts): MetadataAssessment {
  const checks: MetadataCheck[] = [];

  const extension = file.fileName.toLowerCase().split('.').pop() ?? '';
  const formatSupported = file.mimeType
    ? supportedVideoTypes.has(file.mimeType)
    : supportedVideoExtensions.has(extension);

  if (!formatSupported) {
    checks.push({
      code: 'unsupported_format',
      message: 'Choose an MP4, MOV, M4V, or WebM video.',
    });
  }

  if (file.fileSizeBytes > captureLimits.maxFileSizeBytes) {
    checks.push({
      code: 'file_too_large',
      message: 'Choose a video no larger than 1 GB.',
    });
  }

  return {
    assessment: checks.length ? 'rejected' : 'checking',
    checks,
  };
}

export function assessVideoMetadata(
  file: FileFacts,
  metadata: VideoMetadata,
): MetadataAssessment {
  const fileAssessment = assessVideoFile(file);
  const checks = [...fileAssessment.checks];
  const { durationSeconds, widthPixels, heightPixels } = metadata;

  if (
    !Number.isFinite(durationSeconds) ||
    !Number.isFinite(widthPixels) ||
    !Number.isFinite(heightPixels) ||
    durationSeconds <= 0 ||
    widthPixels <= 0 ||
    heightPixels <= 0
  ) {
    return metadataUnavailable(checks);
  }

  if (durationSeconds < captureLimits.minDurationSeconds) {
    checks.push({
      code: 'duration_too_short',
      message: 'Record at least 10 seconds so the room has enough coverage.',
    });
  } else if (durationSeconds > captureLimits.maxDurationSeconds) {
    checks.push({
      code: 'duration_too_long',
      message: 'Keep the recording to 5 minutes or less.',
    });
  }

  const longEdge = Math.max(widthPixels, heightPixels);
  const shortEdge = Math.min(widthPixels, heightPixels);
  if (
    longEdge < captureLimits.minLongEdgePixels ||
    shortEdge < captureLimits.minShortEdgePixels
  ) {
    checks.push({
      code: 'resolution_too_low',
      message: 'Record at 1280 × 720 resolution or higher.',
    });
  }

  return {
    assessment: checks.length ? 'rejected' : 'accepted',
    checks,
    metadata,
  };
}

export function metadataUnavailable(
  existingChecks: MetadataCheck[] = [],
): MetadataAssessment {
  return {
    assessment: 'rejected',
    checks: [
      ...existingChecks,
      {
        code: 'metadata_unavailable',
        message:
          'This browser could not read the video details. Try another video.',
      },
    ],
  };
}

export function applyMediaError(
  current: MetadataAssessment | null,
): MetadataAssessment | null {
  return current?.assessment === 'checking'
    ? metadataUnavailable(current.checks)
    : current;
}

export function formatDuration(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return minutes
    ? `${minutes}:${String(remainder).padStart(2, '0')}`
    : `${remainder}s`;
}
