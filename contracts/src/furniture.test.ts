import { describe, expect, it } from 'vitest';
import { FurnitureItemSchema } from './furniture';

const item = {
  contractVersion: 1,
  id: 'e42ad349-77f5-4935-a11f-43d1cead83d6',
  name: 'Three-seat sofa',
  category: 'seating',
  dimensions: {
    widthMeters: 2.1,
    depthMeters: 0.9,
    heightMeters: 0.82,
    provenance: {
      source: 'curated_measurement',
      confidence: 0.98,
      sourceReference: 'starter-catalog-sofa-01',
      checkedAt: '2026-11-15T12:00:00-05:00',
    },
  },
  orientation: { frontEdge: 'positive_depth', support: 'floor' },
  clearance: {
    frontMeters: 0.75,
    backMeters: 0.05,
    leftMeters: 0.1,
    rightMeters: 0.1,
    basis: 'design_rule',
    confidence: 0.9,
  },
  design: {
    styles: ['mid-century-modern'],
    colors: ['warm-gray'],
    materials: ['fabric', 'wood'],
    functionTags: ['conversation-seating', 'three-seat'],
    visualWeight: 'medium',
  },
  status: 'curated',
  createdAt: '2026-11-15T12:00:00-05:00',
  updatedAt: '2026-11-15T12:05:00-05:00',
} as const;

describe('furniture contract', () => {
  it('accepts dimensioned furniture with design and clearance metadata', () => {
    expect(FurnitureItemSchema.parse(item).dimensions.widthMeters).toBe(2.1);
  });

  it('rejects zero or negative physical dimensions', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        dimensions: { ...item.dimensions, widthMeters: 0 },
      }),
    ).toThrow();
  });

  it('requires a recognized local front edge', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        orientation: { ...item.orientation, frontEdge: 'top' },
      }),
    ).toThrow();
  });

  it('rejects negative clearance requirements', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        clearance: { ...item.clearance, frontMeters: -0.01 },
      }),
    ).toThrow();
  });

  it('does not treat estimated dimensions as perfectly certain', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        dimensions: {
          ...item.dimensions,
          provenance: {
            source: 'estimated',
            confidence: 1,
          },
        },
      }),
    ).toThrow('estimated dimensions cannot have perfect confidence');
  });

  it('requires normalized, unique matching tags', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        design: { ...item.design, styles: ['modern', 'modern'] },
      }),
    ).toThrow('tags must not contain duplicates');
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        design: { ...item.design, colors: ['Warm Gray'] },
      }),
    ).toThrow('lower-case slugs');
  });

  it('rejects catalog updates before item creation', () => {
    expect(() =>
      FurnitureItemSchema.parse({
        ...item,
        updatedAt: '2026-11-15T11:59:00-05:00',
      }),
    ).toThrow('updatedAt cannot precede createdAt');
  });
});
