import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { moveOrthogonalCorner } from './room-boundary';
import {
  boundsFromPoints,
  chooseGridStepMeters,
  createRoomViewport,
  RoomViewportInputError,
  screenToWorld,
  worldToScreen,
  type WorldPoint,
} from './room-viewport';

const surfaceSize = { width: 600, height: 420 };

export type RoomGeometryProvenance = 'sample' | 'inferred' | 'validated';

const provenanceLabels: Record<RoomGeometryProvenance, string> = {
  sample: 'Illustrative sample',
  inferred: 'Inferred geometry — review required',
  validated: 'User-validated room',
};

type RoomPlanSurfaceProps = Readonly<{
  boundary: readonly WorldPoint[];
  provenance: RoomGeometryProvenance;
  label?: string;
  editable?: boolean;
  onBoundaryChange?: (boundary: readonly WorldPoint[]) => void;
  onEditIssue?: (message?: string) => void;
}>;

function valuesBetween(minimum: number, maximum: number, step: number) {
  const firstIndex = Math.ceil(minimum / step);
  const lastIndex = Math.floor(maximum / step + 1e-9);
  return Array.from(
    { length: Math.max(0, lastIndex - firstIndex + 1) },
    (_, offset) => {
      const index = firstIndex + offset;
      return { index, value: index * step };
    },
  );
}

export function RoomPlanSurface({
  boundary,
  provenance,
  label = 'Room floor plan',
  editable = false,
  onBoundaryChange,
  onEditIssue,
}: RoomPlanSurfaceProps) {
  const clipPathId = `room-boundary-${useId().replace(/:/g, '')}`;
  const [draggingCorner, setDraggingCorner] = useState<number>();
  const canEdit = editable && Boolean(onBoundaryChange);

  try {
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

    function moveCorner(index: number, target: WorldPoint) {
      const result = moveOrthogonalCorner(boundary, index, target);
      if (!result.ok) {
        onEditIssue?.(result.issues[0]?.message ?? 'This edit is not valid.');
        return;
      }
      onEditIssue?.(undefined);
      onBoundaryChange?.(result.boundary);
    }

    function pointerTarget(event: PointerEvent<SVGCircleElement>) {
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return undefined;
      const rectangle = svg.getBoundingClientRect();
      return screenToWorld(viewport, {
        x:
          ((event.clientX - rectangle.left) / rectangle.width) *
          surfaceSize.width,
        y:
          ((event.clientY - rectangle.top) / rectangle.height) *
          surfaceSize.height,
      });
    }

    function handleCornerKey(
      event: KeyboardEvent<SVGCircleElement>,
      index: number,
    ) {
      const movement = event.shiftKey ? 0.5 : 0.1;
      const offsets: Record<string, WorldPoint> = {
        ArrowLeft: { x: -movement, y: 0 },
        ArrowRight: { x: movement, y: 0 },
        ArrowDown: { x: 0, y: -movement },
        ArrowUp: { x: 0, y: movement },
      };
      const offset = offsets[event.key];
      if (!offset) return;
      event.preventDefault();
      moveCorner(index, {
        x: boundary[index].x + offset.x,
        y: boundary[index].y + offset.y,
      });
    }

    return (
      <figure className={`room-plan${canEdit ? ' is-editable' : ''}`}>
        <svg
          viewBox={`0 0 ${surfaceSize.width} ${surfaceSize.height}`}
          role={canEdit ? 'group' : 'img'}
          aria-label={label}
        >
          <defs>
            <clipPath id={clipPathId}>
              <polygon points={roomPoints} />
            </clipPath>
          </defs>
          <polygon className="plan-floor" points={roomPoints} />
          <g
            className="plan-grid"
            clipPath={`url(#${clipPathId})`}
            aria-hidden="true"
          >
            {verticalLines.map(({ index, value: x }) => {
              const start = worldToScreen(viewport, { x, y: bounds.minY });
              const end = worldToScreen(viewport, { x, y: bounds.maxY });
              return (
                <line
                  key={`x-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
              );
            })}
            {horizontalLines.map(({ index, value: y }) => {
              const start = worldToScreen(viewport, { x: bounds.minX, y });
              const end = worldToScreen(viewport, { x: bounds.maxX, y });
              return (
                <line
                  key={`y-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
              );
            })}
          </g>
          <polygon className="plan-outline" points={roomPoints} />
          {canEdit && (
            <g className="plan-corners">
              {boundary.map((point, index) => {
                const screen = worldToScreen(viewport, point);
                return (
                  <circle
                    key={index}
                    cx={screen.x}
                    cy={screen.y}
                    r="16"
                    role="button"
                    tabIndex={0}
                    aria-label={`Move corner ${index + 1}`}
                    onKeyDown={(event) => handleCornerKey(event, index)}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraggingCorner(index);
                    }}
                    onPointerMove={(event) => {
                      if (draggingCorner !== index) return;
                      const target = pointerTarget(event);
                      if (target) moveCorner(index, target);
                    }}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                      setDraggingCorner(undefined);
                    }}
                    onPointerCancel={() => setDraggingCorner(undefined)}
                  />
                );
              })}
            </g>
          )}
          <g className="plan-dimensions" aria-hidden="true">
            <text
              x={(lowerLeft.x + lowerRight.x) / 2}
              y={lowerLeft.y + 32}
              textAnchor="middle"
            >
              {widthMeters.toFixed(1)} m overall
            </text>
            <text
              x={upperLeft.x - 30}
              y={(upperLeft.y + lowerLeft.y) / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${upperLeft.x - 30} ${(upperLeft.y + lowerLeft.y) / 2})`}
            >
              {heightMeters.toFixed(1)} m overall
            </text>
          </g>
        </svg>
        <figcaption>
          <span>{provenanceLabels[provenance]}</span>
          Overall extents: {widthMeters.toFixed(1)} × {heightMeters.toFixed(1)}{' '}
          meters
        </figcaption>
      </figure>
    );
  } catch (error) {
    if (!(error instanceof RoomViewportInputError)) throw error;
    return (
      <figure className="room-plan">
        <div className="room-plan-fallback" role="status">
          <strong>Room preview unavailable</strong>
          <span>Review the room geometry before planning furniture.</span>
        </div>
        <figcaption>Geometry needs review</figcaption>
      </figure>
    );
  }
}
