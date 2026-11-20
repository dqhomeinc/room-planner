import { describe, expect, it } from 'vitest';
import {
  boundaryHistoryReducer,
  createBoundaryHistory,
  MAX_BOUNDARY_HISTORY,
} from './boundary-history';

const rectangle = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 4 },
];
const wider = rectangle.map((point) => ({
  ...point,
  x: point.x === 5 ? 6 : point.x,
}));

describe('boundary history', () => {
  it('applies, undoes, and redoes boundary edits', () => {
    const initial = createBoundaryHistory(rectangle);
    const applied = boundaryHistoryReducer(initial, {
      type: 'apply',
      boundary: wider,
    });
    const undone = boundaryHistoryReducer(applied, { type: 'undo' });
    const redone = boundaryHistoryReducer(undone, { type: 'redo' });

    expect(applied.present).toEqual(wider);
    expect(undone.present).toEqual(rectangle);
    expect(redone.present).toEqual(wider);
  });

  it('clears redo entries when a new edit is applied', () => {
    const applied = boundaryHistoryReducer(createBoundaryHistory(rectangle), {
      type: 'apply',
      boundary: wider,
    });
    const undone = boundaryHistoryReducer(applied, { type: 'undo' });
    const replacement = rectangle.map((point) => ({
      ...point,
      y: point.y + 1,
    }));
    const changed = boundaryHistoryReducer(undone, {
      type: 'apply',
      boundary: replacement,
    });

    expect(changed.future).toEqual([]);
    expect(boundaryHistoryReducer(changed, { type: 'redo' })).toBe(changed);
  });

  it('ignores no-op edits and unavailable history actions', () => {
    const initial = createBoundaryHistory(rectangle);

    expect(
      boundaryHistoryReducer(initial, { type: 'apply', boundary: rectangle }),
    ).toBe(initial);
    expect(boundaryHistoryReducer(initial, { type: 'undo' })).toBe(initial);
    expect(boundaryHistoryReducer(initial, { type: 'redo' })).toBe(initial);
  });

  it('resets history around a new confirmed shape', () => {
    const applied = boundaryHistoryReducer(createBoundaryHistory(rectangle), {
      type: 'apply',
      boundary: wider,
    });
    const reset = boundaryHistoryReducer(applied, {
      type: 'reset',
      boundary: rectangle,
    });

    expect(reset).toEqual({ past: [], present: rectangle, future: [] });
  });

  it('caps history and does not retain caller-owned point objects', () => {
    let history = createBoundaryHistory(rectangle);
    for (let index = 1; index <= MAX_BOUNDARY_HISTORY + 5; index += 1) {
      history = boundaryHistoryReducer(history, {
        type: 'apply',
        boundary: rectangle.map((point) => ({ ...point, x: point.x + index })),
      });
    }

    expect(history.past).toHaveLength(MAX_BOUNDARY_HISTORY);
    expect(history.present).not.toBe(rectangle);
    expect(history.present[0]).not.toBe(rectangle[0]);
  });
});
