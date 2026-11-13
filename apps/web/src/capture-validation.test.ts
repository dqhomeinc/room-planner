import { describe, expect, it } from 'vitest';
import {
  assessVideoFile,
  assessVideoMetadata,
  captureLimits,
  formatDuration,
  metadataUnavailable,
} from './capture-validation';

const validFile = {
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

  it.each([
    [9.6, '10s'],
    [65, '1:05'],
  ])('formats %f seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
