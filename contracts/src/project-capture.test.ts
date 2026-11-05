import { describe, expect, it } from 'vitest';
import { CaptureReportSchema } from './capture';
import { ProjectSchema } from './project';

const project = {
  contractVersion: 1,
  id: '7a7967ac-400d-4b87-a96c-58e9299a5e47',
  ownerId: 'a2de1182-113f-4c3d-b65f-d498e813a962',
  name: 'Living room',
  status: 'active',
  preferredUnitSystem: 'imperial',
  createdAt: '2026-11-05T15:00:00Z',
  updatedAt: '2026-11-05T15:05:00Z',
} as const;

const capture = {
  contractVersion: 1,
  projectId: project.id,
  assessedAt: '2026-11-05T15:10:00Z',
  assessment: 'accepted',
  metadata: {
    source: 'recorded',
    fileName: 'living-room.mov',
    mimeType: 'video/quicktime',
    fileSizeBytes: 24_000_000,
    durationSeconds: 42.5,
    widthPixels: 1920,
    heightPixels: 1080,
    frameRate: 30,
    rotationDegrees: 0,
    capturedAt: '2026-11-05T15:08:00Z',
  },
  checks: [],
} as const;

describe('project contract', () => {
  it('accepts a valid project', () => {
    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it('rejects blank names and reversed timestamps', () => {
    expect(() => ProjectSchema.parse({ ...project, name: '   ' })).toThrow();
    expect(() =>
      ProjectSchema.parse({
        ...project,
        updatedAt: '2026-11-05T14:59:00Z',
      }),
    ).toThrow();
  });

  it('rejects unrecognized persisted fields', () => {
    expect(() => ProjectSchema.parse({ ...project, isPublic: true })).toThrow();
  });
});

describe('capture report contract', () => {
  it('accepts a clean capture report', () => {
    expect(CaptureReportSchema.parse(capture)).toEqual(capture);
  });

  it('requires errors for rejected reports', () => {
    expect(() =>
      CaptureReportSchema.parse({ ...capture, assessment: 'rejected' }),
    ).toThrow();

    expect(
      CaptureReportSchema.parse({
        ...capture,
        assessment: 'rejected',
        checks: [
          {
            code: 'too_dark',
            severity: 'error',
            message: 'The room is too dark to reconstruct reliably.',
          },
        ],
      }).assessment,
    ).toBe('rejected');
  });

  it('prevents accepted reports from hiding warnings', () => {
    expect(() =>
      CaptureReportSchema.parse({
        ...capture,
        checks: [
          {
            code: 'too_blurry',
            severity: 'warning',
            message: 'Some parts of the capture appear blurry.',
          },
        ],
      }),
    ).toThrow();
  });

  it('requires positive, finite media dimensions and duration', () => {
    expect(() =>
      CaptureReportSchema.parse({
        ...capture,
        metadata: { ...capture.metadata, durationSeconds: Number.NaN },
      }),
    ).toThrow();
  });
});
