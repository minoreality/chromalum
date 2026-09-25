export const COLORS = [
  { name: "K", hex: "#000000" },
  { name: "B", hex: "#0000ff" },
  { name: "R", hex: "#ff0000" },
  { name: "M", hex: "#ff00ff" },
  { name: "G", hex: "#00ff00" },
  { name: "C", hex: "#00ffff" },
  { name: "Y", hex: "#ffff00" },
  { name: "W", hex: "#ffffff" },
] as const;

export const MODES = {
  or: { operator: "OR", symbol: "∨", dual: "AND", dualSymbol: "∧", initial: { a: 4, b: 2, c: 1 } },
  and: { operator: "AND", symbol: "∧", dual: "OR", dualSymbol: "∨", initial: { a: 3, b: 5, c: 6 } },
} as const;

export type Operation = keyof typeof MODES;
export type Arity = 2 | 3;
export const INPUT_LABELS = ["a", "b", "c"] as const;
export type InputLabel = (typeof INPUT_LABELS)[number];
export type SignalInput = { label: InputLabel; value: number };
export const bits = (level: number) => level.toString(2).padStart(3, "0");
export const name = (level: number) => COLORS[level].name;

export function evaluate(operation: Operation, inputs: readonly SignalInput[]) {
  const values = inputs.map(({ value }) => value);
  const combine = (op: Operation, operands: number[]) =>
    operands.reduce((result, value) => (op === "or" ? result | value : result & value), op === "or" ? 0 : 7);
  const combined = combine(operation, values);
  const complements = values.map((value) => value ^ 7);
  return { combined, complements, left: combined ^ 7, right: combine(operation === "or" ? "and" : "or", complements) };
}
