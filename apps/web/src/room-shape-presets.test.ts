import { describe, expect, it } from 'vitest';
import { validateOrthogonalBoundary } from './room-boundary';
import { createRoomShapePreset } from './room-shape-presets';

describe('room shape presets', () => {
  it('creates a rectangle from overall dimensions', () => {
    expect(createRoomShapePreset('rectangle', 5, 4)).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
    });
  });

  it('creates an L-shape within the requested overall extents', () => {
    expect(createRoomShapePreset('l_shape', 5, 4)).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 2.6 },
        { x: 3.25, y: 2.6 },
        { x: 3.25, y: 4 },
        { x: 0, y: 4 },
      ],
    });
  });

  it('creates a centered alcove within the requested overall extents', () => {
    expect(createRoomShapePreset('alcove', 5, 4)).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 4 },
        { x: 3.25, y: 4 },
        { x: 3.25, y: 3.2 },
        { x: 1.75, y: 3.2 },
        { x: 1.75, y: 4 },
        { x: 0, y: 4 },
      ],
    });
  });

  it.each(['rectangle', 'l_shape', 'alcove'] as const)(
    'always returns validated %s geometry',
    (preset) => {
      const result = createRoomShapePreset(preset, 6, 4.5);

      expect(result.ok).toBe(true);
      if (result.ok)
        expect(validateOrthogonalBoundary(result.boundary)).toEqual([]);
    },
  );

  it('rejects dimensions that cannot support the selected shape', () => {
    expect(createRoomShapePreset('alcove', 0.5, 2)).toEqual({
      ok: false,
      message: 'An alcove room needs an overall width of at least 0.6 meters.',
    });
    expect(createRoomShapePreset('rectangle', Number.NaN, 4)).toEqual({
      ok: false,
      message: 'Room dimensions must be finite and positive.',
    });
  });
});
