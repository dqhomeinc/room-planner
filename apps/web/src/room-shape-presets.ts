import { validateOrthogonalBoundary } from './room-boundary';
import type { WorldPoint } from './room-viewport';

export type RoomShapePreset = 'rectangle' | 'l_shape' | 'alcove';

export type RoomShapeResult =
  | Readonly<{ ok: true; boundary: readonly WorldPoint[] }>
  | Readonly<{ ok: false; message: string }>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function rectangle(width: number, length: number): readonly WorldPoint[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ];
}

function lShape(width: number, length: number): readonly WorldPoint[] {
  const cutoutWidth = clamp(width * 0.35, 0.2, width - 0.2);
  const cutoutDepth = clamp(length * 0.35, 0.2, length - 0.2);
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length - cutoutDepth },
    { x: width - cutoutWidth, y: length - cutoutDepth },
    { x: width - cutoutWidth, y: length },
    { x: 0, y: length },
  ];
}

function alcove(width: number, length: number): readonly WorldPoint[] {
  const alcoveWidth = clamp(width * 0.3, 0.2, width - 0.4);
  const sideWidth = (width - alcoveWidth) / 2;
  const depth = clamp(length * 0.2, 0.2, length - 0.2);
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: sideWidth + alcoveWidth, y: length },
    { x: sideWidth + alcoveWidth, y: length - depth },
    { x: sideWidth, y: length - depth },
    { x: sideWidth, y: length },
    { x: 0, y: length },
  ];
}

export function createRoomShapePreset(
  preset: RoomShapePreset,
  widthMeters: number,
  lengthMeters: number,
): RoomShapeResult {
  if (
    !Number.isFinite(widthMeters) ||
    !Number.isFinite(lengthMeters) ||
    widthMeters <= 0 ||
    lengthMeters <= 0
  ) {
    return {
      ok: false,
      message: 'Room dimensions must be finite and positive.',
    };
  }
  if (preset === 'alcove' && widthMeters < 0.6) {
    return {
      ok: false,
      message: 'An alcove room needs an overall width of at least 0.6 meters.',
    };
  }

  const boundary =
    preset === 'rectangle'
      ? rectangle(widthMeters, lengthMeters)
      : preset === 'l_shape'
        ? lShape(widthMeters, lengthMeters)
        : alcove(widthMeters, lengthMeters);
  const issues = validateOrthogonalBoundary(boundary);
  if (issues.length) {
    return {
      ok: false,
      message: `These dimensions cannot form the selected shape: ${issues[0].message}`,
    };
  }
  return { ok: true, boundary };
}
