import { describe, expect, it } from 'vitest';
import { RoomModelSchema } from './room-model';

const model = {
  contractVersion: 1,
  jobId: '9d6649d1-0e5d-4d33-94dc-757fe33b6732',
  attemptId: '805771d2-97f5-4ad6-b1a7-96dd35980275',
  createdAt: '2026-11-05T15:30:00Z',
  coordinateSpace: 'reconstruction',
  cameras: [
    {
      frameId: 'frame-0001',
      position: { x: 0, y: 1.5, z: 0 },
      orientation: [0, 0, 0, 1],
    },
  ],
  sparsePoints: [
    {
      id: 1,
      position: { x: 0.5, y: 0, z: 1.25 },
      observationCount: 4,
      confidence: 0.82,
    },
  ],
  inferredSurfaces: [
    {
      id: '9f91903e-f622-48ea-8c41-ad042321e95f',
      kind: 'floor',
      plane: { normal: { x: 0, y: 1, z: 0 }, offset: 0 },
      confidence: 0.91,
      sourcePointCount: 40,
      inferenceMethod: 'plane_fit',
      userValidated: false,
    },
  ],
} as const;

const calibration = {
  referenceStartInReconstructionSpace: { x: 0, y: 0, z: 0 },
  referenceEndInReconstructionSpace: { x: 2, y: 0, z: 0 },
  reconstructionLength: 2,
  realLengthMeters: 4,
  metersPerReconstructionUnit: 2,
  enteredAt: '2026-11-05T16:00:00Z',
  source: 'user_measurement',
} as const;

describe('room model contract', () => {
  it('accepts an unscaled reconstruction model', () => {
    expect(RoomModelSchema.parse(model)).toEqual(model);
  });

  it('requires calibration only for metric models', () => {
    expect(
      RoomModelSchema.parse({
        ...model,
        coordinateSpace: 'metric',
        calibration,
      }).coordinateSpace,
    ).toBe('metric');
    expect(() =>
      RoomModelSchema.parse({ ...model, coordinateSpace: 'metric' }),
    ).toThrow();
    expect(() => RoomModelSchema.parse({ ...model, calibration })).toThrow();
  });

  it('checks reference endpoint distance and scale math', () => {
    expect(() =>
      RoomModelSchema.parse({
        ...model,
        coordinateSpace: 'metric',
        calibration: { ...calibration, reconstructionLength: 3 },
      }),
    ).toThrow();
    expect(() =>
      RoomModelSchema.parse({
        ...model,
        coordinateSpace: 'metric',
        calibration: { ...calibration, metersPerReconstructionUnit: 1 },
      }),
    ).toThrow();
  });

  it('requires normalized orientations and plane normals', () => {
    expect(() =>
      RoomModelSchema.parse({
        ...model,
        cameras: [{ ...model.cameras[0], orientation: [0, 0, 0, 2] }],
      }),
    ).toThrow();
    expect(() =>
      RoomModelSchema.parse({
        ...model,
        inferredSurfaces: [
          {
            ...model.inferredSurfaces[0],
            plane: { normal: { x: 0, y: 2, z: 0 }, offset: 0 },
          },
        ],
      }),
    ).toThrow();
  });

  it('preserves inference provenance and validation separately', () => {
    const parsed = RoomModelSchema.parse({
      ...model,
      inferredSurfaces: [
        {
          ...model.inferredSurfaces[0],
          inferenceMethod: 'user_adjusted',
          userValidated: true,
        },
      ],
    });
    expect(parsed.inferredSurfaces[0]).toMatchObject({
      inferenceMethod: 'user_adjusted',
      userValidated: true,
    });
  });
});
