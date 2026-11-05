import { describe, expect, it } from 'vitest';
import { ReconstructionReportSchema } from './reconstruction-report';

const report = {
  contractVersion: 1,
  jobId: '9d6649d1-0e5d-4d33-94dc-757fe33b6732',
  attemptId: '805771d2-97f5-4ad6-b1a7-96dd35980275',
  createdAt: '2026-11-05T15:30:00Z',
  pipelineVersion: '2026.11.1',
  engine: { name: 'colmap', version: '3.13.0' },
  disposition: 'usable',
  metrics: {
    totalFrameCount: 1200,
    selectedFrameCount: 100,
    registeredFrameCount: 80,
    registeredFrameRatio: 0.8,
    sparsePointCount: 48_200,
    observationCount: 192_800,
    meanReprojectionErrorPixels: 0.72,
    cameraPathContinuity: 0.91,
    spatialCoverage: 0.82,
    processingSeconds: 412.5,
  },
  findings: [],
  artifacts: [
    {
      kind: 'room_model',
      storagePath: 'projects/project-id/jobs/job-id/room-model.json',
      sha256: 'a'.repeat(64),
      sizeBytes: 142_000,
    },
  ],
} as const;

describe('reconstruction report contract', () => {
  it('accepts a usable report with a room model', () => {
    expect(ReconstructionReportSchema.parse(report)).toEqual(report);
  });

  it('checks frame counts and their derived ratio', () => {
    expect(() =>
      ReconstructionReportSchema.parse({
        ...report,
        metrics: { ...report.metrics, registeredFrameCount: 101 },
      }),
    ).toThrow();
    expect(() =>
      ReconstructionReportSchema.parse({
        ...report,
        metrics: { ...report.metrics, registeredFrameRatio: 0.79 },
      }),
    ).toThrow();
  });

  it('requires a room-model artifact for usable output', () => {
    expect(() =>
      ReconstructionReportSchema.parse({ ...report, artifacts: [] }),
    ).toThrow();
  });

  it('requires an error finding for non-usable output', () => {
    expect(() =>
      ReconstructionReportSchema.parse({
        ...report,
        disposition: 'recapture_required',
        artifacts: [],
      }),
    ).toThrow();

    expect(
      ReconstructionReportSchema.parse({
        ...report,
        disposition: 'recapture_required',
        findings: [
          {
            code: 'insufficient_registered_frames',
            severity: 'error',
            message: 'Move around the room and capture each wall twice.',
          },
        ],
        artifacts: [],
      }).disposition,
    ).toBe('recapture_required');
  });

  it('rejects invalid hashes and unbounded confidence', () => {
    expect(() =>
      ReconstructionReportSchema.parse({
        ...report,
        artifacts: [{ ...report.artifacts[0], sha256: 'not-a-hash' }],
      }),
    ).toThrow();
    expect(() =>
      ReconstructionReportSchema.parse({
        ...report,
        metrics: { ...report.metrics, spatialCoverage: 1.1 },
      }),
    ).toThrow();
  });
});
