import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoomBoundaryTools } from './room-boundary-tools';

const boundary = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 4 },
];

describe('room boundary tools', () => {
  it('shows exact wall lengths and unavailable history actions', () => {
    const markup = renderToStaticMarkup(
      <RoomBoundaryTools
        boundary={boundary}
        canUndo={false}
        canRedo={false}
        onUndo={() => undefined}
        onRedo={() => undefined}
        onBoundaryChange={() => undefined}
        onIssue={() => undefined}
      />,
    );

    expect(markup.match(/length in meters/g)).toHaveLength(4);
    expect(markup).toContain('value="5"');
    expect(markup).toContain('value="4"');
    expect(markup).toContain('<button type="button" disabled="">Undo</button>');
    expect(markup).toContain('<button type="button" disabled="">Redo</button>');
  });
});
