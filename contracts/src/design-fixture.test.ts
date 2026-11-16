import { describe, expect, it } from 'vitest';
import designFixture from '../../tests/fixtures/design/living-room-proposal.json';
import fixture from '../../tests/fixtures/design/rectangular-living-room.json';
import { DesignBriefSchema } from './design-brief';
import { DesignProposalSchema } from './design-proposal';
import { FurnitureItemSchema } from './furniture';
import { PlanningRoomSchema } from './planning-room';

// Stable for these simple fixture numbers; this is not a general RFC 8785 serializer.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('unsupported JSON value');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

function utf8(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const bytes: number[] = [];
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === '%') {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else bytes.push(encoded.charCodeAt(index));
  }
  return Uint8Array.from(bytes);
}

async function contentHash(value: unknown): Promise<string> {
  type Subtle = {
    digest: (name: string, data: Uint8Array) => Promise<ArrayBuffer>;
  };
  const subtle = (globalThis as { crypto?: { subtle?: Subtle } }).crypto
    ?.subtle;
  if (!subtle) throw new Error('Web Crypto is required for fixture hashing');
  const digest = await subtle.digest('SHA-256', utf8(canonicalize(value)));
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `sha256:${hex}`;
}

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

  it('contains a brief and proposal tied to exact room and catalog inputs', async () => {
    const room = PlanningRoomSchema.parse(fixture.room);
    const brief = DesignBriefSchema.parse(designFixture.brief);
    const proposal = DesignProposalSchema.parse(designFixture.proposal);
    const furniture = fixture.furnitureItems.map((item) =>
      FurnitureItemSchema.parse(item),
    );
    const furnitureById = new Map(furniture.map((item) => [item.id, item]));
    const snapshotById = new Map(
      proposal.inputSnapshot.catalogItems.map((item) => [
        item.furnitureItemId,
        item,
      ]),
    );

    expect(
      new Set([room.projectId, brief.projectId, proposal.projectId]).size,
    ).toBe(1);
    expect(brief.planningRoomId).toBe(room.id);
    expect(proposal.planningRoomId).toBe(room.id);
    expect(proposal.designBriefId).toBe(brief.id);
    expect(proposal.inputSnapshot.planningRoom.updatedAt).toBe(room.updatedAt);
    expect(proposal.inputSnapshot.designBrief.updatedAt).toBe(brief.updatedAt);
    expect(proposal.inputSnapshot.planningRoom.contentHash).toBe(
      await contentHash(fixture.room),
    );
    expect(proposal.inputSnapshot.designBrief.contentHash).toBe(
      await contentHash(designFixture.brief),
    );
    expect([...snapshotById.keys()].sort()).toEqual(
      furniture.map(({ id }) => id).sort(),
    );
    for (const [index, item] of furniture.entries()) {
      expect(snapshotById.get(item.id)?.updatedAt).toBe(item.updatedAt);
      expect(snapshotById.get(item.id)?.contentHash).toBe(
        await contentHash(fixture.furnitureItems[index]),
      );
    }

    const xCoordinates = room.floorBoundary.map(({ x }) => x);
    const yCoordinates = room.floorBoundary.map(({ y }) => y);
    const bounds = {
      minX: Math.min(...xCoordinates),
      maxX: Math.max(...xCoordinates),
      minY: Math.min(...yCoordinates),
      maxY: Math.max(...yCoordinates),
    };
    const categoryCounts = new Map<string, number>();
    for (const placed of proposal.placements) {
      const item = furnitureById.get(placed.furnitureItemId);
      expect(item).toBeDefined();
      categoryCounts.set(
        item!.category,
        (categoryCounts.get(item!.category) ?? 0) + 1,
      );

      const angle = (placed.transform.rotationDegrees * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (const [x, y] of [
        [-item!.dimensions.widthMeters / 2, -item!.dimensions.depthMeters / 2],
        [item!.dimensions.widthMeters / 2, -item!.dimensions.depthMeters / 2],
        [item!.dimensions.widthMeters / 2, item!.dimensions.depthMeters / 2],
        [-item!.dimensions.widthMeters / 2, item!.dimensions.depthMeters / 2],
      ]) {
        const worldX = placed.transform.position.x + x * cos - y * sin;
        const worldY = placed.transform.position.y + x * sin + y * cos;
        expect(worldX).toBeGreaterThanOrEqual(bounds.minX);
        expect(worldX).toBeLessThanOrEqual(bounds.maxX);
        expect(worldY).toBeGreaterThanOrEqual(bounds.minY);
        expect(worldY).toBeLessThanOrEqual(bounds.maxY);
      }
    }
    for (const requirement of brief.furnitureRequirements) {
      const count = categoryCounts.get(requirement.category) ?? 0;
      expect(count).toBeGreaterThanOrEqual(requirement.minimumQuantity);
      expect(count).toBeLessThanOrEqual(requirement.maximumQuantity);
    }

    // World x points right, y points up, and positive rotation is counter-clockwise.
    const table = proposal.placements.find(
      ({ furnitureItemId }) =>
        furnitureById.get(furnitureItemId)?.category === 'table',
    )!;
    const tableItem = furnitureById.get(table.furnitureItemId)!;
    const sofa = proposal.placements.find(({ furnitureItemId }) =>
      furnitureById
        .get(furnitureItemId)
        ?.design.functionTags.includes('three-seat'),
    )!;
    const sofaItem = furnitureById.get(sofa.furnitureItemId)!;
    expect(sofa.transform.rotationDegrees).toBe(0);
    expect(table.transform.rotationDegrees).toBe(0);
    const sofaTableGap =
      table.transform.position.y -
      tableItem.dimensions.depthMeters / 2 -
      (sofa.transform.position.y + sofaItem.dimensions.depthMeters / 2);
    expect(sofaTableGap).toBeCloseTo(0.4);
    expect(sofaTableGap).toBeLessThan(sofaItem.clearance.frontMeters);

    const door = room.openings.find(({ kind }) => kind === 'door')!;
    const wallStart = room.floorBoundary[door.wallIndex];
    const wallEnd =
      room.floorBoundary[(door.wallIndex + 1) % room.floorBoundary.length];
    const wallLength = Math.hypot(
      wallEnd.x - wallStart.x,
      wallEnd.y - wallStart.y,
    );
    expect(wallStart.y).toBe(wallEnd.y);
    const sofaBottomY =
      sofa.transform.position.y - sofaItem.dimensions.depthMeters / 2;
    expect(sofaBottomY - wallStart.y).toBeCloseTo(0.2);
    // This fixture-specific check measures lateral clearance beside a horizontal door wall.
    const wallDirectionX = (wallEnd.x - wallStart.x) / wallLength;
    const doorEndX =
      wallStart.x +
      wallDirectionX * (door.startOffset.meters + door.width.meters);
    const sofaLeftX =
      sofa.transform.position.x - sofaItem.dimensions.widthMeters / 2;
    const sofaDoorGap = sofaLeftX - doorEndX;
    expect(sofaDoorGap).toBeCloseTo(0.1);
    expect(sofaDoorGap).toBeLessThanOrEqual(
      sofaItem.clearance.leftMeters + Number.EPSILON,
    );

    const chairItem = furniture.find(
      ({ category, design }) =>
        category === 'seating' && !design.functionTags.includes('three-seat'),
    )!;
    const chairs = proposal.placements.filter(
      ({ furnitureItemId }) => furnitureItemId === chairItem.id,
    );
    expect(chairs).toHaveLength(2);
    const tableMinX =
      table.transform.position.x - tableItem.dimensions.widthMeters / 2;
    const tableMaxX =
      table.transform.position.x + tableItem.dimensions.widthMeters / 2;
    const tableMinY =
      table.transform.position.y - tableItem.dimensions.depthMeters / 2;
    const tableMaxY =
      table.transform.position.y + tableItem.dimensions.depthMeters / 2;
    for (const chair of chairs) {
      const angle = (chair.transform.rotationDegrees * Math.PI) / 180;
      const front = { x: -Math.sin(angle), y: Math.cos(angle) };
      const toward = {
        x: table.transform.position.x - chair.transform.position.x,
        y: table.transform.position.y - chair.transform.position.y,
      };
      const alignment =
        (front.x * toward.x + front.y * toward.y) /
        Math.hypot(toward.x, toward.y);
      expect(alignment).toBeGreaterThan(0.99);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const chairCorners = [
        [
          -chairItem.dimensions.widthMeters / 2,
          -chairItem.dimensions.depthMeters / 2,
        ],
        [
          chairItem.dimensions.widthMeters / 2,
          -chairItem.dimensions.depthMeters / 2,
        ],
        [
          chairItem.dimensions.widthMeters / 2,
          chairItem.dimensions.depthMeters / 2,
        ],
        [
          -chairItem.dimensions.widthMeters / 2,
          chairItem.dimensions.depthMeters / 2,
        ],
      ].map(([x, y]) => ({
        x: chair.transform.position.x + x * cos - y * sin,
        y: chair.transform.position.y + x * sin + y * cos,
      }));
      const chairMinX = Math.min(...chairCorners.map(({ x }) => x));
      const chairMaxX = Math.max(...chairCorners.map(({ x }) => x));
      const chairMinY = Math.min(...chairCorners.map(({ y }) => y));
      const chairMaxY = Math.max(...chairCorners.map(({ y }) => y));
      const chairIsLeftOfTable =
        chair.transform.position.x < table.transform.position.x;
      const chairTableGap = chairIsLeftOfTable
        ? tableMinX - chairMaxX
        : chairMinX - tableMaxX;
      const tableSideClearance = chairIsLeftOfTable
        ? tableItem.clearance.leftMeters
        : tableItem.clearance.rightMeters;
      expect(chairTableGap).toBeCloseTo(0.15, 2);
      expect(Math.min(chairMaxY, tableMaxY)).toBeGreaterThan(
        Math.max(chairMinY, tableMinY),
      );
      expect(chairTableGap).toBeLessThan(chairItem.clearance.frontMeters);
      expect(chairTableGap).toBeLessThan(tableSideClearance);
    }

    expect(proposal.inputSnapshot.planningRoom.geometryStatus).toBe('inferred');
    expect(proposal.validation.status).toBe('invalid');
    const placementIds = new Set(proposal.placements.map(({ id }) => id));
    for (const issue of proposal.validation.issues) {
      expect(issue.placementIds.every((id) => placementIds.has(id))).toBe(true);
    }
    expect(proposal.validation.issues.map(({ code }) => code)).toEqual([
      'uncertain_geometry',
      'insufficient_clearance',
      'insufficient_clearance',
      'blocked_opening',
    ]);
    const clearanceIssue = proposal.validation.issues.find(
      ({ code, placementIds: ids }) =>
        code === 'insufficient_clearance' &&
        ids.includes(sofa.id) &&
        ids.includes(table.id),
    );
    expect(clearanceIssue).toBeDefined();
    const chairClearanceIssue = proposal.validation.issues.find(
      ({ code, placementIds: ids }) =>
        code === 'insufficient_clearance' &&
        chairs.every(({ id }) => ids.includes(id)),
    );
    expect(chairClearanceIssue?.placementIds).toEqual([
      ...chairs.map(({ id }) => id),
      table.id,
    ]);
    const openingIssue = proposal.validation.issues.find(
      ({ code }) => code === 'blocked_opening',
    );
    expect(openingIssue?.placementIds).toEqual([sofa.id]);
  });
});
