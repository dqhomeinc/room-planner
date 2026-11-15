import { z } from 'zod';
import {
  ConfidenceSchema,
  ContractVersionSchema,
  IsoDateTimeSchema,
  MetersSchema,
} from './common';

const positiveMeters = MetersSchema.refine((value) => value > 0);
export const DesignTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'tags must use lower-case slugs');

function hasUniqueValues(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export const UniqueDesignTagsSchema = z
  .array(DesignTagSchema)
  .max(16)
  .refine(hasUniqueValues, {
    message: 'tags must not contain duplicates',
  });

export const FurnitureItemIdSchema = z
  .string()
  .uuid()
  .brand<'FurnitureItemId'>();

export const FurnitureCategorySchema = z.enum([
  'seating',
  'table',
  'storage',
  'bed',
  'desk',
  'lighting',
  'rug',
  'decor',
  'other',
]);

export const DimensionProvenanceSchema = z
  .object({
    source: z.enum([
      'manufacturer',
      'retailer',
      'curated_measurement',
      'user_measurement',
      'estimated',
    ]),
    confidence: ConfidenceSchema,
    sourceReference: z.string().trim().min(1).max(160).optional(),
    checkedAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .refine(
    ({ source, confidence }) => source !== 'estimated' || confidence < 1,
    {
      message: 'estimated dimensions cannot have perfect confidence',
      path: ['confidence'],
    },
  );

export const FurnitureDimensionsSchema = z
  .object({
    widthMeters: positiveMeters,
    depthMeters: positiveMeters,
    heightMeters: positiveMeters,
    provenance: DimensionProvenanceSchema,
  })
  .strict();

export const FurnitureOrientationSchema = z
  .object({
    frontEdge: z.enum([
      'positive_depth',
      'negative_depth',
      'positive_width',
      'negative_width',
    ]),
    support: z.enum(['floor', 'wall', 'ceiling']),
  })
  .strict();

export const ClearanceRequirementSchema = z
  .object({
    frontMeters: MetersSchema,
    backMeters: MetersSchema,
    leftMeters: MetersSchema,
    rightMeters: MetersSchema,
    basis: z.enum([
      'manufacturer',
      'access_requirement',
      'design_rule',
      'estimated',
    ]),
    confidence: ConfidenceSchema,
  })
  .strict()
  .refine(({ basis, confidence }) => basis !== 'estimated' || confidence < 1, {
    message: 'estimated clearance cannot have perfect confidence',
    path: ['confidence'],
  });

export const FurnitureDesignMetadataSchema = z
  .object({
    styles: UniqueDesignTagsSchema,
    colors: UniqueDesignTagsSchema,
    materials: UniqueDesignTagsSchema,
    functionTags: UniqueDesignTagsSchema.min(1),
    visualWeight: z.enum(['light', 'medium', 'heavy']),
  })
  .strict();

export const FurnitureItemSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: FurnitureItemIdSchema,
    name: z.string().trim().min(1).max(120),
    category: FurnitureCategorySchema,
    dimensions: FurnitureDimensionsSchema,
    orientation: FurnitureOrientationSchema,
    clearance: ClearanceRequirementSchema,
    design: FurnitureDesignMetadataSchema,
    status: z.enum(['prototype', 'curated', 'retired']),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .refine(
    ({ createdAt, updatedAt }) =>
      Date.parse(updatedAt) >= Date.parse(createdAt),
    {
      message: 'updatedAt cannot precede createdAt',
      path: ['updatedAt'],
    },
  );

export type FurnitureItemId = z.infer<typeof FurnitureItemIdSchema>;
export type FurnitureCategory = z.infer<typeof FurnitureCategorySchema>;
export type DimensionProvenance = z.infer<typeof DimensionProvenanceSchema>;
export type FurnitureDimensions = z.infer<typeof FurnitureDimensionsSchema>;
export type FurnitureOrientation = z.infer<typeof FurnitureOrientationSchema>;
export type ClearanceRequirement = z.infer<typeof ClearanceRequirementSchema>;
export type FurnitureDesignMetadata = z.infer<
  typeof FurnitureDesignMetadataSchema
>;
export type FurnitureItem = z.infer<typeof FurnitureItemSchema>;
