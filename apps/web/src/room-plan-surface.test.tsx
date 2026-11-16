import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoomPlanSurface } from './room-plan-surface';

const boundary = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 4 },
];

describe('room plan surface', () => {
  it('renders an accessible metric floor plan', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface boundary={boundary} label="Living room floor plan" />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Living room floor plan"');
    expect(markup).toContain('<polygon');
    expect(markup).toContain('5.0 × 4.0 meters');
    expect(markup).toContain('5.0 m');
    expect(markup).toContain('4.0 m');
  });

  it('renders grid lines from the metric viewport scale', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface boundary={boundary} />,
    );

    expect(markup.match(/<line/g)).toHaveLength(20);
    expect(markup).toContain('class="plan-grid"');
  });
});
