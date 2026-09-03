// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { calculateHamming74, encodeHamming74, HammingDiagram, type Bit, type DataWord, type HammingWord } from "../HammingDiagram";

const ZERO_ERRORS: HammingWord = [0, 0, 0, 0, 0, 0, 0];

function renderWithLanguage(onHover = vi.fn()) {
  localStorage.setItem("chromalum_lang", "en");
  return {
    ...render(
      <LanguageProvider>
        <HammingDiagram hlLevel={null} onHover={onHover} />
      </LanguageProvider>,
    ),
    onHover,
  };
}

function dataWord(value: number): DataWord {
  return [3, 2, 1, 0].map((shift) => ((value >> shift) & 1) as Bit) as unknown as DataWord;
}

function stageBits(testId: string): string | null {
  return screen.getByTestId(testId).querySelector("[data-bit-string]")?.getAttribute("data-bit-string") ?? null;
}

function stageSlot(testId: string, position: number): HTMLElement {
  return screen.getByTestId(testId).querySelector(`[data-code-position="${position}"]`) as HTMLElement;
}

function renderedSyndromeBits(): string | null {
  return screen.getByTestId("hamming-stage-syndrome").querySelector("[data-syndrome-bits]")?.getAttribute("data-syndrome-bits") ?? null;
}

function flowDelay(testId: string): string | null {
  return screen.getByTestId(testId).getAttribute("data-flow-delay-ms");
}

describe("HammingDiagram", () => {
  it("encodes the initial data word with even parity", () => {
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

  it("renders a standard three-set diagram and the complete six-stage flow", () => {
    renderWithLanguage();

    expect(screen.getByTestId("hamming-fano-bridge").textContent).toContain("ker H = Hamming [7,4,3]");
    expect(screen.getByTestId("hamming-fano-bridge").textContent).toContain("dim ker H = 4");
    expect(screen.getByTestId("hamming-fano-bridge").textContent).toContain("dₘᵢₙ = 3");
    expect(
      Array.from(screen.getByTestId("hamming-fano-columns").querySelectorAll("[data-h-column-bits]")).map((column) =>
        column.getAttribute("data-h-column-bits"),
      ),
    ).toEqual(["001", "010", "011", "100", "101", "110", "111"]);
    expect(screen.getAllByTestId(/hamming-parity-set-/)).toHaveLength(3);
    expect(screen.getAllByTestId(/hamming-venn-position-/)).toHaveLength(7);
    expect(screen.getByTestId("hamming-parity-set-2").querySelector("circle")?.getAttribute("cy")).toBe("94");
    expect(screen.getByTestId("hamming-parity-set-4").querySelector("circle")?.getAttribute("cx")).toBe("220");
    expect(screen.getByTestId("hamming-parity-set-1").querySelector("circle")?.getAttribute("cx")).toBe("120");
    expect(screen.getByTestId("hamming-venn-position-3").querySelector("circle")?.getAttribute("cx")).toBe("125");
    expect(screen.getByTestId("hamming-venn-position-5").querySelector("circle")?.getAttribute("cy")).toBe("215");
    expect(screen.getByTestId("hamming-venn-position-6").querySelector("circle")?.getAttribute("cx")).toBe("215");
    expect(stageBits("hamming-stage-data")).toBe("1011");
    expect(stageBits("hamming-stage-encoded")).toBe("0110011");
    expect(stageBits("hamming-stage-received")).toBe("0110011");
    expect(renderedSyndromeBits()).toBe("000");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("000₂");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("j=0");
    expect(screen.getByTestId("hamming-stage-syndrome").querySelectorAll("[data-code-position]")).toHaveLength(0);
    expect(
      Array.from(screen.getByTestId("hamming-stage-syndrome").querySelectorAll("[data-syndrome-channel]")).map((channel) =>
        channel.getAttribute("data-syndrome-channel"),
      ),
    ).toEqual(["sG", "sR", "sB"]);
    expect(stageBits("hamming-stage-corrected")).toBe("0110011");
    expect(stageBits("hamming-stage-output")).toBe("1011");

    expect(screen.getByTestId("hamming-flow-bit-header").querySelectorAll("[data-code-position]")).toHaveLength(7);
    expect(
      Array.from(screen.getByTestId("hamming-flow-bit-header").querySelectorAll("[data-code-position]")).map((column) =>
        column.getAttribute("data-h-column-bits"),
      ),
    ).toEqual(["001", "010", "011", "100", "101", "110", "111"]);
    expect(stageSlot("hamming-stage-data", 1).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 2).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 3).textContent).toBe("1");
    expect(stageSlot("hamming-stage-data", 4).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 5).textContent).toBe("0");
    expect(stageSlot("hamming-stage-data", 6).textContent).toBe("1");
    expect(stageSlot("hamming-stage-data", 7).textContent).toBe("1");
    for (const position of [3, 5, 6, 7]) {
      expect(stageSlot("hamming-stage-output", position).textContent).toBe(stageSlot("hamming-stage-data", position).textContent);
    }

    const flow = screen.getByRole("group", { name: "Hamming encode, transmit, syndrome, correction, and output flow" });
    expect(Array.from(flow.children).map((child) => (child as HTMLElement).dataset.testid)).toEqual([
      "hamming-flow-bit-header",
      "hamming-stage-data",
      "hamming-flow-operation-encode",
      "hamming-stage-encoded",
      "hamming-flow-operation-transmit",
      "hamming-stage-received",
      "hamming-flow-operation-check",
      "hamming-stage-syndrome",
      "hamming-flow-operation-correction",
      "hamming-stage-corrected",
      "hamming-flow-operation-extract",
      "hamming-stage-output",
    ]);
    expect(screen.getByTestId("hamming-flow-operation-encode").textContent).toContain("Generate parity");
    expect(screen.getByTestId("hamming-flow-operation-transmit").textContent).toContain("Transmit (no error)");
    expect(screen.getByTestId("hamming-flow-operation-check").textContent).toContain("Feed RECEIVED r=c⊕e into parity-check matrix H");
    expect(screen.getByTestId("hamming-syndrome-identity").textContent).toContain("r = c ⊕ e");
    expect(screen.getByTestId("hamming-syndrome-identity").textContent).toContain("s = Hrᵀ = Heᵀ");
    expect(screen.getByTestId("hamming-syndrome-identity").textContent).toContain("valid-codeword contribution becomes 000");
    expect(screen.getByTestId("hamming-flow-operation-check").textContent).toContain("Read the three results in [sG, sR, sB] order");
    expect(screen.getByTestId("hamming-parity-check-card").textContent).toContain("PARITY CHECK · computation");
    expect(screen.getByTestId("hamming-flow-operation-check-input")).toBeTruthy();
    expect(screen.getByTestId("hamming-flow-operation-check-output")).toBeTruthy();
    expect(screen.getByTestId("hamming-flow-operation-check").querySelectorAll("[data-parity-check-channel]")).toHaveLength(3);
    expect(screen.getByTestId("hamming-flow-operation-correction").textContent).toContain("Keep RECEIVED unchanged");

    const stages = screen.getAllByTestId(/hamming-stage-/);
    for (const stage of stages) {
      expect(stage.getAttribute("style")).not.toContain("border-top");
    }
    expect(new Set(stages.map((stage) => (stage.querySelector("[data-stage-value]") as HTMLElement).style.color))).toHaveLength(1);

    const dataOne = screen.getByTestId("hamming-data-1");
    const dataTwo = screen.getByTestId("hamming-data-2");
    const errorOne = screen.getByTestId("hamming-error-1");
    const errorTwo = screen.getByTestId("hamming-error-2");
    expect(dataOne.style.borderColor).not.toBe(dataTwo.style.borderColor);
    expect(errorOne.style.borderColor).toBe(errorTwo.style.borderColor);
    expect(errorOne.style.color).not.toBe(errorTwo.style.color);
  });

  it("re-encodes immediately when a data bit changes", () => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId("hamming-data-2"));

    expect(stageBits("hamming-stage-data")).toBe("1111");
    expect(stageBits("hamming-stage-encoded")).toBe("1111111");
    expect(stageBits("hamming-stage-output")).toBe("1111");
    expect(screen.getByTestId("hamming-stage-data").className).toContain("theory-hamming-stage-tracing");
    expect(flowDelay("hamming-stage-data")).toBe("0");
    expect(flowDelay("hamming-flow-operation-encode")).toBe("180");
    expect(flowDelay("hamming-stage-encoded")).toBe("360");
    expect(flowDelay("hamming-flow-operation-transmit")).toBe("540");
    expect(flowDelay("hamming-stage-received")).toBe("720");
    expect(
      Array.from(screen.getByTestId("hamming-parity-check-card").querySelectorAll("[data-parity-check-channel]")).map((row) =>
        row.getAttribute("data-flow-delay-ms"),
      ),
    ).toEqual(["900", "1020", "1140"]);
    expect(flowDelay("hamming-stage-syndrome")).toBe("1260");
    expect(flowDelay("hamming-flow-operation-correction")).toBe("1440");
    expect(flowDelay("hamming-stage-corrected")).toBe("1620");
    expect(flowDelay("hamming-stage-output")).toBe("1800");
  });

  it("starts an error trace at transmission instead of replaying unchanged encoding stages", () => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId("hamming-error-3"));

    expect(flowDelay("hamming-stage-data")).toBeNull();
    expect(flowDelay("hamming-flow-operation-encode")).toBeNull();
    expect(flowDelay("hamming-stage-encoded")).toBeNull();
    expect(flowDelay("hamming-flow-operation-transmit")).toBe("0");
    expect(flowDelay("hamming-stage-received")).toBe("180");
    expect(flowDelay("hamming-flow-operation-check-input")).toBe("300");
    expect(
      Array.from(screen.getByTestId("hamming-parity-check-card").querySelectorAll("[data-parity-check-channel]")).map((row) =>
        row.getAttribute("data-flow-delay-ms"),
      ),
    ).toEqual(["360", "480", "600"]);
    expect(flowDelay("hamming-flow-operation-check-output")).toBe("660");
    expect(flowDelay("hamming-stage-syndrome")).toBe("720");
    expect(flowDelay("hamming-flow-operation-correction")).toBe("900");
    expect(flowDelay("hamming-stage-corrected")).toBe("1080");
    expect(flowDelay("hamming-flow-operation-extract")).toBe("1170");
    expect(flowDelay("hamming-stage-output")).toBe("1260");
  });

  it.each([
    { position: 1, received: "1110011", syndromeBits: "001", syndromeLabel: "B₁" },
    { position: 2, received: "0010011", syndromeBits: "010", syndromeLabel: "R₂" },
    { position: 3, received: "0100011", syndromeBits: "011", syndromeLabel: "M₃" },
    { position: 4, received: "0111011", syndromeBits: "100", syndromeLabel: "G₄" },
    { position: 5, received: "0110111", syndromeBits: "101", syndromeLabel: "C₅" },
    { position: 6, received: "0110001", syndromeBits: "110", syndromeLabel: "Y₆" },
    { position: 7, received: "0110010", syndromeBits: "111", syndromeLabel: "W₇" },
  ])("shows and corrects a single error at position $position", ({ position, received, syndromeBits, syndromeLabel }) => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId(`hamming-error-${position}`));

    expect(stageBits("hamming-stage-received")).toBe(received);
    expect(renderedSyndromeBits()).toBe(syndromeBits);
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain(syndromeLabel);
    expect(stageBits("hamming-stage-corrected")).toBe("0110011");
    expect(stageBits("hamming-stage-output")).toBe("1011");
    expect(screen.getByTestId("hamming-status").textContent).toContain(`position ${position}`);
    expect(screen.getByTestId("hamming-flow-operation-transmit").textContent).toContain("Transmit (1-bit error)");
    expect(screen.getByTestId("hamming-flow-operation-correction").textContent).toContain(`Flip position ${position}`);
    expect(stageSlot("hamming-stage-received", position).dataset.flowEmphasis).toBe("error");
    expect(stageSlot("hamming-stage-corrected", position).dataset.flowEmphasis).toBe("success");
    const failedChecks = Array.from(
      screen.getByTestId("hamming-flow-operation-check").querySelectorAll('[data-parity-check-result="1"]'),
    ).map((check) => check.getAttribute("data-parity-check-channel"));
    expect(failedChecks).toEqual(
      ([4, 2, 1] as const)
        .filter((weight) => (position & weight) !== 0)
        .map((weight) => `s${weight === 4 ? "G" : weight === 2 ? "R" : "B"}`),
    );
  });

  it("makes the multi-error limit and resulting data mismatch explicit", () => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId("hamming-error-1"));
    fireEvent.click(screen.getByTestId("hamming-error-2"));

    expect(stageBits("hamming-stage-received")).toBe("1010011");
    expect(renderedSyndromeBits()).toBe("011");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("011₂");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("j=3");
    expect(stageBits("hamming-stage-output")).toBe("0011");
    expect(screen.getByTestId("hamming-stage-output").textContent).toContain("DATA MISMATCH");
    expect(screen.getByTestId("hamming-status").textContent).toContain("2 errors");
    expect(screen.getByTestId("hamming-status").textContent).toContain("guarantees correction only for one error");
    expect(screen.getByTestId("hamming-flow-operation-transmit").textContent).toContain("Transmit (2-bit error)");
    expect(screen.getByTestId("hamming-flow-operation-correction").textContent).toContain("outside guaranteed correction");
    expect(stageSlot("hamming-stage-corrected", 3).dataset.flowEmphasis).toBe("warning");
  });

  it("toggles an injected error off and keeps level hover linked", () => {
    const onHover = vi.fn();
    renderWithLanguage(onHover);
    const errorFive = screen.getByTestId("hamming-error-5");

    fireEvent.mouseEnter(errorFive);
    fireEvent.mouseLeave(errorFive);
    expect(onHover).toHaveBeenNthCalledWith(1, 5);
    expect(onHover).toHaveBeenNthCalledWith(2, null);

    fireEvent.click(errorFive);
    fireEvent.click(screen.getByTestId("hamming-error-5"));
    expect(renderedSyndromeBits()).toBe("000");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("000₂");
    expect(screen.getByTestId("hamming-status").textContent).toContain("No channel error");
    expect(screen.queryByRole("button", { name: "Clear errors" })).toBeNull();
  });
});
