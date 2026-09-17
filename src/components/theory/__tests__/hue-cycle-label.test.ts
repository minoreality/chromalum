import { describe, expect, it } from "vitest";
import { HUE_CYCLE_NAME, hueCycleDeltaDescription, hueCycleDeltaLabel, hueCycleStage } from "../hue-cycle-label";

describe("hueCycleStage", () => {
  it("reads the stage off what the reader has fixed", () => {
    expect(hueCycleStage(null, null)).toBe("none");
    expect(hueCycleStage(undefined, undefined)).toBe("none");
    expect(hueCycleStage(2, null)).toBe("start");
    // An edge outranks the start state, and edge 0 is an edge.
    expect(hueCycleStage(2, 3)).toBe("edge");
    expect(hueCycleStage(2, 0)).toBe("edge");
    expect(hueCycleStage(null, 0)).toBe("edge");
  });

  it("names the three stages", () => {
    expect(HUE_CYCLE_NAME[hueCycleStage(null, null)]).toBe("C-cycle");
    expect(HUE_CYCLE_NAME[hueCycleStage(2, null)]).toBe("B-cycle");
    expect(HUE_CYCLE_NAME[hueCycleStage(2, 3)]).toBe("A-cycle");
  });
});

describe("hueCycleDeltaLabel", () => {
  it("writes only a magnitude while no state is chosen", () => {
    expect(hueCycleDeltaLabel(4, "none", false)).toBe("|4|");
    expect(hueCycleDeltaLabel(-4, "none", false)).toBe("|4|");
  });

  it("writes a change once a start state is chosen", () => {
    expect(hueCycleDeltaLabel(4, "start", false)).toBe("Δ4");
    expect(hueCycleDeltaLabel(-1, "start", false)).toBe("Δ1");
  });

  it("writes the sign an untaken edge could take while one is being traversed", () => {
    expect(hueCycleDeltaLabel(2, "edge", false)).toBe("±2");
    expect(hueCycleDeltaLabel(-2, "edge", false)).toBe("±2");
  });

  it("gives the traversed edge its own sign, with a minus sign rather than a hyphen", () => {
    expect(hueCycleDeltaLabel(4, "edge", true)).toBe("+4");
    expect(hueCycleDeltaLabel(-4, "edge", true)).toBe("−4");
    expect(hueCycleDeltaLabel(-4, "edge", true)).not.toContain("-");
  });
});

describe("hueCycleDeltaDescription", () => {
  it("speaks the same distinction the label draws", () => {
    expect(hueCycleDeltaDescription(4, "none", false)).toBe("|ΔL| = 4");
    expect(hueCycleDeltaDescription(4, "start", false)).toBe("ΔL = 4");
    expect(hueCycleDeltaDescription(-2, "edge", false)).toBe("ΔL = ±2");
    expect(hueCycleDeltaDescription(-4, "edge", true)).toBe("ΔL = −4");
  });
});
