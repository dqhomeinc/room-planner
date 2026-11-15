import { describe, expect, it } from 'vitest';
import { DesignBriefSchema } from './design-brief';

const brief = {
  contractVersion: 1,
  id: 'fa171d58-13f9-4487-bebb-39ad742cf7f7',
  projectId: '3e88ca71-5c50-40d7-a68d-7b1b77812ff0',
  planningRoomId: '064c4f70-dd62-42ed-8333-12e380e788fb',
  name: 'Warm conversation room',
  activities: [{ activity: 'conversation', priority: 5, peopleCount: 5 }],
  furnitureRequirements: [
    {
      category: 'seating',
      importance: 'required',
      minimumQuantity: 2,
      maximumQuantity: 4,
      functionTags: ['conversation-seating'],
    },
  ],
  retainedFurnitureItemIds: [],
  preferences: {
    styles: { preferred: ['mid-century-modern'], avoided: [] },
    colors: { preferred: ['warm-neutral'], avoided: ['cool-gray'] },
    materials: { preferred: ['wood'], avoided: [] },
    moods: ['comfortable', 'welcoming'],
  },
  budget: {
    kind: 'range',
    currency: 'USD',
    minimumMinorUnits: 100_000,
    maximumMinorUnits: 300_000,
  },
  freeformRequest: 'Keep the room open enough for small gatherings.',
  interpretation: { source: 'structured_controls' },
  assumptions: [],
  createdAt: '2026-11-15T12:00:00-05:00',
  updatedAt: '2026-11-15T12:05:00-05:00',
} as const;

describe('design brief contract', () => {
  it('accepts structured user needs and preferences', () => {
    expect(DesignBriefSchema.parse(brief).activities[0].priority).toBe(5);
  });

  it('requires at least one room activity', () => {
    expect(() =>
      DesignBriefSchema.parse({ ...brief, activities: [] }),
    ).toThrow();
  });

  it('requires a positive minimum for required furniture', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        furnitureRequirements: [
          {
            ...brief.furnitureRequirements[0],
            minimumQuantity: 0,
          },
        ],
      }),
    ).toThrow('required furniture must have a positive minimum');
  });

  it('requires excluded furniture to have zero quantity', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        furnitureRequirements: [
          {
            ...brief.furnitureRequirements[0],
            importance: 'excluded',
          },
        ],
      }),
    ).toThrow('excluded furniture must have zero quantity');
  });

  it('rejects contradictory design preferences', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        preferences: {
          ...brief.preferences,
          styles: { preferred: ['modern'], avoided: ['modern'] },
        },
      }),
    ).toThrow('cannot be both preferred and avoided');
  });

  it('rejects an inverted budget range', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        budget: {
          kind: 'range',
          currency: 'USD',
          minimumMinorUnits: 400_000,
          maximumMinorUnits: 300_000,
        },
      }),
    ).toThrow('budget minimum cannot exceed maximum');
  });

  it('records the interpreter used for natural-language input', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        interpretation: { source: 'natural_language' },
      }),
    ).toThrow('requires an interpreter version');
  });
});
