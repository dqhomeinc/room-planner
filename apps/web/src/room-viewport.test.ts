import { describe, expect, it } from 'vitest';
import {
  boundsFromPoints,
  chooseGridStepMeters,
  createRoomViewport,
  screenToWorld,
  worldToScreen,
} from './room-viewport';

const bounds = { minX: 0, minY: 0, maxX: 5, maxY: 4 };

describe('room viewport', () => {
  it('derives metric bounds from a floor boundary', () => {
    expect(
      boundsFromPoints([
        { x: 2, y: -1 },
        { x: 7, y: -1 },
        { x: 7, y: 3 },
        { x: 2, y: 3 },
      ]),
    ).toEqual({ minX: 2, minY: -1, maxX: 7, maxY: 3 });
  });

  it('fits the room with centered padding in a wide viewport', () => {
    const viewport = createRoomViewport(
      bounds,
      { width: 600, height: 400 },
      20,
    );

    expect(viewport.pixelsPerMeter).toBe(90);
    expect(viewport.offsetX).toBe(75);
    expect(viewport.offsetY).toBe(20);
    expect(worldToScreen(viewport, { x: 0, y: 0 })).toEqual({ x: 75, y: 380 });
    expect(worldToScreen(viewport, { x: 5, y: 4 })).toEqual({ x: 525, y: 20 });
  });

  it('fits the same room in a tall mobile viewport', () => {
    const viewport = createRoomViewport(
      bounds,
      { width: 320, height: 560 },
      16,
    );

    expect(viewport.pixelsPerMeter).toBeCloseTo(57.6);
    expect(viewport.offsetX).toBe(16);
    expect(viewport.offsetY).toBeCloseTo(164.8);
  });

  it('uses world y-up and screen y-down coordinates', () => {
    const viewport = createRoomViewport(bounds, { width: 500, height: 400 }, 0);
    const lower = worldToScreen(viewport, { x: 2.5, y: 1 });
    const upper = worldToScreen(viewport, { x: 2.5, y: 3 });

    expect(upper.y).toBeLessThan(lower.y);
    expect(upper.x).toBe(lower.x);
  });

  it('round-trips screen and world positions', () => {
    const viewport = createRoomViewport(
      { minX: -2, minY: 10, maxX: 3, maxY: 14 },
      { width: 375, height: 667 },
      24,
    );
    const world = { x: 1.234, y: 13.456 };
    const restored = screenToWorld(viewport, worldToScreen(viewport, world));

    expect(restored.x).toBeCloseTo(world.x);
    expect(restored.y).toBeCloseTo(world.y);
  });

  it.each([
    [100, 28, 0.5],
    [40, 28, 1],
    [12, 28, 5],
    [4, 28, 10],
  ])(
    'chooses a readable 1/2/5 grid step at %s px/m',
    (pixelsPerMeter, minimumPixels, expectedMeters) => {
      expect(chooseGridStepMeters(pixelsPerMeter, minimumPixels)).toBe(
        expectedMeters,
      );
    },
  );

  it('rejects degenerate geometry and unusable viewports', () => {
    expect(() =>
      boundsFromPoints([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toThrow('world height must be greater than zero');
    expect(() =>
      createRoomViewport(bounds, { width: 40, height: 40 }, 20),
    ).toThrow('drawable width must be greater than zero');
    expect(() => chooseGridStepMeters(0)).toThrow(
      'pixels per meter must be greater than zero',
    );
  });
});
