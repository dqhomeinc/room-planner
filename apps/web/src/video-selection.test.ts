import { describe, expect, it } from 'vitest';
import { describeVideo, formatVideoSize } from './video-selection';

describe('video selection', () => {
  it('keeps only local preview metadata', () => {
    expect(
      describeVideo(
        { name: 'living-room.mov', size: 5_242_880, type: 'video/quicktime' },
        'blob:local-preview',
      ),
    ).toEqual({
      mimeType: 'video/quicktime',
      name: 'living-room.mov',
      previewUrl: 'blob:local-preview',
      size: 5_242_880,
      type: 'video/quicktime',
    });
  });

  it('labels missing types without losing the raw MIME value', () => {
    const selection = describeVideo(
      { name: 'room-video', size: 4, type: '' },
      'blob:unknown-format',
    );

    expect(selection).toMatchObject({
      mimeType: '',
      type: 'Unknown video format',
    });
  });

  it.each([
    [512, '512 B'],
    [1536, '1.5 KB'],
    [20_480, '20 KB'],
    [5_242_880, '5.0 MB'],
    [26_214_400, '25 MB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatVideoSize(bytes)).toBe(expected);
  });
});
