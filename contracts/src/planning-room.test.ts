import { describe, expect, it } from 'vitest';
import { PlanningRoomSchema } from './planning-room';

const measured = (meters: number) => ({
  meters,
  provenance: {
    source: 'user_measurement' as const,
    confidence: 0.95,
    userValidated: true,
  },
});

const room = {
  contractVersion: 1,
  id: '60d17f86-a9a7-498f-8739-7b529cab1f14',
  projectId: '5b4ac75b-d4fb-477a-992c-7f40ae8d0bec',
  name: 'Measured living room',
  coordinateSpace: 'metric',
  floorBoundary: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 4 },
    { x: 0, y: 4 },
  ],
  floorBoundaryProvenance: {
    source: 'user_measurement',
    confidence: 0.95,
    userValidated: true,
  },
  wallHeight: measured(2.6),
  openings: [
    {
      id: '715c1ff8-68f3-4337-973c-3e528f812231',
      kind: 'door',
      wallIndex: 0,
      startOffset: measured(0.5),
      width: measured(0.9),
      height: measured(2.05),
      sillHeight: measured(0),
    },
  ],
  fixedFeatures: [],
  createdAt: '2026-11-15T12:00:00-05:00',
  updatedAt: '2026-11-15T12:05:00-05:00',
} as const;

describe('planning room contract', () => {
  it('accepts metric geometry with measurement provenance', () => {
    expect(PlanningRoomSchema.parse(room).floorBoundary).toHaveLength(4);
  });

  it('rejects a floor boundary with no usable area', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        floorBoundary: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
      }),
    ).toThrow('polygon must enclose');
  });

  it('rejects an opening that references a missing wall', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        openings: [{ ...room.openings[0], wallIndex: 4 }],
      }),
    ).toThrow('opening must reference an existing wall');
  });

  it('rejects an opening wider than its wall segment', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        openings: [
          {
            ...room.openings[0],
            startOffset: measured(4.5),
            width: measured(1),
          },
        ],
      }),
    ).toThrow('opening must fit within its wall');
  });

  it('rejects an opening extending above the wall', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        openings: [
          {
            ...room.openings[0],
            kind: 'window',
            sillHeight: measured(1),
            height: measured(2),
          },
        ],
      }),
    ).toThrow('opening must fit below the wall height');
  });

  it('requires non-window openings to start at floor level', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        openings: [{ ...room.openings[0], sillHeight: measured(0.1) }],
      }),
    ).toThrow('must start at floor level');
  });

  it('rejects updates dated before room creation', () => {
    expect(() =>
      PlanningRoomSchema.parse({
        ...room,
        updatedAt: '2026-11-15T11:59:00-05:00',
      }),
    ).toThrow('updatedAt cannot precede createdAt');
  });
});
