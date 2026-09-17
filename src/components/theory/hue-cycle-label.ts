/**
 * How the chromatic six-cycle writes an edge's rank difference, and what it
 * calls itself, both of which follow how much of a traversal the reader has
 * fixed. The hexagon and the table beneath it read from here so the two cannot
 * drift: a theory e2e check compares the label on the selected edge against the
 * one in the selected row.
 */

/** C: nothing chosen · B: a start state chosen · A: an edge being traversed. */
export type HueCycleStage = "none" | "start" | "edge";

export function hueCycleStage(currentLevel: number | null | undefined, selectedEdge: number | null | undefined): HueCycleStage {
  if (selectedEdge !== null && selectedEdge !== undefined) return "edge";
  return currentLevel === null || currentLevel === undefined ? "none" : "start";
}

export const HUE_CYCLE_NAME: Readonly<Record<HueCycleStage, string>> = {
  none: "C-cycle",
  start: "B-cycle",
  edge: "A-cycle",
};

/** A true minus sign, not a hyphen, to match the plus it pairs with. */
const MINUS = "−";

/**
 * With nothing chosen an edge has no direction, so only the magnitude is
 * defined and it is written as one. A chosen start makes a change something to
 * speak of, so the edges carry Δ. Traversing fixes a direction: the edge taken
 * carries its own sign, and the rest carry the sign they could take.
 */
export function hueCycleDeltaLabel(signedDelta: number, stage: HueCycleStage, traversed: boolean): string {
  const magnitude = Math.abs(signedDelta);
  if (traversed) return `${signedDelta > 0 ? "+" : MINUS}${magnitude}`;
  if (stage === "edge") return `±${magnitude}`;
  if (stage === "start") return `Δ${magnitude}`;
  return `|${magnitude}|`;
}

/** The same distinction spoken rather than drawn, for assistive technology. */
export function hueCycleDeltaDescription(signedDelta: number, stage: HueCycleStage, traversed: boolean): string {
  const magnitude = Math.abs(signedDelta);
  if (traversed) return `ΔL = ${signedDelta > 0 ? "+" : MINUS}${magnitude}`;
  if (stage === "edge") return `ΔL = ±${magnitude}`;
  if (stage === "start") return `ΔL = ${magnitude}`;
  return `|ΔL| = ${magnitude}`;
}
