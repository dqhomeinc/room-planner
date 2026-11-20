import { useEffect, useState } from 'react';
import { resizeBoundaryWall } from './room-boundary';
import type { WorldPoint } from './room-viewport';

type RoomBoundaryToolsProps = Readonly<{
  boundary: readonly WorldPoint[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBoundaryChange: (boundary: readonly WorldPoint[]) => void;
  onIssue: (message: string | undefined) => void;
}>;

function wallLength(boundary: readonly WorldPoint[], index: number): number {
  const start = boundary[index];
  const end = boundary[(index + 1) % boundary.length];
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function lengthDrafts(boundary: readonly WorldPoint[]): string[] {
  return boundary.map((_, index) =>
    Number(wallLength(boundary, index).toFixed(2)).toString(),
  );
}

export function RoomBoundaryTools({
  boundary,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBoundaryChange,
  onIssue,
}: RoomBoundaryToolsProps) {
  const [drafts, setDrafts] = useState(() => lengthDrafts(boundary));

  useEffect(() => setDrafts(lengthDrafts(boundary)), [boundary]);

  function applyLength(index: number) {
    const lengthMeters = Number(drafts[index]);
    const result = resizeBoundaryWall(boundary, index, lengthMeters);
    if (!result.ok) {
      onIssue(result.issues[0]?.message ?? 'That wall length is not valid.');
      return;
    }
    onIssue(undefined);
    onBoundaryChange(result.boundary);
  }

  return (
    <section className="boundary-tools" aria-label="Room boundary controls">
      <div className="boundary-history-actions">
        <button type="button" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
      </div>
      <div className="wall-lengths">
        {boundary.map((_, index) => (
          <div className="wall-length" key={index}>
            <label>
              Wall {index + 1} length in meters
              <input
                value={drafts[index] ?? ''}
                inputMode="decimal"
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((value, draftIndex) =>
                      draftIndex === index ? event.target.value : value,
                    ),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyLength(index);
                }}
              />
            </label>
            <button type="button" onClick={() => applyLength(index)}>
              Apply
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
