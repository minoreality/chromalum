export type ColorCubeMixFamily = "rgb" | "cmy";

const RGB_MIX_INPUTS = [2, 4, 1] as const;
const CMY_MIX_INPUTS = [5, 3, 6] as const;
const RGB_TRIPLE_ORDER = [2, 1, 4] as const;

const RGB_INPUT_SET = new Set<number>(RGB_MIX_INPUTS);
const CMY_INPUT_SET = new Set<number>(CMY_MIX_INPUTS);

const CANONICAL_PAIR_ORDER: Readonly<Record<string, readonly [number, number]>> = {
  "2,4": [2, 4],
  "1,4": [4, 1],
  "1,2": [1, 2],
  "3,5": [3, 5],
  "3,6": [3, 6],
  "5,6": [5, 6],
};

export function colorCubeMixFamily(level: number): ColorCubeMixFamily | null {
  if (RGB_INPUT_SET.has(level)) return "rgb";
  if (CMY_INPUT_SET.has(level)) return "cmy";
  return null;
}

export function isColorCubeMixEligible(level: number, family: ColorCubeMixFamily | null): boolean {
  const levelFamily = colorCubeMixFamily(level);
  return levelFamily !== null && (family === null || levelFamily === family);
}

export function canonicalColorCubeMixOperands(operands: readonly number[], family: ColorCubeMixFamily): readonly number[] {
  if (operands.length === 3) {
    return family === "rgb" ? RGB_TRIPLE_ORDER : CMY_MIX_INPUTS;
  }
  if (operands.length === 2) {
    const key = [...operands].sort((a, b) => a - b).join(",");
    return CANONICAL_PAIR_ORDER[key] ?? operands;
  }
  return operands;
}

export function colorCubeMixResult(operands: readonly number[], family: ColorCubeMixFamily): number | null {
  if (operands.length < 2) return null;
  return family === "rgb" ? operands.reduce((join, level) => join | level, 0) : operands.reduce((meet, level) => meet & level, 7);
}
