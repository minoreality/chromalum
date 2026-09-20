/* ═══════════════════════════════════════════
   HAMMING [7,4,3] — SHARED TABLE AND CODEC
   Theory (HammingDiagram, HammingParitySets) and Music (parity chords,
   syndrome demo) read this one table, so the checks a figure draws are
   the checks the engine sounds.
   ═══════════════════════════════════════════ */

import type { ChromalumChannel } from "../chromalum-color-model";

export type Bit = 0 | 1;
export type DataWord = readonly [Bit, Bit, Bit, Bit];
export type HammingWord = readonly [Bit, Bit, Bit, Bit, Bit, Bit, Bit];

/** Codeword positions 1..7. Position p carries the bits of p, so p is also the level it selects. */
export const HAMMING_POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Role of each position: parity at the powers of two, data elsewhere. */
export const HAMMING_POSITION_ROLES = ["P1", "P2", "D1", "P4", "D2", "D3", "D4"] as const;
export const HAMMING_DATA_POSITIONS = [3, 5, 6, 7] as const;

/** Position p written as its three bits, `001` … `111`. */
export function positionBits(position: number): string {
  return position.toString(2).padStart(3, "0");
}

interface HammingParityGroup {
  readonly parity: number;
  readonly channel: ChromalumChannel;
  readonly checks: readonly number[];
  readonly data: readonly number[];
}

/**
 * The three even-parity checks. P_k covers the positions whose bit k is set,
 * which are exactly the levels carrying one channel: P1 ↔ B, P2 ↔ R, P4 ↔ G.
 * `data` lists which of D1..D4 each check includes.
 */
export const HAMMING_PARITY_GROUPS = [
  { parity: 1, channel: "B", checks: [1, 3, 5, 7], data: [1, 2, 4] },
  { parity: 2, channel: "R", checks: [2, 3, 6, 7], data: [1, 3, 4] },
  { parity: 4, channel: "G", checks: [4, 5, 6, 7], data: [2, 3, 4] },
] as const satisfies readonly HammingParityGroup[];

/** The checks in syndrome order (s4, s2, s1), so that 4·s4 + 2·s2 + s1 is the error position. */
export const HAMMING_SYNDROME_GROUPS = [HAMMING_PARITY_GROUPS[2], HAMMING_PARITY_GROUPS[1], HAMMING_PARITY_GROUPS[0]] as const;

export interface HammingComputation {
  readonly encoded: HammingWord;
  readonly received: HammingWord;
  readonly syndromeBits: readonly [Bit, Bit, Bit];
  readonly syndrome: number;
  readonly corrected: HammingWord;
  readonly output: DataWord;
}

/** Encode D1,D2,D3,D4 into positions (P1,P2,D1,P4,D2,D3,D4) using even parity. */
export function encodeHamming74([d1, d2, d3, d4]: DataWord): HammingWord {
  const p1 = (d1 ^ d2 ^ d4) as Bit;
  const p2 = (d1 ^ d3 ^ d4) as Bit;
  const p4 = (d2 ^ d3 ^ d4) as Bit;
  return [p1, p2, d1, p4, d2, d3, d4];
}

/** Run the complete Hamming(7,4) encode, channel, syndrome, and correction pipeline. */
export function calculateHamming74(data: DataWord, errors: HammingWord): HammingComputation {
  const encoded = encodeHamming74(data);
  const received = transmitWord(encoded, errors);
  const syndromeBits = HAMMING_SYNDROME_GROUPS.map((group) => checkParity(received, group.checks)) as unknown as readonly [Bit, Bit, Bit];
  const syndrome = syndromePosition(syndromeBits);
  const corrected = correctWord(received, syndrome);
  const output = extractData(corrected);
  return { encoded, received, syndromeBits, syndrome, corrected, output };
}

export function transmitWord(encoded: HammingWord, errors: HammingWord): HammingWord {
  return encoded.map((bit, index) => (bit ^ errors[index]) as Bit) as unknown as HammingWord;
}

export function checkParity(received: HammingWord, positions: readonly number[]): Bit {
  return positions.reduce<Bit>((parity, position) => (parity ^ received[position - 1]) as Bit, 0);
}

export function syndromePosition([s4, s2, s1]: readonly [Bit, Bit, Bit]): number {
  return 4 * s4 + 2 * s2 + s1;
}

export function correctWord(received: HammingWord, syndrome: number): HammingWord {
  return received.map((bit, index) => (bit ^ (syndrome === index + 1 ? 1 : 0)) as Bit) as unknown as HammingWord;
}

export function extractData(corrected: HammingWord): DataWord {
  return [corrected[2], corrected[4], corrected[5], corrected[6]];
}
