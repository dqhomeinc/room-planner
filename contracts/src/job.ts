import { z } from 'zod';
import {
  AttemptIdSchema,
  ContractVersionSchema,
  IsoDateTimeSchema,
  JobIdSchema,
  ProjectIdSchema,
} from './common';

export const ReconstructionJobStateSchema = z.enum([
  'created',
  'uploading',
  'queued',
  'validating',
  'extracting_frames',
  'reconstructing',
  'evaluating',
  'completed',
  'recapture_required',
  'retryable_failure',
  'failed',
  'cancelled',
  'deletion_pending',
  'deleted',
]);

export type ReconstructionJobState = z.infer<
  typeof ReconstructionJobStateSchema
>;

export const JobFailureSchema = z
  .object({
    category: z.enum([
      'capture_quality',
      'worker_unavailable',
      'infrastructure_timeout',
      'engine_failure',
      'invalid_output',
      'unknown',
    ]),
    retryable: z.boolean(),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export const JobLeaseSchema = z
  .object({
    attemptId: AttemptIdSchema,
    workerId: z.string().trim().min(1).max(120),
    acquiredAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict()
  .refine(
    ({ acquiredAt, expiresAt }) =>
      Date.parse(expiresAt) > Date.parse(acquiredAt),
    { message: 'lease must expire after acquisition', path: ['expiresAt'] },
  );

const leasedStates: ReadonlySet<ReconstructionJobState> = new Set([
  'validating',
  'extracting_frames',
  'reconstructing',
  'evaluating',
]);

const failureStates: ReadonlySet<ReconstructionJobState> = new Set([
  'recapture_required',
  'retryable_failure',
  'failed',
]);

export const ReconstructionJobSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: JobIdSchema,
    projectId: ProjectIdSchema,
    state: ReconstructionJobStateSchema,
    attemptCount: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    lease: JobLeaseSchema.optional(),
    failure: JobFailureSchema.optional(),
  })
  .strict()
  .superRefine((job, context) => {
    if (job.attemptCount > job.maxAttempts) {
      context.addIssue({
        code: 'custom',
        message: 'attemptCount cannot exceed maxAttempts',
        path: ['attemptCount'],
      });
    }

    if (Date.parse(job.updatedAt) < Date.parse(job.createdAt)) {
      context.addIssue({
        code: 'custom',
        message: 'updatedAt cannot precede createdAt',
        path: ['updatedAt'],
      });
    }

    if (leasedStates.has(job.state) !== Boolean(job.lease)) {
      context.addIssue({
        code: 'custom',
        message: 'only active processing states require a lease',
        path: ['lease'],
      });
    }

    if (failureStates.has(job.state) !== Boolean(job.failure)) {
      context.addIssue({
        code: 'custom',
        message: 'failure details must match a failure state',
        path: ['failure'],
      });
    }
  });

const transitions: Readonly<
  Record<ReconstructionJobState, readonly ReconstructionJobState[]>
> = {
  created: ['uploading', 'deletion_pending'],
  uploading: ['queued', 'cancelled', 'deletion_pending'],
  queued: ['validating', 'cancelled', 'deletion_pending'],
  validating: [
    'extracting_frames',
    'recapture_required',
    'retryable_failure',
    'deletion_pending',
  ],
  extracting_frames: [
    'reconstructing',
    'retryable_failure',
    'deletion_pending',
  ],
  reconstructing: ['evaluating', 'retryable_failure', 'deletion_pending'],
  evaluating: [
    'completed',
    'recapture_required',
    'retryable_failure',
    'deletion_pending',
  ],
  completed: ['deletion_pending'],
  recapture_required: ['deletion_pending'],
  retryable_failure: ['queued', 'failed', 'deletion_pending'],
  failed: ['deletion_pending'],
  cancelled: ['deletion_pending'],
  deletion_pending: ['deleted'],
  deleted: [],
};

export function canTransitionReconstructionJob(
  from: ReconstructionJobState,
  to: ReconstructionJobState,
): boolean {
  return transitions[from].includes(to);
}

export type JobFailure = z.infer<typeof JobFailureSchema>;
export type JobLease = z.infer<typeof JobLeaseSchema>;
export type ReconstructionJob = z.infer<typeof ReconstructionJobSchema>;
