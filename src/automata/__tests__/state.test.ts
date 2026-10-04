import { describe, expect, it } from "vitest";
import { automataReducer, createAutomataState, restoreAutomataState } from "../state";
import { decodeRows, GOLDEN_SEEDS } from "./fixtures/ca-golden";

const saved = () => ({ version: 1, seed: Array<number>(2401).fill(2), preset: "rgb", rule: "life", time: 20, x: 48, y: 0, color: 0 });
describe("Automata state", () => {
  it("opens the editable rosette at the center with green", () => {
    const state = createAutomataState();
    expect([state.rule, state.preset, state.time, state.x, state.y, state.color]).toEqual([4, "rosette", 0, 24, 24, 4]);
    expect(state.seed).toEqual(decodeRows(GOLDEN_SEEDS.rosette));
  });
  it("paints cells without mutating the seed and erases with K", () => {
    const initial = createAutomataState();
    const painted = automataReducer(initial, {
      type: "paint-cells",
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 1.5, y: 0 },
      ],
      color: 7,
    });
    expect([...painted.seed.slice(0, 3)]).toEqual([7, 7, 0]);
    expect(initial.seed[0]).toBe(0);
    expect([painted.x, painted.y]).toEqual([1, 0]);
    const erased = automataReducer(painted, { type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 0 });
    expect([...erased.seed.slice(0, 2)]).toEqual([0, 7]);
    expect(automataReducer(erased, { type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 0 })).toBe(erased);
  });
  it("does not paint results or discard edits when returning to time zero", () => {
    const painted = automataReducer(createAutomataState(), { type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 7 });
    const result = automataReducer(painted, { type: "set-time", time: 20 });
    expect(automataReducer(result, { type: "paint-cells", cells: [{ x: 1, y: 0 }], color: 2 })).toBe(result);
    expect(automataReducer(result, { type: "set-time", time: 0 }).seed).toBe(painted.seed);
  });
  it("selects and changes color without changing the seed, rule or time", () => {
    const initial = { ...createAutomataState(), time: 7 };
    const selected = automataReducer(initial, { type: "select-cell", x: 48, y: 0 });
    const colored = automataReducer(selected, { type: "set-color", color: 0 });
    expect([colored.x, colored.y, colored.time, colored.color, colored.rule]).toEqual([48, 0, 7, 0, 4]);
    expect(colored.seed).toBe(initial.seed);
    expect(automataReducer(colored, { type: "select-cell", x: 49, y: 0 })).toBe(colored);
  });
  it("regenerates any selected preset at time zero while retaining rule and color", () => {
    const edited = automataReducer(
      { ...createAutomataState(), time: 20, rule: "life" as const, color: 1 as const, x: 1, y: 2 },
      { type: "set-preset", preset: "white" },
    );
    expect([edited.time, edited.x, edited.y, edited.rule, edited.color]).toEqual([0, 24, 24, "life", 1]);
    expect(edited.seed).toEqual(decodeRows(GOLDEN_SEEDS.white));
    edited.seed[0] = 7;
    expect(automataReducer(edited, { type: "set-preset", preset: "white" }).seed[0]).toBe(0);
  });
  it("keeps times bounded and refuses fractional selections", () => {
    const initial = createAutomataState();
    expect(automataReducer(initial, { type: "set-time", time: 21 }).time).toBe(20);
    expect(automataReducer(initial, { type: "set-time", time: NaN })).toBe(initial);
    expect(automataReducer(initial, { type: "select-cell", x: 0.5, y: 1 })).toBe(initial);
  });
  it("restores valid zero values", () => {
    const restored = restoreAutomataState({ ...saved(), time: 0, x: 0 });
    expect([restored.time, restored.x, restored.y, restored.color]).toEqual([0, 0, 0, 0]);
    expect(restored.seed).toEqual(new Uint8Array(2401).fill(2));
  });
  it.each([
    ["preset", "wrong", "rosette"],
    ["rule", 90, 4],
    ["time", 1.5, 0],
    ["time", 21, 0],
    ["x", -1, 24],
    ["x", 49, 24],
    ["y", "0", 24],
    ["color", 8, 4],
    ["color", -1, 4],
  ])("defaults invalid %s independently (%s)", (field, value, fallback) => {
    const restored = restoreAutomataState({ ...saved(), [field]: value });
    expect(restored[field as keyof typeof restored]).toEqual(fallback);
    expect(restored.seed).toEqual(new Uint8Array(2401).fill(2));
    if (field !== "rule") expect(restored.rule).toBe("life");
    if (field !== "time") expect(restored.time).toBe(20);
  });
  it.each([null, [], Array(2400).fill(0), Array(2401).fill(8), Array(2401).fill(-1), Array(2401).fill(1.5), new Uint8Array(2401)])(
    "defaults only invalid seeds",
    (seed) => {
      const restored = restoreAutomataState({ ...saved(), seed });
      expect(restored.seed).toEqual(decodeRows(GOLDEN_SEEDS.rosette));
      expect([restored.preset, restored.rule, restored.time, restored.x, restored.y, restored.color]).toEqual([
        "rgb",
        "life",
        20,
        48,
        0,
        0,
      ]);
    },
  );
  it.each([null, {}, [], { ...saved(), version: 2 }, { ...saved(), version: "1" }])("resets unknown formats", (raw) => {
    expect(restoreAutomataState(raw)).toEqual(createAutomataState());
  });
});
