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
  interpretation: { source: 'structured_controls' },
  assumptions: [],
  createdAt: '2026-11-15T12:00:00-05:00',
  updatedAt: '2026-11-15T12:05:00-05:00',
} as const;

describe('design brief contract', () => {
  it('validates required and excluded furniture quantities', () => {
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

  it('rejects inverted quantities and duplicate requirement categories', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        furnitureRequirements: [
          {
            ...brief.furnitureRequirements[0],
            minimumQuantity: 4,
            maximumQuantity: 2,
          },
        ],
      }),
    ).toThrow('minimum quantity cannot exceed maximum');
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        furnitureRequirements: [
          brief.furnitureRequirements[0],
          {
            ...brief.furnitureRequirements[0],
            importance: 'excluded',
            minimumQuantity: 0,
            maximumQuantity: 0,
          },
        ],
      }),
    ).toThrow('furniture requirement categories must be unique');
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

  it('requires safe integer budget amounts', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        budget: {
          kind: 'range',
          currency: 'USD',
          minimumMinorUnits: 100_000,
          maximumMinorUnits: Number.MAX_SAFE_INTEGER + 1,
        },
      }),
    ).toThrow();
  });

  it('accepts natural-language input with complete provenance', () => {
    const parsed = DesignBriefSchema.parse({
      ...brief,
      freeformRequest: 'Keep the room open enough for small gatherings.',
      interpretation: {
        source: 'natural_language',
        interpreterVersion: 'brief-interpreter-1.0.0',
      },
    });
    expect(parsed.interpretation.source).toBe('natural_language');
  });

  it('requires language text and interpreter versions together', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        interpretation: {
          source: 'natural_language',
          interpreterVersion: 'brief-interpreter-1.0.0',
        },
      }),
    ).toThrow('requires a free-form request');
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        freeformRequest: 'Keep the room open.',
        interpretation: { source: 'natural_language' },
      }),
    ).toThrow('requires an interpreter version');
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        interpretation: {
          source: 'structured_controls',
          interpreterVersion: 'unused-interpreter',
        },
      }),
    ).toThrow('structured controls cannot name a language interpreter');
  });

  it('rejects free-form text attributed only to structured controls', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        freeformRequest: 'Keep the room open.',
      }),
    ).toThrow('must use mixed or natural-language interpretation');
  });

  it('requires unique retained items, moods, and assumption identifiers', () => {
    const retainedId = 'e42ad349-77f5-4935-a11f-43d1cead83d6';
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        retainedFurnitureItemIds: [retainedId, retainedId],
      }),
    ).toThrow('retained furniture must be unique');
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        preferences: {
          ...brief.preferences,
          moods: ['comfortable', 'comfortable'],
        },
      }),
    ).toThrow('moods must not contain duplicates');
    const assumption = {
      id: '7dcc8a90-2b0a-48ba-bdf6-7eec2e075337',
      text: 'The window is the primary source of natural light.',
      source: 'default',
      confirmedByUser: false,
    } as const;
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        assumptions: [assumption, assumption],
      }),
    ).toThrow('assumption identifiers must be unique');
  });

  it('requires explicit assumptions to be user-confirmed', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        assumptions: [
          {
            id: '7dcc8a90-2b0a-48ba-bdf6-7eec2e075337',
            text: 'The user asked to keep the existing sofa.',
            source: 'explicit',
            confirmedByUser: false,
          },
        ],
      }),
    ).toThrow('explicit assumptions must be confirmed');
  });

  it('rejects stale timestamps', () => {
    expect(() =>
      DesignBriefSchema.parse({
        ...brief,
        updatedAt: '2026-11-15T11:59:00-05:00',
      }),
    ).toThrow('updatedAt cannot precede createdAt');
  });
});
