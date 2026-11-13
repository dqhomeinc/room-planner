import { describe, expect, it } from 'vitest';
import {
  applyMediaError,
  assessVideoFile,
  assessVideoMetadata,
  captureLimits,
  formatDuration,
  metadataUnavailable,
} from './capture-validation';

const validFile = {
  fileName: 'room.mp4',
  fileSizeBytes: 80 * 1024 * 1024,
  mimeType: 'video/mp4',
};

describe('capture metadata validation', () => {
  it('accepts a supported landscape capture at the pilot boundaries', () => {
    expect(
      assessVideoMetadata(validFile, {
        durationSeconds: captureLimits.minDurationSeconds,
        widthPixels: 1280,
        heightPixels: 720,
      }),
    ).toMatchObject({ assessment: 'accepted', checks: [] });
  });

  it('accepts portrait video without treating orientation as low resolution', () => {
    expect(
      assessVideoMetadata(validFile, {
        durationSeconds: 45,
        widthPixels: 1080,
        heightPixels: 1920,
      }).assessment,
    ).toBe('accepted');
  });

  it('rejects unsupported and oversized files before loading metadata', () => {
    expect(
      assessVideoFile({
        fileName: 'room.mkv',
        fileSizeBytes: captureLimits.maxFileSizeBytes + 1,
        mimeType: 'video/x-matroska',
      }).checks.map(({ code }) => code),
    ).toEqual(['unsupported_format', 'file_too_large']);
  });

  it.each([
    [9, 1920, 1080, 'duration_too_short'],
    [301, 1920, 1080, 'duration_too_long'],
    [45, 640, 480, 'resolution_too_low'],
  ])(
    'rejects duration %i and resolution %ix%i as %s',
    (durationSeconds, widthPixels, heightPixels, expectedCode) => {
      expect(
        assessVideoMetadata(validFile, {
          durationSeconds,
          widthPixels,
          heightPixels,
        }).checks.map(({ code }) => code),
      ).toContain(expectedCode);
    },
  );

  it('rejects unreadable metadata with an actionable message', () => {
    expect(metadataUnavailable()).toMatchObject({
      assessment: 'rejected',
      checks: [{ code: 'metadata_unavailable' }],
    });
  });

  it('preserves file failures when metadata is unreadable', () => {
    const result = assessVideoMetadata(
      {
        fileName: 'room.mp4',
        fileSizeBytes: captureLimits.maxFileSizeBytes + 1,
        mimeType: 'video/mp4',
      },
      { durationSeconds: Number.NaN, widthPixels: 0, heightPixels: 0 },
    );

    expect(result.checks.map(({ code }) => code)).toEqual([
      'file_too_large',
      'metadata_unavailable',
    ]);
  });

  it.each([
    [Number.NaN, 1920, 1080],
    [45, Number.NaN, 1080],
    [45, 1920, Number.POSITIVE_INFINITY],
  ])(
    'rejects non-finite metadata values',
    (durationSeconds, widthPixels, heightPixels) => {
      expect(
        assessVideoMetadata(validFile, {
          durationSeconds,
          widthPixels,
          heightPixels,
        }).checks.map(({ code }) => code),
      ).toContain('metadata_unavailable');
    },
  );

  it('falls back to a supported extension when MIME type is empty', () => {
    expect(
      assessVideoFile({
        fileName: 'ROOM.MOV',
        fileSizeBytes: 20,
        mimeType: '',
      }).assessment,
    ).toBe('checking');
  });

  it('turns media errors into rejections only while metadata is pending', () => {
    const checking = assessVideoFile(validFile);
    const accepted = assessVideoMetadata(validFile, {
      durationSeconds: 45,
      widthPixels: 1920,
      heightPixels: 1080,
    });

    expect(applyMediaError(checking)?.assessment).toBe('rejected');
    expect(applyMediaError(accepted)).toBe(accepted);
    expect(applyMediaError(null)).toBeNull();
  });

  it('accepts exact upper boundaries and rejects a 719px short edge', () => {
    expect(
      assessVideoMetadata(
        {
          ...validFile,
          fileSizeBytes: captureLimits.maxFileSizeBytes,
        },
        { durationSeconds: 300, widthPixels: 1280, heightPixels: 720 },
      ).assessment,
    ).toBe('accepted');
    expect(
      assessVideoMetadata(validFile, {
        durationSeconds: 45,
        widthPixels: 1280,
        heightPixels: 719,
      }).checks.map(({ code }) => code),
    ).toContain('resolution_too_low');
  });

  it.each([
    [9.6, '10s'],
    [65, '1:05'],
  ])('formats %f seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
