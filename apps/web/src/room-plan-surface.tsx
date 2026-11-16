import {
  boundsFromPoints,
  chooseGridStepMeters,
  createRoomViewport,
  worldToScreen,
  type WorldPoint,
} from './room-viewport';

const surfaceSize = { width: 600, height: 420 };

type RoomPlanSurfaceProps = Readonly<{
  boundary: readonly WorldPoint[];
  label?: string;
}>;

function valuesBetween(minimum: number, maximum: number, step: number) {
  const values: number[] = [];
  for (
    let value = Math.ceil(minimum / step) * step;
    value <= maximum;
    value += step
  ) {
    values.push(value);
  }
  return values;
}

export function RoomPlanSurface({
  boundary,
  label = 'Room floor plan',
}: RoomPlanSurfaceProps) {
  const bounds = boundsFromPoints(boundary);
  const viewport = createRoomViewport(bounds, surfaceSize, 56);
  const gridStep = chooseGridStepMeters(viewport.pixelsPerMeter, 36);
  const verticalLines = valuesBetween(bounds.minX, bounds.maxX, gridStep);
  const horizontalLines = valuesBetween(bounds.minY, bounds.maxY, gridStep);
  const roomPoints = boundary
    .map((point) => worldToScreen(viewport, point))
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');
  const lowerLeft = worldToScreen(viewport, {
    x: bounds.minX,
    y: bounds.minY,
  });
  const lowerRight = worldToScreen(viewport, {
    x: bounds.maxX,
    y: bounds.minY,
  });
  const upperLeft = worldToScreen(viewport, {
    x: bounds.minX,
    y: bounds.maxY,
  });
  const widthMeters = bounds.maxX - bounds.minX;
  const heightMeters = bounds.maxY - bounds.minY;

  return (
    <figure className="room-plan">
      <svg
        viewBox={`0 0 ${surfaceSize.width} ${surfaceSize.height}`}
        role="img"
        aria-label={label}
      >
        <polygon className="plan-floor" points={roomPoints} />
        <g className="plan-grid" aria-hidden="true">
          {verticalLines.map((x) => {
            const start = worldToScreen(viewport, { x, y: bounds.minY });
            const end = worldToScreen(viewport, { x, y: bounds.maxY });
            return (
              <line
                key={`x-${x}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
            );
          })}
          {horizontalLines.map((y) => {
            const start = worldToScreen(viewport, { x: bounds.minX, y });
            const end = worldToScreen(viewport, { x: bounds.maxX, y });
            return (
              <line
                key={`y-${y}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
            );
          })}
        </g>
        <polygon className="plan-outline" points={roomPoints} />
        <g className="plan-dimensions" aria-hidden="true">
          <text
            x={(lowerLeft.x + lowerRight.x) / 2}
            y={lowerLeft.y + 32}
            textAnchor="middle"
          >
            {widthMeters.toFixed(1)} m
          </text>
          <text
            x={upperLeft.x - 30}
            y={(upperLeft.y + lowerLeft.y) / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${upperLeft.x - 30} ${(upperLeft.y + lowerLeft.y) / 2})`}
          >
            {heightMeters.toFixed(1)} m
          </text>
        </g>
      </svg>
      <figcaption>
        <span>Measured room</span>
        {widthMeters.toFixed(1)} × {heightMeters.toFixed(1)} meters
      </figcaption>
    </figure>
  );
}
