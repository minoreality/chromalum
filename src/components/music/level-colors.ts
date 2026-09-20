import { CHROMALUM_LEVEL_HEX } from "../../chromalum-color-model";
import type { ActiveMusicLevel } from "../../music/types";
import { rgbStr } from "../../utils";

/**
 * Fill colour for a level drawn in a Music figure: the live rgb of a
 * sounding level when it is active, else the level's canonical hex.
 * Every Music figure reads this one function so the eight colours cannot
 * drift apart between cards.
 */
export function pointColor(lv: number, activeLevels: readonly ActiveMusicLevel[]): string {
  const active = activeLevels.find((level) => level.levelIndex === lv);
  return active ? rgbStr(active.rgb) : (CHROMALUM_LEVEL_HEX[lv] ?? "#888");
}
