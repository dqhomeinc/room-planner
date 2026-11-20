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
      <RoomPlanSurface
        boundary={boundary}
        provenance="sample"
        label="Living room floor plan"
      />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Living room floor plan"');
    expect(markup).toContain('<polygon');
    expect(markup).toContain('Illustrative sample');
    expect(markup).toContain('Overall extents: 5.0 × 4.0 meters');
    expect(markup).toContain('5.0 m overall');
    expect(markup).toContain('4.0 m overall');
  });

  it.each([
    ['sample', 'Illustrative sample'],
    ['inferred', 'Inferred geometry — review required'],
    ['validated', 'User-validated room'],
  ] as const)('labels %s geometry honestly', (provenance, expected) => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface boundary={boundary} provenance={provenance} />,
    );

    expect(markup).toContain(expected);
  });

  it('renders grid lines from the metric viewport scale', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface boundary={boundary} provenance="sample" />,
    );

    expect(markup.match(/<line/g)).toHaveLength(20);
    expect(markup).toContain('class="plan-grid"');
  });

  it('includes every grid edge for decimal steps in a small room', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface
        boundary={[
          { x: 0, y: 0 },
          { x: 0.9, y: 0 },
          { x: 0.9, y: 0.7 },
          { x: 0, y: 0.7 },
        ]}
        provenance="sample"
      />,
    );

    expect(markup.match(/<line/g)).toHaveLength(18);
    expect(markup).toContain('Overall extents: 0.9 × 0.7 meters');
  });

  it('clips the grid and labels overall extents for a non-rectangular room', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface
        boundary={[
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 3 },
          { x: 0, y: 3 },
        ]}
        provenance="validated"
      />,
    );

    expect(markup).toContain('<clipPath');
    expect(markup).toContain('clip-path="url(#room-boundary-');
    expect(markup).toContain('Overall extents: 4.0 × 3.0 meters');
  });

  it('renders a safe review state for invalid geometry', () => {
    const markup = renderToStaticMarkup(
      <RoomPlanSurface
        boundary={[
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ]}
        provenance="validated"
      />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('Room preview unavailable');
    expect(markup).toContain('Geometry needs review');
    expect(markup).not.toContain('User-validated room');
    expect(markup).not.toContain('<svg');
  });

  it('rethrows unexpected rendering errors', () => {
    const unexpected = new Error('unexpected rendering failure');
    const boundaryWithFailure = [
      {
        get x(): number {
          throw unexpected;
        },
        y: 0,
      },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];

    expect(() =>
      renderToStaticMarkup(
        <RoomPlanSurface
          boundary={boundaryWithFailure}
          provenance="inferred"
        />,
      ),
    ).toThrow(unexpected);
  });
});
