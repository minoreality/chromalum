import { describe, expect, it } from "vitest";
import { canvasReducer, createInitialState } from "../canvas-reducer";
import type { AppState } from "../../types";

function stamp(state: AppState, x: number, y: number, level: number, brushSize: number) {
  return canvasReducer(state, { type: "brush_stamp", x, y, level, brushSize });
}

function blank() {
  return canvasReducer(createInitialState(), { type: "new_canvas", width: 8, height: 8 });
}

describe("keyboard brush stamps", () => {
  it("paints the current size-3 brush footprint as one undo step", () => {
    const painted = stamp(blank(), 4, 4, 2, 3);
    const expected = new Uint8Array(64);
    for (const index of [28, 35, 36, 37, 44]) expected[index] = 2;
    expect(painted.canvasData.levelData).toEqual(expected);
    expect(painted.levelHistogram).toEqual([59, 0, 5, 0, 0, 0, 0, 0]);
    expect(painted.undoStack.length).toBe(1);
    const undone = canvasReducer(painted, { type: "undo" });
    expect(undone.canvasData.levelData).toEqual(new Uint8Array(64));
    expect(canvasReducer(undone, { type: "redo" }).canvasData.levelData).toEqual(expected);
  });

  it("uses the latest canvas for consecutive levels at the same point", () => {
    const first = stamp(blank(), 4, 4, 2, 1);
    const second = stamp(first, 4, 4, 5, 1);
    expect(second.canvasData.levelData[36]).toBe(5);
    expect(second.undoStack.length).toBe(2);
    const undone = canvasReducer(second, { type: "undo" });
    expect(undone.canvasData.levelData[36]).toBe(2);
    expect(canvasReducer(undone, { type: "undo" }).canvasData.levelData[36]).toBe(0);
  });

  it("paints level zero and restores its prior level and glaze override on undo", () => {
    const white = stamp(blank(), 4, 4, 7, 1);
    white.canvasData.pixelCandidateOverrideMap[36] = 2;
    const erased = stamp(white, 4, 4, 0, 1);
    expect(erased.canvasData.levelData[36]).toBe(0);
    expect(erased.canvasData.pixelCandidateOverrideMap[36]).toBe(0);
    const undone = canvasReducer(erased, { type: "undo" });
    expect(undone.canvasData.levelData[36]).toBe(7);
    expect(undone.canvasData.pixelCandidateOverrideMap[36]).toBe(2);
  });
});
