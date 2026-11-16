export type WorldPoint = Readonly<{ x: number; y: number }>;
export type ScreenPoint = Readonly<{ x: number; y: number }>;

export type WorldBounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

export type ViewportSize = Readonly<{ width: number; height: number }>;

export type RoomViewport = Readonly<{
  bounds: WorldBounds;
  size: ViewportSize;
  padding: number;
  pixelsPerMeter: number;
  offsetX: number;
  offsetY: number;
}>;

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function requirePositive(name: string, value: number): void {
  requireFinite(name, value);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
}

export function boundsFromPoints(points: readonly WorldPoint[]): WorldBounds {
  if (points.length < 3) {
    throw new RangeError('at least three world points are required');
  }

  for (const point of points) {
    requireFinite('point.x', point.x);
    requireFinite('point.y', point.y);
  }

  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const bounds = {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
  requirePositive('world width', bounds.maxX - bounds.minX);
  requirePositive('world height', bounds.maxY - bounds.minY);
  return bounds;
}

export function createRoomViewport(
  bounds: WorldBounds,
  size: ViewportSize,
  padding = 24,
): RoomViewport {
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  requirePositive('world width', worldWidth);
  requirePositive('world height', worldHeight);
  requirePositive('viewport width', size.width);
  requirePositive('viewport height', size.height);
  requireFinite('padding', padding);
  if (padding < 0) throw new RangeError('padding cannot be negative');

  const drawableWidth = size.width - padding * 2;
  const drawableHeight = size.height - padding * 2;
  requirePositive('drawable width', drawableWidth);
  requirePositive('drawable height', drawableHeight);
  const pixelsPerMeter = Math.min(
    drawableWidth / worldWidth,
    drawableHeight / worldHeight,
  );
  const renderedWidth = worldWidth * pixelsPerMeter;
  const renderedHeight = worldHeight * pixelsPerMeter;

  return {
    bounds,
    size,
    padding,
    pixelsPerMeter,
    offsetX: (size.width - renderedWidth) / 2,
    offsetY: (size.height - renderedHeight) / 2,
  };
}

export function worldToScreen(
  viewport: RoomViewport,
  point: WorldPoint,
): ScreenPoint {
  return {
    x:
      viewport.offsetX +
      (point.x - viewport.bounds.minX) * viewport.pixelsPerMeter,
    y:
      viewport.size.height -
      viewport.offsetY -
      (point.y - viewport.bounds.minY) * viewport.pixelsPerMeter,
  };
}

export function screenToWorld(
  viewport: RoomViewport,
  point: ScreenPoint,
): WorldPoint {
  return {
    x:
      viewport.bounds.minX +
      (point.x - viewport.offsetX) / viewport.pixelsPerMeter,
    y:
      viewport.bounds.minY +
      (viewport.size.height - viewport.offsetY - point.y) /
        viewport.pixelsPerMeter,
  };
}

export function chooseGridStepMeters(
  pixelsPerMeter: number,
  minimumPixels = 28,
): number {
  requirePositive('pixels per meter', pixelsPerMeter);
  requirePositive('minimum grid spacing', minimumPixels);
  const minimumMeters = minimumPixels / pixelsPerMeter;
  const magnitude = 10 ** Math.floor(Math.log10(minimumMeters));
  return (
    [1, 2, 5, 10].find((multiple) => multiple * magnitude >= minimumMeters)! *
    magnitude
  );
}
