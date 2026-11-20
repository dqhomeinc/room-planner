export const METERS_PER_FOOT = 0.3048;
export const METERS_PER_INCH = 0.0254;
export const MIN_ROOM_DIMENSION_METERS = 0.5;
export const MAX_ROOM_DIMENSION_METERS = 30;

export type MetricDimensionInput = Readonly<{
  unit: 'meters';
  meters: string;
}>;

export type ImperialDimensionInput = Readonly<{
  unit: 'feet_inches';
  feet: string;
  inches: string;
}>;

export type DimensionInput = MetricDimensionInput | ImperialDimensionInput;

export type DimensionResult =
  | Readonly<{ ok: true; meters: number }>
  | Readonly<{ ok: false; message: string }>;

export type RoomDimensionsResult =
  | Readonly<{
      ok: true;
      widthMeters: number;
      lengthMeters: number;
    }>
  | Readonly<{
      ok: false;
      errors: Readonly<{ width?: string; length?: string }>;
    }>;

const decimalPattern = /^-?(?:\d+|\d*\.\d+)$/;
const wholeNumberPattern = /^\d+$/;

function roundedMeters(value: number): number {
  return Number(value.toFixed(4));
}

function validateMeters(value: number): DimensionResult {
  if (value < MIN_ROOM_DIMENSION_METERS) {
    return {
      ok: false,
      message: `Use at least ${MIN_ROOM_DIMENSION_METERS} meters.`,
    };
  }
  if (value > MAX_ROOM_DIMENSION_METERS) {
    return {
      ok: false,
      message: `Use no more than ${MAX_ROOM_DIMENSION_METERS} meters.`,
    };
  }
  return { ok: true, meters: roundedMeters(value) };
}

export function parseDimension(input: DimensionInput): DimensionResult {
  if (input.unit === 'meters') {
    const raw = input.meters.trim();
    if (!raw) return { ok: false, message: 'Enter a dimension.' };
    if (!decimalPattern.test(raw)) {
      return { ok: false, message: 'Use a decimal number without units.' };
    }
    return validateMeters(Number(raw));
  }

  const feet = input.feet.trim();
  const inches = input.inches.trim();
  if (!feet) return { ok: false, message: 'Enter the number of feet.' };
  if (!wholeNumberPattern.test(feet)) {
    return { ok: false, message: 'Feet must be a whole number.' };
  }
  if (inches && !decimalPattern.test(inches)) {
    return { ok: false, message: 'Inches must be a decimal number.' };
  }

  const inchValue = inches ? Number(inches) : 0;
  if (inchValue < 0 || inchValue >= 12) {
    return { ok: false, message: 'Inches must be from 0 up to 11.99.' };
  }
  const meters = Number(feet) * METERS_PER_FOOT + inchValue * METERS_PER_INCH;
  return validateMeters(meters);
}

export function parseRoomDimensions(
  width: DimensionInput,
  length: DimensionInput,
): RoomDimensionsResult {
  const parsedWidth = parseDimension(width);
  const parsedLength = parseDimension(length);
  if (parsedWidth.ok && parsedLength.ok) {
    return {
      ok: true,
      widthMeters: parsedWidth.meters,
      lengthMeters: parsedLength.meters,
    };
  }
  return {
    ok: false,
    errors: {
      ...(!parsedWidth.ok && { width: parsedWidth.message }),
      ...(!parsedLength.ok && { length: parsedLength.message }),
    },
  };
}

export function metersToDimensionInput(
  meters: number,
  unit: DimensionInput['unit'],
): DimensionInput {
  if (!Number.isFinite(meters) || meters <= 0) {
    throw new RangeError('meters must be finite and greater than zero');
  }
  if (unit === 'meters') {
    return { unit, meters: String(Number(meters.toFixed(3))) };
  }

  const totalInches = meters / METERS_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Number((totalInches - feet * 12).toFixed(1));
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { unit, feet: String(feet), inches: String(inches) };
}
