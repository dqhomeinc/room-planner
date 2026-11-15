import { z } from 'zod';
import {
  ContractVersionSchema,
  IsoDateTimeSchema,
  ProjectIdSchema,
} from './common';
import {
  DesignTagSchema,
  FurnitureCategorySchema,
  FurnitureItemIdSchema,
  UniqueDesignTagsSchema,
} from './furniture';
import { PlanningRoomIdSchema } from './planning-room';

export const DesignBriefIdSchema = z.string().uuid().brand<'DesignBriefId'>();

const uniqueStrings = (values: string[]): boolean =>
  new Set(values).size === values.length;

export const RoomActivitySchema = z
  .object({
    activity: z.enum([
      'conversation',
      'media',
      'reading',
      'work',
      'dining',
      'sleep',
      'storage',
      'play',
      'exercise',
      'other',
    ]),
    priority: z.number().int().min(1).max(5),
    peopleCount: z.number().int().positive().max(24).optional(),
    notes: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

export const FurnitureRequirementSchema = z
  .object({
    category: FurnitureCategorySchema,
    importance: z.enum(['required', 'preferred', 'optional', 'excluded']),
    minimumQuantity: z.number().int().nonnegative().max(24),
    maximumQuantity: z.number().int().nonnegative().max(24),
    functionTags: UniqueDesignTagsSchema,
    notes: z.string().trim().min(1).max(240).optional(),
  })
  .strict()
  .superRefine((requirement, context) => {
    if (requirement.minimumQuantity > requirement.maximumQuantity) {
      context.addIssue({
        code: 'custom',
        message: 'minimum quantity cannot exceed maximum quantity',
        path: ['minimumQuantity'],
      });
    }
    if (
      requirement.importance === 'required' &&
      requirement.minimumQuantity === 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'required furniture must have a positive minimum quantity',
        path: ['minimumQuantity'],
      });
    }
    if (
      requirement.importance === 'excluded' &&
      (requirement.minimumQuantity !== 0 || requirement.maximumQuantity !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'excluded furniture must have zero quantity',
        path: ['maximumQuantity'],
      });
    }
  });

export const TagPreferenceSchema = z
  .object({
    preferred: UniqueDesignTagsSchema,
    avoided: UniqueDesignTagsSchema,
  })
  .strict()
  .refine(
    ({ preferred, avoided }) =>
      !preferred.some((value) => avoided.includes(value)),
    {
      message: 'a preference cannot be both preferred and avoided',
      path: ['avoided'],
    },
  );

export const DesignPreferencesSchema = z
  .object({
    styles: TagPreferenceSchema,
    colors: TagPreferenceSchema,
    materials: TagPreferenceSchema,
    moods: z.array(DesignTagSchema).max(12).refine(uniqueStrings, {
      message: 'moods must not contain duplicates',
    }),
  })
  .strict();

export const DesignBudgetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('flexible') }).strict(),
  z
    .object({
      kind: z.literal('range'),
      currency: z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/),
      minimumMinorUnits: z.number().int().nonnegative(),
      maximumMinorUnits: z.number().int().positive(),
    })
    .strict()
    .refine(
      ({ minimumMinorUnits, maximumMinorUnits }) =>
        minimumMinorUnits <= maximumMinorUnits,
      {
        message: 'budget minimum cannot exceed maximum',
        path: ['minimumMinorUnits'],
      },
    ),
]);

export const BriefAssumptionSchema = z
  .object({
    id: z.string().uuid(),
    text: z.string().trim().min(1).max(320),
    source: z.enum(['explicit', 'inferred', 'default']),
    confirmedByUser: z.boolean(),
  })
  .strict();

export const BriefInterpretationSchema = z
  .object({
    source: z.enum(['structured_controls', 'natural_language', 'mixed']),
    interpreterVersion: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine(
    ({ source, interpreterVersion }) =>
      source === 'structured_controls' || Boolean(interpreterVersion),
    {
      message: 'language interpretation requires an interpreter version',
      path: ['interpreterVersion'],
    },
  );

export const DesignBriefSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: DesignBriefIdSchema,
    projectId: ProjectIdSchema,
    planningRoomId: PlanningRoomIdSchema,
    name: z.string().trim().min(1).max(120),
    activities: z.array(RoomActivitySchema).min(1).max(12),
    furnitureRequirements: z.array(FurnitureRequirementSchema).max(24),
    retainedFurnitureItemIds: z
      .array(FurnitureItemIdSchema)
      .max(64)
      .refine(uniqueStrings, { message: 'retained furniture must be unique' }),
    preferences: DesignPreferencesSchema,
    budget: DesignBudgetSchema,
    freeformRequest: z.string().trim().min(1).max(2_000).optional(),
    interpretation: BriefInterpretationSchema,
    assumptions: z.array(BriefAssumptionSchema).max(24),
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

export type DesignBriefId = z.infer<typeof DesignBriefIdSchema>;
export type RoomActivity = z.infer<typeof RoomActivitySchema>;
export type FurnitureRequirement = z.infer<typeof FurnitureRequirementSchema>;
export type DesignPreferences = z.infer<typeof DesignPreferencesSchema>;
export type DesignBudget = z.infer<typeof DesignBudgetSchema>;
export type BriefAssumption = z.infer<typeof BriefAssumptionSchema>;
export type DesignBrief = z.infer<typeof DesignBriefSchema>;
