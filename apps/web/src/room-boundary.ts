import type { WorldPoint } from './room-viewport';

export const MIN_WALL_LENGTH_METERS = 0.2;
export const MIN_ROOM_AREA_SQUARE_METERS = 0.25;

export type BoundaryIssueCode =
  | 'too_few_points'
  | 'non_finite_point'
  | 'wall_too_short'
  | 'non_orthogonal_wall'
  | 'self_intersection'
  | 'room_too_small';

export type BoundaryIssue = Readonly<{
  code: BoundaryIssueCode;
  message: string;
  wallIndex?: number;
}>;

export type BoundaryEditResult =
  | Readonly<{ ok: true; boundary: readonly WorldPoint[] }>
  | Readonly<{ ok: false; issues: readonly BoundaryIssue[] }>;

const epsilon = 1e-9;

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function signedArea(boundary: readonly WorldPoint[]): number {
  return (
    boundary.reduce((sum, point, index) => {
      const next = boundary[(index + 1) % boundary.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

function direction(a: WorldPoint, b: WorldPoint, c: WorldPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: WorldPoint, b: WorldPoint, point: WorldPoint): boolean {
  return (
    point.x >= Math.min(a.x, b.x) - epsilon &&
    point.x <= Math.max(a.x, b.x) + epsilon &&
    point.y >= Math.min(a.y, b.y) - epsilon &&
    point.y <= Math.max(a.y, b.y) + epsilon
  );
}

function segmentsIntersect(
  a: WorldPoint,
  b: WorldPoint,
  c: WorldPoint,
  d: WorldPoint,
): boolean {
  const abC = direction(a, b, c);
  const abD = direction(a, b, d);
  const cdA = direction(c, d, a);
  const cdB = direction(c, d, b);
  if (abC * abD < -epsilon && cdA * cdB < -epsilon) return true;
  return (
    (Math.abs(abC) <= epsilon && onSegment(a, b, c)) ||
    (Math.abs(abD) <= epsilon && onSegment(a, b, d)) ||
    (Math.abs(cdA) <= epsilon && onSegment(c, d, a)) ||
    (Math.abs(cdB) <= epsilon && onSegment(c, d, b))
  );
}

function hasSelfIntersection(boundary: readonly WorldPoint[]): boolean {
  for (let first = 0; first < boundary.length; first += 1) {
    const firstEnd = (first + 1) % boundary.length;
    for (let second = first + 1; second < boundary.length; second += 1) {
      const secondEnd = (second + 1) % boundary.length;
      const adjacent =
        first === second || firstEnd === second || secondEnd === first;
      if (adjacent) continue;
      if (
        segmentsIntersect(
          boundary[first],
          boundary[firstEnd],
          boundary[second],
          boundary[secondEnd],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function validateOrthogonalBoundary(
  boundary: readonly WorldPoint[],
): readonly BoundaryIssue[] {
  if (boundary.length < 4) {
    return [
      {
        code: 'too_few_points',
        message: 'A room boundary needs at least four corners.',
      },
    ];
  }
  if (boundary.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    return [
      {
        code: 'non_finite_point',
        message: 'Every room corner must use finite coordinates.',
      },
    ];
  }

  const issues: BoundaryIssue[] = [];
  for (let index = 0; index < boundary.length; index += 1) {
    const point = boundary[index];
    const next = boundary[(index + 1) % boundary.length];
    if (distance(point, next) < MIN_WALL_LENGTH_METERS - epsilon) {
      issues.push({
        code: 'wall_too_short',
        message: `Wall ${index + 1} must be at least ${MIN_WALL_LENGTH_METERS} meters.`,
        wallIndex: index,
      });
    }
    const horizontal = Math.abs(point.y - next.y) <= epsilon;
    const vertical = Math.abs(point.x - next.x) <= epsilon;
    if (!horizontal && !vertical) {
      issues.push({
        code: 'non_orthogonal_wall',
        message: `Wall ${index + 1} must remain horizontal or vertical.`,
        wallIndex: index,
      });
    }
  }
  if (hasSelfIntersection(boundary)) {
    issues.push({
      code: 'self_intersection',
      message: 'Room walls cannot cross or overlap.',
    });
  }
  if (Math.abs(signedArea(boundary)) < MIN_ROOM_AREA_SQUARE_METERS) {
    issues.push({
      code: 'room_too_small',
      message: `Room area must be at least ${MIN_ROOM_AREA_SQUARE_METERS} square meters.`,
    });
  }
  return issues;
}

function snapped(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    throw new RangeError(
      'snap values must be finite and step must be positive',
    );
  }
  return Number((Math.round(value / step) * step).toFixed(6));
}

function editResult(boundary: readonly WorldPoint[]): BoundaryEditResult {
  const issues = validateOrthogonalBoundary(boundary);
  return issues.length ? { ok: false, issues } : { ok: true, boundary };
}

export function moveOrthogonalCorner(
  boundary: readonly WorldPoint[],
  cornerIndex: number,
  target: WorldPoint,
  snapStepMeters = 0.1,
): BoundaryEditResult {
  if (!Number.isInteger(cornerIndex) || !boundary[cornerIndex]) {
    throw new RangeError('corner index must reference the boundary');
  }
  const moved = boundary.map((point) => ({ ...point }));
  const previousIndex = (cornerIndex - 1 + moved.length) % moved.length;
  const nextIndex = (cornerIndex + 1) % moved.length;
  const current = moved[cornerIndex];
  const x = snapped(target.x, snapStepMeters);
  const y = snapped(target.y, snapStepMeters);

  if (Math.abs(moved[previousIndex].x - current.x) <= epsilon) {
    moved[previousIndex].x = x;
  } else {
    moved[previousIndex].y = y;
  }
  if (Math.abs(moved[nextIndex].x - current.x) <= epsilon) {
    moved[nextIndex].x = x;
  } else {
    moved[nextIndex].y = y;
  }
  moved[cornerIndex] = { x, y };
  return editResult(moved);
}

export function moveOrthogonalWall(
  boundary: readonly WorldPoint[],
  wallIndex: number,
  coordinate: number,
  snapStepMeters = 0.1,
): BoundaryEditResult {
  if (!Number.isInteger(wallIndex) || !boundary[wallIndex]) {
    throw new RangeError('wall index must reference the boundary');
  }
  const moved = boundary.map((point) => ({ ...point }));
  const nextIndex = (wallIndex + 1) % moved.length;
  const value = snapped(coordinate, snapStepMeters);
  const horizontal =
    Math.abs(moved[wallIndex].y - moved[nextIndex].y) <= epsilon;
  if (horizontal) {
    moved[wallIndex].y = value;
    moved[nextIndex].y = value;
  } else {
    moved[wallIndex].x = value;
    moved[nextIndex].x = value;
  }
  return editResult(moved);
}
