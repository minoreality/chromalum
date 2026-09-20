import { describe, expect, it } from "vitest";
import { calculateHamming74, encodeHamming74, type Bit, type DataWord, type HammingWord } from "../hamming-data";

const ZERO_ERRORS: HammingWord = [0, 0, 0, 0, 0, 0, 0];

function dataWord(value: number): DataWord {
  return [3, 2, 1, 0].map((shift) => ((value >> shift) & 1) as Bit) as unknown as DataWord;
}

describe("Hamming [7,4,3] codec", () => {
  it("encodes a mixed data word with even parity", () => {
    expect(encodeHamming74([1, 0, 1, 1])).toEqual([0, 1, 1, 0, 0, 1, 1]);
  });

  it("corrects all 16 data words with no error or one error at any position", () => {
    let cases = 0;
    for (let value = 0; value < 16; value++) {
      const data = dataWord(value);
      for (let errorPosition = 0; errorPosition <= 7; errorPosition++) {
        const errors = [...ZERO_ERRORS] as Bit[];
        if (errorPosition > 0) errors[errorPosition - 1] = 1;
        const result = calculateHamming74(data, errors as unknown as HammingWord);

        expect(result.output).toEqual(data);
        expect(result.syndrome).toBe(errorPosition);
        cases++;
      }
    }
    expect(cases).toBe(128);
  });

  it("returns syndrome 000 exactly when the error pattern is itself a codeword", () => {
    let codewordPatterns = 0;
    for (let mask = 0; mask < 128; mask++) {
      const errors = [6, 5, 4, 3, 2, 1, 0].map((shift) => ((mask >> shift) & 1) as Bit) as unknown as HammingWord;
      const isCodeword = encodeHamming74([errors[2], errors[4], errors[5], errors[6]]).join("") === errors.join("");
      if (isCodeword && mask > 0) codewordPatterns++;
      for (let value = 0; value < 16; value++) {
        const data = dataWord(value);
        const result = calculateHamming74(data, errors);
        expect(result.syndrome === 0).toBe(isCodeword);
        if (!isCodeword) continue;
        expect(result.corrected).toEqual(result.received);
        if (mask > 0) expect(result.output).not.toEqual(data);
      }
    }
    expect(codewordPatterns).toBe(15);
  });
});
