import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoomDimensionForm } from './room-dimension-form';

describe('room dimension form', () => {
  it('starts with metric controls and an honestly labelled sample', () => {
    const markup = renderToStaticMarkup(<RoomDimensionForm />);

    expect(markup).toContain('Enter your room dimensions.');
    expect(markup).toMatch(/name="dimension-unit" checked="" value="meters"/);
    expect(markup).toContain('Width in meters');
    expect(markup).toContain('Length in meters');
    expect(markup).toContain('Confirm these dimensions');
    expect(markup).toContain('Illustrative sample');
    expect(markup).toContain('illustrative sample until you confirm');
  });

  it('offers feet and inches without claiming they are canonical storage', () => {
    const markup = renderToStaticMarkup(<RoomDimensionForm />);

    expect(markup).toContain('value="feet_inches"');
    expect(markup).toContain('Feet &amp; inches');
    expect(markup).toContain('Values are stored in meters.');
  });
});
