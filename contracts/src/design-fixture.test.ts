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

    expect(room.floorBoundary).toHaveLength(4);
    expect(room.openings).toHaveLength(2);
    expect(furniture).toHaveLength(3);
    expect(new Set(furniture.map(({ id }) => id)).size).toBe(furniture.length);
  });
});
