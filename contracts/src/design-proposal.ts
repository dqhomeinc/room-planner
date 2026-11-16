import { z } from 'zod';
import {
  ConfidenceSchema,
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
    source: z
      .enum(['generated', 'user_moved', 'user_added', 'retained'])
      .describe(
        'How this placement entered its current state; retained and user-edited placements do not require a parent proposal.',
      ),
  })
  .strict();

const issueDetails = {
  message: z.string().trim().min(1).max(320),
  placementIds: z.array(PlacementIdSchema).max(16),
};

export const ProposalIssueSchema = z.union([
  z
    .object({
      code: z.enum([
        'outside_room',
        'furniture_collision',
        'blocked_opening',
        'insufficient_clearance',
        'requirement_unsatisfied',
      ]),
      severity: z.literal('error'),
      ...issueDetails,
    })
    .strict(),
  z
    .object({
      code: z.enum([
        'uncertain_geometry',
        'uncertain_dimensions',
        'uncertain_clearance',
      ]),
      severity: z.literal('warning'),
      ...issueDetails,
    })
    .strict(),
]);

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
    const rejectStatus = (message: string) =>
      context.addIssue({ code: 'custom', message, path: ['status'] });
    if (status === 'invalid' && !hasError) {
      rejectStatus('invalid proposals require an error issue');
    }
    if (status !== 'invalid' && hasError) {
      rejectStatus('error issues require invalid status');
    }
    if (status === 'warning' && !hasWarning) {
      rejectStatus('warning status requires a warning issue');
    }
    if (status === 'valid' && (hasError || hasWarning)) {
      rejectStatus('valid proposals cannot contain errors or warnings');
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

export const InputContentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const CatalogItemVersionSchema = z
  .object({
    furnitureItemId: FurnitureItemIdSchema,
    updatedAt: IsoDateTimeSchema,
    contentHash: InputContentHashSchema,
  })
  .strict();

export const ProposalInputSnapshotSchema = z
  .object({
    hashAlgorithm: z.literal('sha256-rfc8785'),
    planningRoom: z
      .object({
        id: PlanningRoomIdSchema,
        updatedAt: IsoDateTimeSchema,
        contentHash: InputContentHashSchema,
        geometryStatus: z.enum([
          'inferred',
          'partially_validated',
          'user_validated',
        ]),
        minimumGeometryConfidence: ConfidenceSchema,
      })
      .strict(),
    designBrief: z
      .object({
        id: DesignBriefIdSchema,
        updatedAt: IsoDateTimeSchema,
        contentHash: InputContentHashSchema,
      })
      .strict(),
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
    const reject = (message: string, path: (string | number)[]) =>
      context.addIssue({ code: 'custom', message, path });
    if (proposal.parentProposalId === proposal.id) {
      reject('a proposal cannot be its own parent', ['parentProposalId']);
    }
    const requiresParent = proposal.revision > 1;
    if (requiresParent !== Boolean(proposal.parentProposalId)) {
      reject('only revisions after the first require a parent proposal', [
        'parentProposalId',
      ]);
    }
    if (proposal.inputSnapshot.planningRoom.id !== proposal.planningRoomId) {
      reject('planning room snapshot must match the proposal room', [
        'inputSnapshot',
        'planningRoom',
        'id',
      ]);
    }
    if (proposal.inputSnapshot.designBrief.id !== proposal.designBriefId) {
      reject('design brief snapshot must match the proposal brief', [
        'inputSnapshot',
        'designBrief',
        'id',
      ]);
    }
    const geometryIsCertain =
      proposal.inputSnapshot.planningRoom.geometryStatus === 'user_validated' &&
      proposal.inputSnapshot.planningRoom.minimumGeometryConfidence === 1;
    const hasGeometryWarning = proposal.validation.issues.some(
      ({ code }) => code === 'uncertain_geometry',
    );
    if (!geometryIsCertain && !hasGeometryWarning) {
      reject('uncertain geometry requires an uncertainty warning', [
        'validation',
        'issues',
      ]);
    }

    const proposalTime = Date.parse(proposal.createdAt);
    const rejectFutureInput = (
      updatedAt: string,
      path: (string | number)[],
    ) => {
      if (Date.parse(updatedAt) > proposalTime) {
        reject('proposal inputs cannot postdate proposal creation', path);
      }
    };
    rejectFutureInput(proposal.inputSnapshot.planningRoom.updatedAt, [
      'inputSnapshot',
      'planningRoom',
      'updatedAt',
    ]);
    rejectFutureInput(proposal.inputSnapshot.designBrief.updatedAt, [
      'inputSnapshot',
      'designBrief',
      'updatedAt',
    ]);
    proposal.inputSnapshot.catalogItems.forEach((item, index) =>
      rejectFutureInput(item.updatedAt, [
        'inputSnapshot',
        'catalogItems',
        index,
        'updatedAt',
      ]),
    );
    const placementIds = proposal.placements.map(({ id }) => id);
    if (new Set(placementIds).size !== placementIds.length) {
      reject('placement identifiers must be unique', ['placements']);
    }
    proposal.validation.issues.forEach((issue, issueIndex) => {
      if (new Set(issue.placementIds).size !== issue.placementIds.length) {
        reject('issue placement identifiers must be unique', [
          'validation',
          'issues',
          issueIndex,
          'placementIds',
        ]);
      }
      issue.placementIds.forEach((placementId, placementIndex) => {
        if (!placementIds.includes(placementId)) {
          reject('validation issues must reference existing placements', [
            'validation',
            'issues',
            issueIndex,
            'placementIds',
            placementIndex,
          ]);
        }
      });
    });

    const catalogIds = proposal.inputSnapshot.catalogItems.map(
      ({ furnitureItemId }) => furnitureItemId,
    );
    if (new Set(catalogIds).size !== catalogIds.length) {
      reject('catalog snapshots must contain unique items', [
        'inputSnapshot',
        'catalogItems',
      ]);
    }
    proposal.placements.forEach((placement, index) => {
      if (!catalogIds.includes(placement.furnitureItemId)) {
        reject('every placement requires a catalog snapshot', [
          'placements',
          index,
          'furnitureItemId',
        ]);
      }
    });

    const scoreKinds = proposal.scores.map(({ kind }) => kind);
    if (new Set(scoreKinds).size !== scoreKinds.length) {
      reject('proposal score kinds must be unique', ['scores']);
    }
  });

export type DesignProposalId = z.infer<typeof DesignProposalIdSchema>;
export type PlacementId = z.infer<typeof PlacementIdSchema>;
export type FurniturePlacement = z.infer<typeof FurniturePlacementSchema>;
export type ProposalIssue = z.infer<typeof ProposalIssueSchema>;
export type ProposalValidation = z.infer<typeof ProposalValidationSchema>;
export type ProposalScore = z.infer<typeof ProposalScoreSchema>;
export type DesignProposal = z.infer<typeof DesignProposalSchema>;
