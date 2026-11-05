import { z } from 'zod';
import {
  ContractVersionSchema,
  IsoDateTimeSchema,
  ProjectIdSchema,
} from './common';

export const CaptureSourceSchema = z.enum(['recorded', 'selected']);
export const CaptureAssessmentSchema = z.enum([
  'accepted',
  'warning',
  'rejected',
]);

export const CaptureCheckCodeSchema = z.enum([
  'unsupported_format',
  'duration_too_short',
  'duration_too_long',
  'resolution_too_low',
  'file_too_large',
  'too_dark',
  'too_blurry',
  'insufficient_motion',
  'metadata_unavailable',
]);

export const CaptureCheckSchema = z
  .object({
    code: CaptureCheckCodeSchema,
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string().trim().min(1).max(240),
  })
  .strict();

export const CaptureMetadataSchema = z
  .object({
    source: CaptureSourceSchema,
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(120),
    fileSizeBytes: z.number().int().positive(),
    durationSeconds: z.number().finite().positive(),
    widthPixels: z.number().int().positive(),
    heightPixels: z.number().int().positive(),
    frameRate: z.number().finite().positive().optional(),
    rotationDegrees: z.union([
      z.literal(0),
      z.literal(90),
      z.literal(180),
      z.literal(270),
    ]),
    capturedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CaptureReportSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    projectId: ProjectIdSchema,
    assessedAt: IsoDateTimeSchema,
    assessment: CaptureAssessmentSchema,
    metadata: CaptureMetadataSchema,
    checks: z.array(CaptureCheckSchema),
  })
  .strict()
  .superRefine(({ assessment, checks }, context) => {
    const hasError = checks.some(({ severity }) => severity === 'error');
    const hasWarning = checks.some(({ severity }) => severity === 'warning');

    if ((assessment === 'rejected') !== hasError) {
      context.addIssue({
        code: 'custom',
        message: 'rejected reports must contain an error, and only they may',
        path: ['assessment'],
      });
    }

    if (assessment === 'warning' && (!hasWarning || hasError)) {
      context.addIssue({
        code: 'custom',
        message: 'warning reports require a warning and cannot contain errors',
        path: ['assessment'],
      });
    }

    if (assessment === 'accepted' && (hasWarning || hasError)) {
      context.addIssue({
        code: 'custom',
        message: 'accepted reports cannot contain warnings or errors',
        path: ['assessment'],
      });
    }
  });

export type CaptureSource = z.infer<typeof CaptureSourceSchema>;
export type CaptureAssessment = z.infer<typeof CaptureAssessmentSchema>;
export type CaptureCheck = z.infer<typeof CaptureCheckSchema>;
export type CaptureMetadata = z.infer<typeof CaptureMetadataSchema>;
export type CaptureReport = z.infer<typeof CaptureReportSchema>;
