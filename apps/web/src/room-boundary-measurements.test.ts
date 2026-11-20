import { describe, expect, it } from 'vitest';
import { measureBoundary } from './room-boundary-measurements';

describe('room boundary measurements', () => {
  it('measures rectangle wall lengths and interior angles', () => {
    const measurements = measureBoundary([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 4 },
      { x: 0, y: 4 },
    ]);

    expect(
      measurements.map(({ wallLengthMeters }) => wallLengthMeters),
    ).toEqual([5, 4, 5, 4]);
    expect(
      measurements.map(({ interiorAngleDegrees }) => interiorAngleDegrees),
    ).toEqual([90, 90, 90, 90]);
  });

  it('measures concave angles and preserves the polygon angle sum', () => {
    const measurements = measureBoundary([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 2.5 },
      { x: 3, y: 2.5 },
      { x: 3, y: 4 },
      { x: 0, y: 4 },
    ]);

    expect(measurements[3].interiorAngleDegrees).toBe(270);
    expect(
      measurements.reduce(
        (sum, { interiorAngleDegrees }) => sum + interiorAngleDegrees,
        0,
      ),
    ).toBe(720);
  });

  it('produces the same rectangle angles for clockwise boundaries', () => {
    const measurements = measureBoundary([
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 5, y: 4 },
      { x: 5, y: 0 },
    ]);

    expect(
      measurements.map(({ interiorAngleDegrees }) => interiorAngleDegrees),
    ).toEqual([90, 90, 90, 90]);
  });

  it('rejects geometry that cannot be measured safely', () => {
    expect(() =>
      measureBoundary([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toThrow('at least three nodes');
    expect(() =>
      measureBoundary([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toThrow('non-zero area');
  });
});
