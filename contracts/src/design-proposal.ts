import { z } from 'zod';
import {
  ContractVersionSchema,
  IsoDateTimeSchema,
  ProjectIdSchema,
} from './common';
import { DesignBriefIdSchema } from './design-brief';
import { FurnitureItemIdSchema } from './furniture';
import { PlanningRoomIdSchema, Point2MetersSchema } from './planning-room';

export const DesignProposalIdSchema = z
  .string()
  .uuid()
  .brand<'DesignProposalId'>();

export const PlacementIdSchema = z.string().uuid().brand<'PlacementId'>();

export const PlacementTransformSchema = z
  .object({
    position: Point2MetersSchema,
    rotationDegrees: z.number().finite().min(0).lt(360),
  })
  .strict();

export const FurniturePlacementSchema = z
  .object({
    id: PlacementIdSchema,
    furnitureItemId: FurnitureItemIdSchema,
    transform: PlacementTransformSchema,
    locked: z.boolean(),
    source: z.enum(['generated', 'user_moved', 'user_added', 'retained']),
  })
  .strict();

export const ProposalIssueSchema = z
  .object({
    code: z.enum([
      'outside_room',
      'furniture_collision',
      'blocked_opening',
      'insufficient_clearance',
      'uncertain_geometry',
      'uncertain_dimensions',
      'requirement_unsatisfied',
    ]),
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string().trim().min(1).max(320),
    placementIds: z.array(PlacementIdSchema).max(16),
  })
  .strict();

export const ProposalValidationSchema = z
  .object({
    status: z.enum(['valid', 'warning', 'invalid']),
    validatorVersion: z.string().trim().min(1).max(80),
    issues: z.array(ProposalIssueSchema).max(128),
  })
  .strict()
  .superRefine(({ status, issues }, context) => {
    const hasError = issues.some(({ severity }) => severity === 'error');
    const hasWarning = issues.some(({ severity }) => severity === 'warning');
    if (status === 'invalid' && !hasError) {
      context.addIssue({
        code: 'custom',
        message: 'invalid proposals require an error issue',
        path: ['status'],
      });
    }
    if (status !== 'invalid' && hasError) {
      context.addIssue({
        code: 'custom',
        message: 'error issues require invalid status',
        path: ['status'],
      });
    }
    if (status === 'warning' && !hasWarning) {
      context.addIssue({
        code: 'custom',
        message: 'warning status requires a warning issue',
        path: ['status'],
      });
    }
    if (status === 'valid' && (hasError || hasWarning)) {
      context.addIssue({
        code: 'custom',
        message: 'valid proposals cannot contain errors or warnings',
        path: ['status'],
      });
    }
  });

export const ProposalScoreSchema = z
  .object({
    kind: z.enum([
      'circulation',
      'function',
      'balance',
      'style',
      'brief_fit',
      'diversity',
    ]),
    value: z.number().finite().min(0).max(1),
    explanation: z.string().trim().min(1).max(320),
  })
  .strict();

export const CatalogItemVersionSchema = z
  .object({
    furnitureItemId: FurnitureItemIdSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const ProposalInputSnapshotSchema = z
  .object({
    planningRoomUpdatedAt: IsoDateTimeSchema,
    designBriefUpdatedAt: IsoDateTimeSchema,
    catalogItems: z.array(CatalogItemVersionSchema).max(256),
  })
  .strict();

export const ProposalGeneratorSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    version: z.string().trim().min(1).max(80),
    seed: z.string().trim().min(1).max(120),
  })
  .strict();

export const DesignProposalSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: DesignProposalIdSchema,
    projectId: ProjectIdSchema,
    planningRoomId: PlanningRoomIdSchema,
    designBriefId: DesignBriefIdSchema,
    parentProposalId: DesignProposalIdSchema.optional(),
    revision: z.number().int().positive(),
    name: z.string().trim().min(1).max(120),
    inputSnapshot: ProposalInputSnapshotSchema,
    generator: ProposalGeneratorSchema,
    placements: z.array(FurniturePlacementSchema).max(256),
    validation: ProposalValidationSchema,
    scores: z.array(ProposalScoreSchema).max(16),
    assumptions: z.array(z.string().trim().min(1).max(320)).max(24),
    explanation: z.string().trim().min(1).max(2_000),
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((proposal, context) => {
    if (proposal.parentProposalId === proposal.id) {
      context.addIssue({
        code: 'custom',
        message: 'a proposal cannot be its own parent',
        path: ['parentProposalId'],
      });
    }

    const placementIds = proposal.placements.map(({ id }) => id);
    if (new Set(placementIds).size !== placementIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'placement identifiers must be unique',
        path: ['placements'],
      });
    }
    proposal.validation.issues.forEach((issue, issueIndex) => {
      issue.placementIds.forEach((placementId, placementIndex) => {
        if (!placementIds.includes(placementId)) {
          context.addIssue({
            code: 'custom',
            message: 'validation issues must reference existing placements',
            path: [
              'validation',
              'issues',
              issueIndex,
              'placementIds',
              placementIndex,
            ],
          });
        }
      });
    });

    const catalogIds = proposal.inputSnapshot.catalogItems.map(
      ({ furnitureItemId }) => furnitureItemId,
    );
    if (new Set(catalogIds).size !== catalogIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'catalog snapshots must contain unique items',
        path: ['inputSnapshot', 'catalogItems'],
      });
    }
    proposal.placements.forEach((placement, index) => {
      if (!catalogIds.includes(placement.furnitureItemId)) {
        context.addIssue({
          code: 'custom',
          message: 'every placement requires a catalog snapshot',
          path: ['placements', index, 'furnitureItemId'],
        });
      }
    });
  });

export type DesignProposalId = z.infer<typeof DesignProposalIdSchema>;
export type PlacementId = z.infer<typeof PlacementIdSchema>;
export type FurniturePlacement = z.infer<typeof FurniturePlacementSchema>;
export type ProposalIssue = z.infer<typeof ProposalIssueSchema>;
export type ProposalValidation = z.infer<typeof ProposalValidationSchema>;
export type ProposalScore = z.infer<typeof ProposalScoreSchema>;
export type DesignProposal = z.infer<typeof DesignProposalSchema>;
