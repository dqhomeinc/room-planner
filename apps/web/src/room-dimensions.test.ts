import { describe, expect, it } from 'vitest';
import {
  metersToDimensionInput,
  parseDimension,
  parseRoomDimensions,
} from './room-dimensions';

describe('room dimensions', () => {
  it('parses metric input and keeps meters canonical', () => {
    expect(parseDimension({ unit: 'meters', meters: ' 4.25 ' })).toEqual({
      ok: true,
      meters: 4.25,
    });
  });

  it('converts feet and inches to meters at the input edge', () => {
    expect(
      parseDimension({ unit: 'feet_inches', feet: '10', inches: '6' }),
    ).toEqual({ ok: true, meters: 3.2004 });
    expect(
      parseDimension({ unit: 'feet_inches', feet: '12', inches: '' }),
    ).toEqual({ ok: true, meters: 3.6576 });
  });

  it.each([
    [{ unit: 'meters', meters: '' } as const, 'Enter a dimension.'],
    [
      { unit: 'meters', meters: '4e2' } as const,
      'Use a decimal number without units.',
    ],
    [
      { unit: 'feet_inches', feet: '10.5', inches: '0' } as const,
      'Feet must be a whole number.',
    ],
    [
      { unit: 'feet_inches', feet: '10', inches: '12' } as const,
      'Inches must be from 0 up to 11.99.',
    ],
  ])('rejects malformed input %#', (input, message) => {
    expect(parseDimension(input)).toEqual({ ok: false, message });
  });

  it('enforces practical room limits after conversion', () => {
    expect(parseDimension({ unit: 'meters', meters: '0.49' })).toEqual({
      ok: false,
      message: 'Use at least 0.5 meters.',
    });
    expect(
      parseDimension({ unit: 'feet_inches', feet: '99', inches: '0' }),
    ).toEqual({
      ok: false,
      message: 'Use no more than 30 meters.',
    });
  });

  it('accepts exact room limits and rejects values immediately outside them', () => {
    expect(parseDimension({ unit: 'meters', meters: '0.5' })).toEqual({
      ok: true,
      meters: 0.5,
    });
    expect(parseDimension({ unit: 'meters', meters: '30' })).toEqual({
      ok: true,
      meters: 30,
    });
    expect(parseDimension({ unit: 'meters', meters: '0.49999' }).ok).toBe(
      false,
    );
    expect(parseDimension({ unit: 'meters', meters: '30.00001' }).ok).toBe(
      false,
    );
  });

  it('accepts supported decimal forms and rejects negative values', () => {
    expect(parseDimension({ unit: 'meters', meters: '.5' })).toEqual({
      ok: true,
      meters: 0.5,
    });
    expect(
      parseDimension({ unit: 'feet_inches', feet: '1', inches: '11.99' }).ok,
    ).toBe(true);
    expect(parseDimension({ unit: 'meters', meters: '-1' })).toEqual({
      ok: false,
      message: 'Use at least 0.5 meters.',
    });
    expect(
      parseDimension({ unit: 'feet_inches', feet: '1', inches: '-1' }),
    ).toEqual({
      ok: false,
      message: 'Inches must be from 0 up to 11.99.',
    });
  });

  it('rejects locale decimal commas until locale-aware parsing is supported', () => {
    expect(parseDimension({ unit: 'meters', meters: '4,25' })).toEqual({
      ok: false,
      message: 'Use a decimal number without units.',
    });
  });

  it('returns field-specific room errors together', () => {
    expect(
      parseRoomDimensions(
        { unit: 'meters', meters: '' },
        { unit: 'meters', meters: '31' },
      ),
    ).toEqual({
      ok: false,
      errors: {
        width: 'Enter a dimension.',
        length: 'Use no more than 30 meters.',
      },
    });
  });

  it('returns canonical room dimensions when both fields are valid', () => {
    expect(
      parseRoomDimensions(
        { unit: 'feet_inches', feet: '16', inches: '5' },
        { unit: 'meters', meters: '4' },
      ),
    ).toEqual({ ok: true, widthMeters: 5.0038, lengthMeters: 4 });
  });

  it('formats canonical meters for switching input units', () => {
    expect(metersToDimensionInput(3.2004, 'meters')).toEqual({
      unit: 'meters',
      meters: '3.2004',
    });
    expect(metersToDimensionInput(3.2004, 'feet_inches')).toEqual({
      unit: 'feet_inches',
      feet: '10',
      inches: '6',
    });
  });

  it('round-trips canonical meters through imperial display input', () => {
    for (const meters of [0.5, 3, 4.25, 12.3456, 30]) {
      expect(
        parseDimension(metersToDimensionInput(meters, 'feet_inches')),
      ).toEqual({ ok: true, meters });
    }
  });

  it('carries rounded twelve inches into the feet display', () => {
    const almostSixFeet = (5 * 12 + 11.99996) * 0.0254;

    expect(metersToDimensionInput(almostSixFeet, 'feet_inches')).toEqual({
      unit: 'feet_inches',
      feet: '6',
      inches: '0',
    });
  });

  it('rejects invalid canonical values during formatting', () => {
    expect(() => metersToDimensionInput(Number.NaN, 'meters')).toThrow(
      'meters must be finite and greater than zero',
    );
  });
});
