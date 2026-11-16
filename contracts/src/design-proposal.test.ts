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

const parse = (overrides: Record<string, unknown> = {}) =>
  DesignProposalSchema.parse({ ...proposal, ...overrides });
const issue = (code: string, severity: string, id: string = placement.id) => ({
  code,
  severity,
  message: 'Synthetic validation issue.',
  placementIds: [id],
});
const validation = (status: string, issues: unknown[] = []) => ({
  status,
  validatorVersion: '0.1.0',
  issues,
});

describe('design proposal contract', () => {
  it('accepts a reproducible layout from user-validated geometry', () => {
    expect(parse().generator.seed).toBe('living-room-a');
  });

  it('rejects invalid placement and catalog references', () => {
    expect(() =>
      parse({
        inputSnapshot: { ...proposal.inputSnapshot, catalogItems: [] },
      }),
    ).toThrow('every placement requires a catalog snapshot');
  });

  it('constrains issue severity and validation status', () => {
    expect(() =>
      parse({
        validation: validation('valid', [issue('outside_room', 'info')]),
      }),
    ).toThrow();
    expect(() =>
      parse({
        validation: validation('valid', [
          issue('uncertain_geometry', 'warning'),
        ]),
      }),
    ).toThrow('valid proposals cannot contain errors or warnings');
    expect(() => parse({ validation: validation('invalid') })).toThrow(
      'invalid proposals require an error issue',
    );
    expect(() => parse({ validation: validation('warning') })).toThrow(
      'warning status requires a warning issue',
    );
  });

  it('requires uncertainty warnings for unvalidated geometry', () => {
    const inferredSnapshot = {
      ...proposal.inputSnapshot,
      planningRoom: {
        ...proposal.inputSnapshot.planningRoom,
        geometryStatus: 'inferred',
      },
    };
    expect(() => parse({ inputSnapshot: inferredSnapshot })).toThrow(
      'unvalidated geometry requires an uncertainty warning',
    );
    expect(
      parse({
        inputSnapshot: inferredSnapshot,
        validation: validation('warning', [
          issue('uncertain_geometry', 'warning'),
        ]),
      }).validation.status,
    ).toBe('warning');
  });

  it('enforces proposal ancestry', () => {
    expect(() => parse({ parentProposalId: proposal.id })).toThrow(
      'a proposal cannot be its own parent',
    );
    expect(() => parse({ revision: 2 })).toThrow(
      'only revisions after the first require a parent',
    );
    expect(() =>
      parse({ parentProposalId: 'fe593153-bdef-4a9a-89fa-a12f1f235ee0' }),
    ).toThrow('only revisions after the first require a parent');
  });

  it('requires unique catalog snapshots and score kinds', () => {
    const catalogItem = proposal.inputSnapshot.catalogItems[0];
    expect(() =>
      parse({
        inputSnapshot: {
          ...proposal.inputSnapshot,
          catalogItems: [catalogItem, catalogItem],
        },
      }),
    ).toThrow('catalog snapshots must contain unique items');
    expect(() =>
      parse({ scores: [proposal.scores[0], proposal.scores[0]] }),
    ).toThrow('proposal score kinds must be unique');
  });

  it('requires matching snapshot identifiers and canonical hashes', () => {
    expect(() =>
      parse({
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
      parse({
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

  it('rejects proposal inputs updated after creation', () => {
    const future = '2026-11-15T12:11:00-05:00';
    for (const inputSnapshot of [
      {
        ...proposal.inputSnapshot,
        planningRoom: {
          ...proposal.inputSnapshot.planningRoom,
          updatedAt: future,
        },
      },
      {
        ...proposal.inputSnapshot,
        designBrief: {
          ...proposal.inputSnapshot.designBrief,
          updatedAt: future,
        },
      },
      {
        ...proposal.inputSnapshot,
        catalogItems: [
          { ...proposal.inputSnapshot.catalogItems[0], updatedAt: future },
        ],
      },
    ]) {
      expect(() => parse({ inputSnapshot })).toThrow(
        'proposal inputs cannot postdate proposal creation',
      );
    }
  });
});
