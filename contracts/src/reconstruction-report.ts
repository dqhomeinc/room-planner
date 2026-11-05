import { z } from 'zod';
import {
  AttemptIdSchema,
  ConfidenceSchema,
  ContractVersionSchema,
  IsoDateTimeSchema,
  JobIdSchema,
} from './common';

export const ReconstructionDispositionSchema = z.enum([
  'usable',
  'recapture_required',
  'retryable_failure',
  'terminal_failure',
]);

export const ReconstructionFindingSchema = z
  .object({
    code: z.enum([
      'insufficient_registered_frames',
      'high_reprojection_error',
      'camera_path_discontinuity',
      'insufficient_spatial_coverage',
      'engine_timeout',
      'invalid_engine_output',
      'worker_error',
    ]),
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export const ReconstructionMetricsSchema = z
  .object({
    totalFrameCount: z.number().int().positive(),
    selectedFrameCount: z.number().int().positive(),
    registeredFrameCount: z.number().int().nonnegative(),
    registeredFrameRatio: z.number().finite().min(0).max(1),
    sparsePointCount: z.number().int().nonnegative(),
    observationCount: z.number().int().nonnegative(),
    meanReprojectionErrorPixels: z.number().finite().nonnegative().optional(),
    cameraPathContinuity: ConfidenceSchema.optional(),
    spatialCoverage: ConfidenceSchema.optional(),
    processingSeconds: z.number().finite().nonnegative(),
  })
  .strict()
  .superRefine((metrics, context) => {
    if (metrics.selectedFrameCount > metrics.totalFrameCount) {
      context.addIssue({
        code: 'custom',
        message: 'selected frames cannot exceed total frames',
        path: ['selectedFrameCount'],
      });
    }

    if (metrics.registeredFrameCount > metrics.selectedFrameCount) {
      context.addIssue({
        code: 'custom',
        message: 'registered frames cannot exceed selected frames',
        path: ['registeredFrameCount'],
      });
    }

    const expectedRatio =
      metrics.registeredFrameCount / metrics.selectedFrameCount;
    if (Math.abs(expectedRatio - metrics.registeredFrameRatio) > 0.000_001) {
      context.addIssue({
        code: 'custom',
        message: 'registeredFrameRatio does not match the frame counts',
        path: ['registeredFrameRatio'],
      });
    }
  });

export const ReconstructionArtifactSchema = z
  .object({
    kind: z.enum([
      'capture_report',
      'frame_manifest',
      'sparse_model',
      'room_model',
      'viewer_asset',
      'bounded_log',
    ]),
    storagePath: z.string().trim().min(1).max(1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export const ReconstructionReportSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    jobId: JobIdSchema,
    attemptId: AttemptIdSchema,
    createdAt: IsoDateTimeSchema,
    pipelineVersion: z.string().trim().min(1).max(80),
    engine: z
      .object({
        name: z.string().trim().min(1).max(80),
        version: z.string().trim().min(1).max(80),
      })
      .strict(),
    disposition: ReconstructionDispositionSchema,
    metrics: ReconstructionMetricsSchema,
    findings: z.array(ReconstructionFindingSchema),
    artifacts: z.array(ReconstructionArtifactSchema),
  })
  .strict()
  .superRefine((report, context) => {
    const hasError = report.findings.some(
      ({ severity }) => severity === 'error',
    );
    if ((report.disposition === 'usable') === hasError) {
      context.addIssue({
        code: 'custom',
        message: 'usable reports cannot contain errors; failures require one',
        path: ['disposition'],
      });
    }

    const hasRoomModel = report.artifacts.some(
      ({ kind }) => kind === 'room_model',
    );
    if (report.disposition === 'usable' && !hasRoomModel) {
      context.addIssue({
        code: 'custom',
        message: 'usable reports require a room model artifact',
        path: ['artifacts'],
      });
    }
  });

export type ReconstructionDisposition = z.infer<
  typeof ReconstructionDispositionSchema
>;
export type ReconstructionFinding = z.infer<typeof ReconstructionFindingSchema>;
export type ReconstructionMetrics = z.infer<typeof ReconstructionMetricsSchema>;
export type ReconstructionArtifact = z.infer<
  typeof ReconstructionArtifactSchema
>;
export type ReconstructionReport = z.infer<typeof ReconstructionReportSchema>;
