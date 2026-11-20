import type { WorldPoint } from './room-viewport';

export type BoundaryMeasurement = Readonly<{
  nodeIndex: number;
  wallLengthMeters: number;
  interiorAngleDegrees: number;
}>;

const minimumVectorLength = 1e-9;

function signedArea(boundary: readonly WorldPoint[]): number {
  return (
    boundary.reduce((sum, point, index) => {
      const next = boundary[(index + 1) % boundary.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

export function measureBoundary(
  boundary: readonly WorldPoint[],
): readonly BoundaryMeasurement[] {
  if (boundary.length < 3) {
    throw new RangeError('boundary measurements need at least three nodes');
  }
  if (boundary.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new RangeError('boundary measurements need finite coordinates');
  }

  const area = signedArea(boundary);
  if (Math.abs(area) < minimumVectorLength) {
    throw new RangeError('boundary measurements need a non-zero area');
  }
  const orientation = Math.sign(area);

  return boundary.map((current, nodeIndex) => {
    const previous =
      boundary[(nodeIndex - 1 + boundary.length) % boundary.length];
    const next = boundary[(nodeIndex + 1) % boundary.length];
    const incoming = { x: current.x - previous.x, y: current.y - previous.y };
    const outgoing = { x: next.x - current.x, y: next.y - current.y };
    const incomingLength = Math.hypot(incoming.x, incoming.y);
    const wallLengthMeters = Math.hypot(outgoing.x, outgoing.y);
    if (
      incomingLength < minimumVectorLength ||
      wallLengthMeters < minimumVectorLength
    ) {
      throw new RangeError('boundary measurements need non-zero wall lengths');
    }

    const turn = Math.atan2(
      incoming.x * outgoing.y - incoming.y * outgoing.x,
      incoming.x * outgoing.x + incoming.y * outgoing.y,
    );
    let interiorAngle = Math.PI - orientation * turn;
    if (interiorAngle <= 0) interiorAngle += Math.PI * 2;
    if (interiorAngle > Math.PI * 2) interiorAngle -= Math.PI * 2;

    return {
      nodeIndex,
      wallLengthMeters,
      interiorAngleDegrees: (interiorAngle * 180) / Math.PI,
    };
  });
}
