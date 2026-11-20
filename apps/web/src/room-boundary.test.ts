import { describe, expect, it } from 'vitest';
import {
  moveBoundaryNode,
  moveOrthogonalCorner,
  moveOrthogonalWall,
  resizeBoundaryWall,
  resizeOrthogonalWall,
  validatePolygonBoundary,
  validateOrthogonalBoundary,
} from './room-boundary';

const rectangle = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 4 },
];

describe('orthogonal room boundaries', () => {
  it('accepts a valid rectangular boundary', () => {
    expect(validateOrthogonalBoundary(rectangle)).toEqual([]);
  });

  it('accepts straight diagonal walls in a general polygon', () => {
    expect(
      validatePolygonBoundary([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 3.5, y: 3 },
        { x: 0, y: 4 },
      ]),
    ).toEqual([]);
  });

  it('rejects diagonal and undersized walls', () => {
    const issues = validateOrthogonalBoundary([
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);

    expect(issues.map(({ code }) => code)).toContain('wall_too_short');
    expect(issues.map(({ code }) => code)).toContain('non_orthogonal_wall');
  });

  it('rejects non-finite and insufficient boundaries', () => {
    expect(validateOrthogonalBoundary(rectangle.slice(0, 3))[0]?.code).toBe(
      'too_few_points',
    );
    expect(
      validateOrthogonalBoundary([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ])[0]?.code,
    ).toBe('non_finite_point');
  });

  it('detects crossing orthogonal walls', () => {
    const issues = validateOrthogonalBoundary([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ]);

    expect(issues.map(({ code }) => code)).toContain('self_intersection');
  });

  it('moves and snaps a corner while keeping adjacent walls orthogonal', () => {
    const result = moveOrthogonalCorner(rectangle, 0, { x: 0.46, y: 0.54 });

    expect(result).toEqual({
      ok: true,
      boundary: [
        { x: 0.5, y: 0.5 },
        { x: 5, y: 0.5 },
        { x: 5, y: 4 },
        { x: 0.5, y: 4 },
      ],
    });
    expect(rectangle[0]).toEqual({ x: 0, y: 0 });
  });

  it('moves only one node and permits straight diagonal walls', () => {
    const result = moveBoundaryNode(rectangle, 1, { x: 4.46, y: 0.54 });

    expect(result).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 0 },
        { x: 4.5, y: 0.5 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
    });
    expect(rectangle[1]).toEqual({ x: 5, y: 0 });
  });

  it('rejects a node move that crosses another wall', () => {
    const result = moveBoundaryNode(rectangle, 1, { x: 2, y: 5 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain(
        'self_intersection',
      );
    }
  });

  it('moves a wall perpendicular to its orientation', () => {
    expect(moveOrthogonalWall(rectangle, 0, 1.04)).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 4 },
        { x: 0, y: 4 },
      ],
    });
  });

  it('rejects edits that collapse a wall', () => {
    const result = moveOrthogonalWall(rectangle, 0, 3.9);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map(({ code }) => code)).toContain('wall_too_short');
    }
  });

  it('sets an exact wall length and keeps the next wall orthogonal', () => {
    expect(resizeOrthogonalWall(rectangle, 0, 4.25)).toEqual({
      ok: true,
      boundary: [
        { x: 0, y: 0 },
        { x: 4.25, y: 0 },
        { x: 4.25, y: 4 },
        { x: 0, y: 4 },
      ],
    });
  });

  it('sets an exact diagonal wall length by moving its end node', () => {
    const diagonal = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 6 },
      { x: 0, y: 6 },
    ];
    const result = resizeBoundaryWall(diagonal, 0, 2.5);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.boundary[1]).toEqual({ x: 1.5, y: 2 });
      expect(Math.hypot(result.boundary[1].x, result.boundary[1].y)).toBe(2.5);
    }
  });

  it('rejects invalid wall lengths', () => {
    const result = resizeOrthogonalWall(rectangle, 0, 0.1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('wall_too_short');
    expect(() => resizeOrthogonalWall(rectangle, 10, 2)).toThrow(
      'wall index must reference the boundary',
    );
  });

  it('rejects invalid indices and snap configuration', () => {
    expect(() => moveOrthogonalWall(rectangle, 10, 1)).toThrow(
      'wall index must reference the boundary',
    );
    expect(() => moveOrthogonalCorner(rectangle, 0, { x: 1, y: 1 }, 0)).toThrow(
      'snap values must be finite and step must be positive',
    );
    expect(() => moveBoundaryNode(rectangle, 10, { x: 1, y: 1 })).toThrow(
      'node index must reference the boundary',
    );
  });
});
