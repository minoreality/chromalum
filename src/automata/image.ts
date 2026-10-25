import type { AutomataImage } from "./state";

/** Stable across reloads so an unchanged source does not replace an edited Flow seed. */
export function getImageKey(image: AutomataImage): string {
  let a = 0x811c9dc5,
    b = 5381;
  for (const value of image.levelData) {
    a = Math.imul(a ^ value, 0x01000193);
    b = Math.imul(b, 33) ^ value;
  }
  return `${image.width}:${image.height}:${a >>> 0}:${b >>> 0}`;
}
