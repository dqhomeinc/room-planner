import { z } from 'zod';
import {
  ConfidenceSchema,
  ContractVersionSchema,
  CoordinateMetersSchema,
  IsoDateTimeSchema,
  MetersSchema,
  ProjectIdSchema,
} from './common';

export const PlanningRoomIdSchema = z.string().uuid().brand<'PlanningRoomId'>();

export const RoomFeatureIdSchema = z.string().uuid().brand<'RoomFeatureId'>();

export const GeometryProvenanceSchema = z
  .object({
    source: z.enum([
      'user_measurement',
      'template',
      'structured_import',
      'image_trace',
      'model_import',
      'reconstruction',
      'user_adjusted',
    ]),
    confidence: ConfidenceSchema,
    userValidated: z.boolean(),
    sourceReference: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const Point2MetersSchema = z
  .object({
    x: CoordinateMetersSchema,
    y: CoordinateMetersSchema,
  })
  .strict();

type Point2 = z.infer<typeof Point2MetersSchema>;

function polygonArea(vertices: Point2[]): number {
  return Math.abs(
    vertices.reduce((area, vertex, index) => {
      const next = vertices[(index + 1) % vertices.length];
      return area + vertex.x * next.y - next.x * vertex.y;
    }, 0) / 2,
  );
}

export const MetricPolygonSchema = z
  .array(Point2MetersSchema)
  .min(3)
  .max(64)
  .refine((vertices) => polygonArea(vertices) >= 0.01, {
    message: 'polygon must enclose at least 0.01 square meters',
  });

export const MeasuredLengthSchema = z
  .object({
    meters: MetersSchema.refine((value) => value > 0),
    provenance: GeometryProvenanceSchema,
  })
  .strict();

export const MeasuredOffsetSchema = z
  .object({
    meters: MetersSchema,
    provenance: GeometryProvenanceSchema,
  })
  .strict();

export const RoomOpeningSchema = z
  .object({
    id: RoomFeatureIdSchema,
    kind: z.enum(['door', 'window', 'open_passage']),
    wallIndex: z.number().int().nonnegative(),
    startOffset: MeasuredOffsetSchema,
    width: MeasuredLengthSchema,
    height: MeasuredLengthSchema,
    sillHeight: MeasuredOffsetSchema,
  })
  .strict()
  .refine(
    ({ kind, sillHeight }) => kind === 'window' || sillHeight.meters === 0,
    {
      message: 'doors and open passages must start at floor level',
      path: ['sillHeight', 'meters'],
    },
  );

export const FixedRoomFeatureSchema = z
  .object({
    id: RoomFeatureIdSchema,
    name: z.string().trim().min(1).max(80),
    kind: z.enum(['column', 'fireplace', 'built_in', 'radiator', 'unknown']),
    footprint: MetricPolygonSchema,
    footprintProvenance: GeometryProvenanceSchema,
    height: MeasuredLengthSchema,
  })
  .strict();

function wallLength(boundary: Point2[], wallIndex: number): number {
  const start = boundary[wallIndex];
  const end = boundary[(wallIndex + 1) % boundary.length];
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export const PlanningRoomSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: PlanningRoomIdSchema,
    projectId: ProjectIdSchema,
    name: z.string().trim().min(1).max(120),
    coordinateSpace: z.literal('metric'),
    floorBoundary: MetricPolygonSchema,
    floorBoundaryProvenance: GeometryProvenanceSchema,
    wallHeight: MeasuredLengthSchema,
    openings: z.array(RoomOpeningSchema).max(64),
    fixedFeatures: z.array(FixedRoomFeatureSchema).max(64),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((room, context) => {
    if (Date.parse(room.updatedAt) < Date.parse(room.createdAt)) {
      context.addIssue({
        code: 'custom',
        message: 'updatedAt cannot precede createdAt',
        path: ['updatedAt'],
      });
    }

    room.openings.forEach((opening, index) => {
      if (opening.wallIndex >= room.floorBoundary.length) {
        context.addIssue({
          code: 'custom',
          message: 'opening must reference an existing wall',
          path: ['openings', index, 'wallIndex'],
        });
        return;
      }

      const occupiedWidth = opening.startOffset.meters + opening.width.meters;
      if (occupiedWidth > wallLength(room.floorBoundary, opening.wallIndex)) {
        context.addIssue({
          code: 'custom',
          message: 'opening must fit within its wall',
          path: ['openings', index, 'width'],
        });
      }

      const occupiedHeight = opening.sillHeight.meters + opening.height.meters;
      if (occupiedHeight > room.wallHeight.meters) {
        context.addIssue({
          code: 'custom',
          message: 'opening must fit below the wall height',
          path: ['openings', index, 'height'],
        });
      }
    });
  });

export type PlanningRoomId = z.infer<typeof PlanningRoomIdSchema>;
export type GeometryProvenance = z.infer<typeof GeometryProvenanceSchema>;
export type Point2Meters = z.infer<typeof Point2MetersSchema>;
export type MeasuredLength = z.infer<typeof MeasuredLengthSchema>;
export type RoomOpening = z.infer<typeof RoomOpeningSchema>;
export type FixedRoomFeature = z.infer<typeof FixedRoomFeatureSchema>;
export type PlanningRoom = z.infer<typeof PlanningRoomSchema>;
