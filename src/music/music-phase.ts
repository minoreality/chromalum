const DEG_TO_RAD = Math.PI / 180;

/** Normalize a hue/phase angle to the application's clockwise 0..360° wheel. */
export function normalizeHueAngleDeg(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360;
}

/**
 * Canonical Music angle: hue and phase are both clockwise-positive from 12
 * o'clock, so applying phase is ordinary angular addition.
 */
export function liveHueAngleDeg(hueAngleDeg: number, alphaDeg: number): number {
  return normalizeHueAngleDeg(hueAngleDeg + alphaDeg);
}

/** Radians used by the SVG screen coordinate convention (0° is 12 o'clock). */
export function hueScreenRadians(hueAngleDeg: number, alphaDeg: number): number {
  return (liveHueAngleDeg(hueAngleDeg, alphaDeg) - 90) * DEG_TO_RAD;
}

/** Unit screen vector for a hue/phase pair; x right and y down. */
export function hueScreenUnit(hueAngleDeg: number, alphaDeg: number): { x: number; y: number } {
  const radians = hueScreenRadians(hueAngleDeg, alphaDeg);
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

/** Stereo position matching the dot's normalized screen-x coordinate. */
export function hueStereoPan(hueAngleDeg: number, alphaDeg: number): number {
  return hueScreenUnit(hueAngleDeg, alphaDeg).x;
}

/** Sum of equal-radius L0 hue and L7 complementary-hue screen vectors. */
export function complementPairScreenUnit(hueAngleDeg: number, alpha0: number, alpha7: number): { x: number; y: number } {
  const fromL0 = hueScreenUnit(hueAngleDeg, alpha0);
  const fromL7 = hueScreenUnit(hueAngleDeg + 180, alpha7);
  return { x: fromL0.x + fromL7.x, y: fromL0.y + fromL7.y };
}

/** Normalized magnitude of the displayed complementary-vector sum. */
export function complementPhaseFactor(alpha0: number, alpha7: number): number {
  const sum = complementPairScreenUnit(0, alpha0, alpha7);
  return Math.min(1, Math.hypot(sum.x, sum.y) / 2);
}
