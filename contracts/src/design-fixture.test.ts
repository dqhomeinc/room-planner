import { describe, expect, it } from 'vitest';
import fixture from '../../tests/fixtures/design/rectangular-living-room.json';
import { FurnitureItemSchema } from './furniture';
import { PlanningRoomSchema } from './planning-room';

describe('synthetic design fixture', () => {
  it('contains a valid room and starter furniture catalog', () => {
    const room = PlanningRoomSchema.parse(fixture.room);
    const furniture = fixture.furnitureItems.map((item) =>
      FurnitureItemSchema.parse(item),
    );
    const area = Math.abs(
      room.floorBoundary.reduce((sum, point, index, boundary) => {
        const next = boundary[(index + 1) % boundary.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0) / 2,
    );

    expect(area).toBe(20);
    expect(
      room.openings.map(({ kind, wallIndex }) => ({ kind, wallIndex })),
    ).toEqual([
      { kind: 'door', wallIndex: 0 },
      { kind: 'window', wallIndex: 2 },
    ]);
    expect(furniture).toHaveLength(3);
    expect(new Set(furniture.map(({ id }) => id)).size).toBe(furniture.length);
    expect(furniture.every(({ status }) => status === 'prototype')).toBe(true);
    expect(
      furniture.every(
        ({ dimensions }) =>
          dimensions.provenance.source === 'estimated' &&
          dimensions.provenance.confidence === 0.5,
      ),
    ).toBe(true);
  });

  it('rejects an opening that overflows its wall', () => {
    const overflowingRoom = {
      ...fixture.room,
      openings: [
        {
          ...fixture.room.openings[0],
          startOffset: {
            ...fixture.room.openings[0].startOffset,
            meters: 4.5,
          },
          width: { ...fixture.room.openings[0].width, meters: 1 },
        },
        fixture.room.openings[1],
      ],
    };

    expect(() => PlanningRoomSchema.parse(overflowingRoom)).toThrow(
      'opening must fit within its wall',
    );
  });
});
