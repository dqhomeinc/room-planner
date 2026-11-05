import { z } from 'zod';
import {
  AttemptIdSchema,
  ConfidenceSchema,
  ContractVersionSchema,
  IsoDateTimeSchema,
  JobIdSchema,
  MetersSchema,
} from './common';

const finiteNumber = z.number().finite();

export const Vector3Schema = z
  .object({ x: finiteNumber, y: finiteNumber, z: finiteNumber })
  .strict();

export const UnitVector3Schema = Vector3Schema.refine(
  ({ x, y, z }) => Math.abs(Math.hypot(x, y, z) - 1) < 0.000_1,
  { message: 'vector must have unit length' },
);

export const QuaternionSchema = z
  .tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber])
  .refine(([x, y, z, w]) => Math.abs(Math.hypot(x, y, z, w) - 1) < 0.000_1, {
    message: 'quaternion must have unit length',
  });

export const CameraPoseSchema = z
  .object({
    frameId: z.string().trim().min(1).max(120),
    position: Vector3Schema,
    orientation: QuaternionSchema,
  })
  .strict();

export const SparsePointSchema = z
  .object({
    id: z.number().int().nonnegative(),
    position: Vector3Schema,
    observationCount: z.number().int().positive(),
    confidence: ConfidenceSchema,
  })
  .strict();

export const InferredSurfaceSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(['floor', 'wall', 'ceiling', 'unknown']),
    plane: z
      .object({ normal: UnitVector3Schema, offset: finiteNumber })
      .strict(),
    confidence: ConfidenceSchema,
    sourcePointCount: z.number().int().positive(),
    inferenceMethod: z.enum(['engine', 'plane_fit', 'user_adjusted']),
    userValidated: z.boolean(),
  })
  .strict();

export const CalibrationSchema = z
  .object({
    referenceStartInReconstructionSpace: Vector3Schema,
    referenceEndInReconstructionSpace: Vector3Schema,
    reconstructionLength: z.number().finite().positive(),
    realLengthMeters: MetersSchema.refine((value) => value > 0),
    metersPerReconstructionUnit: z.number().finite().positive(),
    enteredAt: IsoDateTimeSchema,
    source: z.literal('user_measurement'),
  })
  .strict()
  .superRefine((calibration, context) => {
    const start = calibration.referenceStartInReconstructionSpace;
    const end = calibration.referenceEndInReconstructionSpace;
    const expectedLength = Math.hypot(
      end.x - start.x,
      end.y - start.y,
      end.z - start.z,
    );
    if (
      Math.abs(expectedLength - calibration.reconstructionLength) > 0.000_001
    ) {
      context.addIssue({
        code: 'custom',
        message: 'reconstructionLength does not match the reference endpoints',
        path: ['reconstructionLength'],
      });
    }

    const expectedScale =
      calibration.realLengthMeters / calibration.reconstructionLength;
    if (
      Math.abs(expectedScale - calibration.metersPerReconstructionUnit) >
      0.000_001
    ) {
      context.addIssue({
        code: 'custom',
        message: 'scale does not match the reference lengths',
        path: ['metersPerReconstructionUnit'],
      });
    }
  });

export const RoomModelSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    jobId: JobIdSchema,
    attemptId: AttemptIdSchema,
    createdAt: IsoDateTimeSchema,
    coordinateSpace: z.enum(['reconstruction', 'metric']),
    cameras: z.array(CameraPoseSchema),
    sparsePoints: z.array(SparsePointSchema),
    inferredSurfaces: z.array(InferredSurfaceSchema),
    calibration: CalibrationSchema.optional(),
  })
  .strict()
  .refine(
    ({ coordinateSpace, calibration }) =>
      (coordinateSpace === 'metric') === Boolean(calibration),
    {
      message: 'metric models require calibration; unscaled models forbid it',
      path: ['calibration'],
    },
  );

export type Vector3 = z.infer<typeof Vector3Schema>;
export type CameraPose = z.infer<typeof CameraPoseSchema>;
export type SparsePoint = z.infer<typeof SparsePointSchema>;
export type InferredSurface = z.infer<typeof InferredSurfaceSchema>;
export type Calibration = z.infer<typeof CalibrationSchema>;
export type RoomModel = z.infer<typeof RoomModelSchema>;
