import { describe, expect, it } from 'vitest';
import {
  canTransitionReconstructionJob,
  ReconstructionJobSchema,
  type ReconstructionJobState,
} from './job';

const job = {
  contractVersion: 1,
  id: '9d6649d1-0e5d-4d33-94dc-757fe33b6732',
  projectId: '7a7967ac-400d-4b87-a96c-58e9299a5e47',
  state: 'queued',
  attemptCount: 0,
  maxAttempts: 3,
  createdAt: '2026-11-05T15:00:00Z',
  updatedAt: '2026-11-05T15:01:00Z',
} as const;

const lease = {
  attemptId: '805771d2-97f5-4ad6-b1a7-96dd35980275',
  workerId: 'developer-mac-1',
  acquiredAt: '2026-11-05T15:02:00Z',
  expiresAt: '2026-11-05T15:07:00Z',
} as const;

describe('reconstruction job contract', () => {
  it('accepts a queued job without a lease', () => {
    expect(ReconstructionJobSchema.parse(job)).toEqual(job);
  });

  it('requires leases only while processing', () => {
    expect(
      ReconstructionJobSchema.parse({
        ...job,
        state: 'validating',
        attemptCount: 1,
        lease,
      }).state,
    ).toBe('validating');

    expect(() =>
      ReconstructionJobSchema.parse({ ...job, state: 'validating' }),
    ).toThrow();
    expect(() => ReconstructionJobSchema.parse({ ...job, lease })).toThrow();
  });

  it('requires structured details for failure states', () => {
    expect(() =>
      ReconstructionJobSchema.parse({
        ...job,
        state: 'recapture_required',
      }),
    ).toThrow();

    expect(
      ReconstructionJobSchema.parse({
        ...job,
        state: 'recapture_required',
        failure: {
          category: 'capture_quality',
          retryable: false,
          message: 'Not enough camera translation was observed.',
        },
      }).failure?.category,
    ).toBe('capture_quality');
  });

  it('bounds attempts and validates lease timestamps', () => {
    expect(() =>
      ReconstructionJobSchema.parse({
        ...job,
        attemptCount: 4,
        maxAttempts: 3,
      }),
    ).toThrow();
    expect(() =>
      ReconstructionJobSchema.parse({
        ...job,
        state: 'validating',
        lease: { ...lease, expiresAt: lease.acquiredAt },
      }),
    ).toThrow();
  });
});

describe('reconstruction job transitions', () => {
  it.each([
    ['created', 'uploading'],
    ['uploading', 'queued'],
    ['queued', 'validating'],
    ['validating', 'extracting_frames'],
    ['extracting_frames', 'reconstructing'],
    ['reconstructing', 'evaluating'],
    ['evaluating', 'completed'],
    ['retryable_failure', 'queued'],
    ['deletion_pending', 'deleted'],
  ] satisfies [ReconstructionJobState, ReconstructionJobState][])(
    'allows %s to transition to %s',
    (from, to) => {
      expect(canTransitionReconstructionJob(from, to)).toBe(true);
    },
  );

  it.each([
    ['created', 'completed'],
    ['queued', 'reconstructing'],
    ['completed', 'queued'],
    ['recapture_required', 'queued'],
    ['deleted', 'created'],
  ] satisfies [ReconstructionJobState, ReconstructionJobState][])(
    'rejects %s to %s',
    (from, to) => {
      expect(canTransitionReconstructionJob(from, to)).toBe(false);
    },
  );
});
