import { CHROMALUM_GRB_WEIGHTS, CHROMALUM_TONE_DENOMINATOR } from "./chromalum-color-model";

/**
 * Lossy input-side score for gamma-encoded sRGB bytes.
 *
 * This is deliberately not an inverse of the canonical CHROMALUM coordinate
 * model and is not perceptual lightness or photometric luminance. It is only
 * the import/analysis heuristic that applies the model's 4:2:1 channel weights
 * directly to sRGB code values.
 */
const SRGB_SCORE_R = CHROMALUM_GRB_WEIGHTS.R / CHROMALUM_TONE_DENOMINATOR;
const SRGB_SCORE_G = CHROMALUM_GRB_WEIGHTS.G / CHROMALUM_TONE_DENOMINATOR;
const SRGB_SCORE_B = CHROMALUM_GRB_WEIGHTS.B / CHROMALUM_TONE_DENOMINATOR;

function clampByteNorm(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value / 255)) : 0;
}

export function srgbCodeGrbScoreNorm(r: number, g: number, b: number): number {
  return SRGB_SCORE_R * clampByteNorm(r) + SRGB_SCORE_G * clampByteNorm(g) + SRGB_SCORE_B * clampByteNorm(b);
}

export function srgbCodeGrbScore8(r: number, g: number, b: number): number {
  return Math.round(255 * srgbCodeGrbScoreNorm(r, g, b));
}

/** Estimate an L0..L7 label from sRGB code values for image import. */
export function estimateLevelFromSrgbBytes(r: number, g: number, b: number): number {
  // Quantize the continuous score directly. Rounding through an intermediate
  // 8-bit score shifts some half-step boundaries by one or more code values.
  return Math.round(CHROMALUM_TONE_DENOMINATOR * srgbCodeGrbScoreNorm(r, g, b));
}
