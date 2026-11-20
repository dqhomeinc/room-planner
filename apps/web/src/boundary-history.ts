import type { WorldPoint } from './room-viewport';

export const MAX_BOUNDARY_HISTORY = 50;

export type BoundaryHistory = Readonly<{
  past: readonly (readonly WorldPoint[])[];
  present: readonly WorldPoint[];
  future: readonly (readonly WorldPoint[])[];
}>;

export type BoundaryHistoryAction =
  | Readonly<{ type: 'apply'; boundary: readonly WorldPoint[] }>
  | Readonly<{ type: 'undo' }>
  | Readonly<{ type: 'redo' }>
  | Readonly<{ type: 'reset'; boundary: readonly WorldPoint[] }>;

function copyBoundary(boundary: readonly WorldPoint[]): readonly WorldPoint[] {
  return boundary.map(({ x, y }) => ({ x, y }));
}

function boundariesMatch(
  first: readonly WorldPoint[],
  second: readonly WorldPoint[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (point, index) =>
        point.x === second[index].x && point.y === second[index].y,
    )
  );
}

export function createBoundaryHistory(
  boundary: readonly WorldPoint[],
): BoundaryHistory {
  return { past: [], present: copyBoundary(boundary), future: [] };
}

export function boundaryHistoryReducer(
  state: BoundaryHistory,
  action: BoundaryHistoryAction,
): BoundaryHistory {
  if (action.type === 'reset') return createBoundaryHistory(action.boundary);
  if (action.type === 'apply') {
    if (boundariesMatch(state.present, action.boundary)) return state;
    return {
      past: [...state.past, copyBoundary(state.present)].slice(
        -MAX_BOUNDARY_HISTORY,
      ),
      present: copyBoundary(action.boundary),
      future: [],
    };
  }
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: copyBoundary(previous),
      future: [copyBoundary(state.present), ...state.future],
    };
  }

  const next = state.future[0];
  if (!next) return state;
  return {
    past: [...state.past, copyBoundary(state.present)],
    present: copyBoundary(next),
    future: state.future.slice(1),
  };
}
