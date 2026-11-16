import { describe, expect, it } from 'vitest';
import { DesignProposalSchema } from './design-proposal';

const furnitureItemId = '83dc7f87-84dc-4220-9f9b-2e5094a380cd';
const contentHash = `sha256:${'a'.repeat(64)}`;
const placement = {
  id: 'a270f1c0-41df-48bb-a040-59bb5a6b775c',
  furnitureItemId,
  transform: { position: { x: 2.5, y: 1.2 }, rotationDegrees: 90 },
  locked: false,
  source: 'generated',
} as const;

const proposal = {
  contractVersion: 1,
  id: '4db36420-a5a1-49bb-9eaa-e31720ca62f7',
  projectId: 'cfecbacb-7d4a-4c4e-be86-bd15e4d69629',
  planningRoomId: 'fcce2a13-8e03-4481-bad1-6d8c9db8ebc5',
  designBriefId: '0d9ebd23-7d16-4bef-935e-7f6fa76070b8',
  revision: 1,
  name: 'Conversation-focused layout',
  inputSnapshot: {
    hashAlgorithm: 'sha256-rfc8785',
    planningRoom: {
      id: 'fcce2a13-8e03-4481-bad1-6d8c9db8ebc5',
      updatedAt: '2026-11-15T12:00:00-05:00',
      contentHash,
      geometryStatus: 'user_validated',
      minimumGeometryConfidence: 0.95,
    },
    designBrief: {
      id: '0d9ebd23-7d16-4bef-935e-7f6fa76070b8',
      updatedAt: '2026-11-15T12:05:00-05:00',
      contentHash,
    },
    catalogItems: [
      {
        furnitureItemId,
        updatedAt: '2026-11-15T11:00:00-05:00',
        contentHash,
      },
    ],
  },
  generator: { name: 'rules', version: '0.1.0', seed: 'living-room-a' },
  placements: [placement],
  validation: { status: 'valid', validatorVersion: '0.1.0', issues: [] },
  scores: [
    { kind: 'circulation', value: 0.9, explanation: 'Main path is clear.' },
  ],
  assumptions: ['The marked window is usable as natural light.'],
  explanation: 'Seats face each other while preserving the main path.',
  createdAt: '2026-11-15T12:10:00-05:00',
} as const;

describe('design proposal contract', () => {
  it('accepts a reproducible, validated furniture layout', () => {
    expect(DesignProposalSchema.parse(proposal).generator.seed).toBe(
      'living-room-a',
    );
  });

  it('normalizes rotations to a single turn', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        placements: [
          {
            ...placement,
            transform: { ...placement.transform, rotationDegrees: 360 },
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects duplicate placement identifiers', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        placements: [placement, placement],
      }),
    ).toThrow('placement identifiers must be unique');
  });

  it('requires every placed item in the catalog snapshot', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        inputSnapshot: { ...proposal.inputSnapshot, catalogItems: [] },
      }),
    ).toThrow('every placement requires a catalog snapshot');
  });

  it('cannot label hard failures as a valid proposal', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: {
          status: 'valid',
          validatorVersion: '0.1.0',
          issues: [
            {
              code: 'outside_room',
              severity: 'error',
              message: 'The sofa crosses the floor boundary.',
              placementIds: [placement.id],
            },
          ],
        },
      }),
    ).toThrow('error issues require invalid status');
  });

  it('constrains issue severity and prevents uncertain valid proposals', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: {
          status: 'valid',
          validatorVersion: '0.1.0',
          issues: [
            {
              code: 'outside_room',
              severity: 'info',
              message: 'The sofa crosses the floor boundary.',
              placementIds: [placement.id],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: {
          status: 'valid',
          validatorVersion: '0.1.0',
          issues: [
            {
              code: 'uncertain_geometry',
              severity: 'warning',
              message: 'The wall position is inferred.',
              placementIds: [placement.id],
            },
          ],
        },
      }),
    ).toThrow('valid proposals cannot contain errors or warnings');
  });

  it('requires an error before using invalid status', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: { ...proposal.validation, status: 'invalid' },
      }),
    ).toThrow('invalid proposals require an error issue');
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: { ...proposal.validation, status: 'warning' },
      }),
    ).toThrow('warning status requires a warning issue');
  });

  it('rejects validation issues for missing placements', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        validation: {
          status: 'warning',
          validatorVersion: '0.1.0',
          issues: [
            {
              code: 'uncertain_geometry',
              severity: 'warning',
              message: 'This placement uses an inferred wall.',
              placementIds: ['052b42bc-b933-43b9-a9e7-b109e4650957'],
            },
          ],
        },
      }),
    ).toThrow('must reference existing placements');
  });

  it('rejects a proposal that names itself as its parent', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        parentProposalId: proposal.id,
      }),
    ).toThrow('a proposal cannot be its own parent');
  });

  it('requires a parent exactly after the first revision', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        revision: 2,
      }),
    ).toThrow('only revisions after the first require a parent');
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        parentProposalId: 'fe593153-bdef-4a9a-89fa-a12f1f235ee0',
      }),
    ).toThrow('only revisions after the first require a parent');
  });

  it('requires unique catalog snapshots and score kinds', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        inputSnapshot: {
          ...proposal.inputSnapshot,
          catalogItems: [
            proposal.inputSnapshot.catalogItems[0],
            proposal.inputSnapshot.catalogItems[0],
          ],
        },
      }),
    ).toThrow('catalog snapshots must contain unique items');
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        scores: [proposal.scores[0], proposal.scores[0]],
      }),
    ).toThrow('proposal score kinds must be unique');
  });

  it('requires snapshot identifiers and canonical content hashes', () => {
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        inputSnapshot: {
          ...proposal.inputSnapshot,
          planningRoom: {
            ...proposal.inputSnapshot.planningRoom,
            id: '6d9e556f-28e0-4f2e-a806-1116d19a5f86',
          },
        },
      }),
    ).toThrow('planning room snapshot must match');
    expect(() =>
      DesignProposalSchema.parse({
        ...proposal,
        inputSnapshot: {
          ...proposal.inputSnapshot,
          designBrief: {
            ...proposal.inputSnapshot.designBrief,
            contentHash: 'sha256:not-a-hash',
          },
        },
      }),
    ).toThrow();
  });
});
