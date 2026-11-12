/**
 * The API sends percentages as fractions (0.6 = 60 %, like the backend `Percentage`);
 * forms show and edit them as percentages. Both conversions round away float noise.
 */

/** 0.025 → 2.5 (two decimals). */
export function toPercent(fraction: number): number {
  return Math.round(fraction * 10000) / 100;
}

/** 2.5 → 0.025 (four decimals, the backend's precision). */
export function toFraction(percent: number): number {
  return Math.round(percent * 100) / 10000;
}
