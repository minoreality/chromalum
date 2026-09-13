// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function renderExampleData(onHover = vi.fn()) {
  const rendered = renderWithLanguage(onHover);
  for (const index of [1, 3, 4]) fireEvent.click(screen.getByTestId(`hamming-data-${index}`));
  advance(1800);
  return rendered;
}

function parityBits() {
  return Array.from(screen.getByTestId("hamming-parity-check-card").querySelectorAll("[data-parity-check-channel]")).map((row) =>
    row.getAttribute("data-parity-check-result"),
  );
}

describe("HammingDiagram", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

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

  it("renders a standard three-set diagram and the complete six-stage flow", () => {
    renderWithLanguage();

    expect(screen.queryByTestId("hamming-fano-bridge")).toBeNull();

    expect(screen.getAllByTestId(/hamming-parity-set-/)).toHaveLength(3);
    expect(screen.getAllByTestId(/hamming-venn-position-/)).toHaveLength(7);
    expect(screen.getByTestId("hamming-parity-set-2").querySelector("circle")?.getAttribute("cy")).toBe("94");
    expect(screen.getByTestId("hamming-parity-set-4").querySelector("circle")?.getAttribute("cx")).toBe("220");
    expect(screen.getByTestId("hamming-parity-set-1").querySelector("circle")?.getAttribute("cx")).toBe("120");
    expect(screen.getByTestId("hamming-venn-position-3").querySelector("circle")?.getAttribute("cx")).toBe("125");
    expect(screen.getByTestId("hamming-venn-position-5").querySelector("circle")?.getAttribute("cy")).toBe("215");
    expect(screen.getByTestId("hamming-venn-position-6").querySelector("circle")?.getAttribute("cx")).toBe("215");
    expect(stageBits("hamming-stage-data")).toBe("0000");
    expect(stageBits("hamming-stage-encoded")).toBe("0000000");
    expect(stageBits("hamming-stage-received")).toBe("0000000");
    expect(renderedSyndromeBits()).toBe("000");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("000₂");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("j=0");
    expect(screen.getByTestId("hamming-stage-syndrome").querySelectorAll("[data-code-position]")).toHaveLength(0);
    expect(
      Array.from(screen.getByTestId("hamming-stage-syndrome").querySelectorAll("[data-syndrome-channel]")).map((channel) =>
        channel.getAttribute("data-syndrome-channel"),
      ),
    ).toEqual(["sG", "sR", "sB"]);
    expect(stageBits("hamming-stage-corrected")).toBe("0000000");
    expect(stageBits("hamming-stage-output")).toBe("0000");

    expect(screen.getByTestId("hamming-flow-bit-header").querySelectorAll("[data-code-position]")).toHaveLength(7);
    expect(
      Array.from(screen.getByTestId("hamming-flow-bit-header").querySelectorAll("[data-code-position]")).map((column) =>
        column.getAttribute("data-h-column-bits"),
      ),
    ).toEqual(["001", "010", "011", "100", "101", "110", "111"]);
    expect(stageSlot("hamming-stage-data", 1).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 2).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 3).querySelector("[data-bit-value]")?.textContent).toBe("0");
    expect(stageSlot("hamming-stage-data", 4).dataset.empty).toBe("true");
    expect(stageSlot("hamming-stage-data", 5).querySelector("[data-bit-value]")?.textContent).toBe("0");
    expect(stageSlot("hamming-stage-data", 6).querySelector("[data-bit-value]")?.textContent).toBe("0");
    expect(stageSlot("hamming-stage-data", 7).querySelector("[data-bit-value]")?.textContent).toBe("0");
    for (const position of [3, 5, 6, 7]) {
      expect(stageSlot("hamming-stage-output", position).textContent).toBe(
        stageSlot("hamming-stage-data", position).querySelector("[data-bit-value]")?.textContent,
      );
    }

    const flow = screen.getByRole("group", { name: "Hamming encode, transmit, syndrome, correction, and output flow" });
    expect(Array.from(flow.children).map((child) => (child as HTMLElement).dataset.testid)).toEqual([
      "hamming-flow-bit-header",
      "hamming-stage-data",
      "hamming-flow-operation-encode",
      "hamming-parity-generation",
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
    expect(screen.getByTestId("hamming-parity-sets").closest('[data-testid="hamming-flow-operation-check"]')).not.toBeNull();
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
    expect(dataOne.getAttribute("aria-pressed")).toBe("false");
    expect(dataTwo.getAttribute("aria-pressed")).toBe("false");
    expect(errorOne.style.borderColor).toBe(errorTwo.style.borderColor);
    expect(errorOne.closest('[data-testid="hamming-stage-received"]')).not.toBeNull();
  });

  it("connects a selected check to its four Venn positions and received-bit calculation", () => {
    renderExampleData();
    const greenCheck = screen.getByTestId("hamming-venn-check-4");
    expect(screen.queryByTestId("hamming-venn-detail")).toBeNull();
    expect(greenCheck.querySelector(".theory-hamming-check-heading")?.textContent).toContain("4·5·6·7");
    expect(greenCheck.textContent).toContain("0 ⊕ 0 ⊕ 1 ⊕ 1 = 0");
    expect(greenCheck.querySelector(".theory-hamming-check-reason")?.textContent).toBe("2 ones (even)");
    expect(screen.getByTestId("hamming-venn-check-2").textContent).toContain("1 ⊕ 1 ⊕ 1 ⊕ 1 = 0");
    expect(screen.getByTestId("hamming-venn-check-2").textContent).toContain("4 ones (even)");
    expect(screen.getByTestId("hamming-venn-check-1").textContent).toContain("0 ⊕ 1 ⊕ 0 ⊕ 1 = 0");
    fireEvent.click(greenCheck);

    expect(greenCheck.getAttribute("aria-pressed")).toBe("true");
    expect(
      [...screen.getByTestId("hamming-stage-received").querySelectorAll('[data-parity-member="true"]')].map((slot) =>
        slot.getAttribute("data-code-position"),
      ),
    ).toEqual(["4", "5", "6", "7"]);
    expect(
      screen
        .getAllByTestId(/hamming-venn-position-/)
        .filter((node) => node.dataset.checkMember === "true")
        .map((node) => node.dataset.testid),
    ).toEqual(["hamming-venn-position-4", "hamming-venn-position-5", "hamming-venn-position-6", "hamming-venn-position-7"]);
    expect(greenCheck.textContent).toContain("0 ⊕ 0 ⊕ 1 ⊕ 1 = 0");
    expect(greenCheck.getAttribute("aria-label")).toContain("sG = 0 ⊕ 0 ⊕ 1 ⊕ 1 = 0");
    expect(greenCheck.getAttribute("aria-description")).toContain("even number");

    fireEvent.click(greenCheck);
    expect(greenCheck.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getAllByTestId(/hamming-venn-position-/).every((node) => node.dataset.checkMember === "true")).toBe(true);
    expect(greenCheck.textContent).toContain("0 ⊕ 0 ⊕ 1 ⊕ 1 = 0");
  });

  it("toggles errors from keyboard-accessible Venn nodes while preserving delayed results", () => {
    const { onHover } = renderExampleData();
    const node = screen.getByTestId("hamming-venn-position-5");
    const blueCheck = screen.getByTestId("hamming-venn-check-1");
    fireEvent.click(blueCheck);
    fireEvent.focus(node);
    expect(onHover).toHaveBeenLastCalledWith(5);
    expect(node.getAttribute("role")).toBe("button");
    expect(node.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(node, { key: "Enter" });
    expect(node.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("hamming-error-5").getAttribute("aria-pressed")).toBe("true");
    expect(node.dataset.receivedBit).toBeUndefined();
    expect(blueCheck.textContent).toContain("r₁ ⊕ r₃ ⊕ r₅ ⊕ r₇");
    expect(blueCheck.getAttribute("aria-description")).toContain("Waiting for this check");
    expect(blueCheck.querySelector(".theory-hamming-check-reason")?.textContent).toBe("—");
    advance(180);
    expect(node.dataset.receivedBit).toBe("1");
    expect(blueCheck.textContent).toContain("r₁ ⊕ r₃ ⊕ r₅ ⊕ r₇");
    advance(419);
    expect(blueCheck.textContent).toContain("r₁ ⊕ r₃ ⊕ r₅ ⊕ r₇");
    advance(1);
    expect(blueCheck.textContent).toContain("0 ⊕ 1 ⊕ 1 ⊕ 1 = 1");
    expect(blueCheck.getAttribute("aria-description")).toContain("odd number");
    expect(blueCheck.querySelector(".theory-hamming-check-reason")?.textContent).toBe("3 ones (odd)");
    expect(screen.getByTestId("hamming-parity-set-1").querySelector("circle")?.getAttribute("stroke-dasharray")).toBe("6 4");

    fireEvent.keyDown(node, { key: " ", repeat: true });
    expect(node.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(node, { key: " " });
    expect(node.getAttribute("aria-pressed")).toBe("false");
    advance(1260);
    expect(node.dataset.receivedBit).toBe("0");
    expect(blueCheck.textContent).toContain("0 ⊕ 1 ⊕ 0 ⊕ 1 = 0");
    fireEvent.blur(node);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("shows zero as even and one as odd only after each check has finished", () => {
    renderWithLanguage();
    for (const parity of [4, 2, 1]) {
      expect(screen.getByTestId(`hamming-venn-check-${parity}`).textContent).toContain("0 ones (even)");
    }
    const greenCheck = screen.getByTestId("hamming-venn-check-4");
    fireEvent.click(screen.getByTestId("hamming-error-4"));
    advance(359);
    expect(greenCheck.querySelector(".theory-hamming-check-reason")?.textContent).toBe("—");
    advance(1);
    expect(greenCheck.textContent).toContain("1 ⊕ 0 ⊕ 0 ⊕ 0 = 1");
    expect(greenCheck.querySelector(".theory-hamming-check-reason")?.textContent).toBe("1 one (odd)");
  });

  it("distinguishes injected errors from checks that still pass with two errors", () => {
    renderWithLanguage();
    fireEvent.click(screen.getByTestId("hamming-venn-position-6"));
    fireEvent.click(screen.getByTestId("hamming-venn-position-7"));
    advance(1260);
    expect(screen.getByTestId("hamming-venn-check-4").textContent).toContain("pass");
    expect(screen.getByTestId("hamming-venn-check-2").textContent).toContain("pass");
    expect(screen.getByTestId("hamming-venn-check-1").textContent).toContain("fail");
    expect(screen.getByTestId("hamming-venn-position-1").dataset.errorInjected).toBe("false");
    expect(screen.getByTestId("hamming-venn-position-6").dataset.errorInjected).toBe("true");
    expect(screen.getByTestId("hamming-venn-position-7").dataset.errorInjected).toBe("true");
    expect(screen.getByTestId("hamming-status").textContent).toContain("2 errors");
  });

  it("calculates and reveals each stage in order after a data change", () => {
    renderExampleData();
    const generation = screen.getByTestId("hamming-parity-generation");
    const generationFormulas = () =>
      Array.from(generation.querySelectorAll(".theory-hamming-generation-formula")).map((formula) => formula.textContent);
    expect(generationFormulas()).toEqual(["1 ⊕ 0 ⊕ 1 = 0", "1 ⊕ 1 ⊕ 1 = 1", "0 ⊕ 1 ⊕ 1 = 0"]);
    fireEvent.click(screen.getByTestId("hamming-data-2"));

    expect(stageBits("hamming-stage-data")).toBe("1111");
    for (const stage of ["encoded", "received", "corrected", "output"]) {
      expect(stageBits("hamming-stage-" + stage)).toBeNull();
      expect(screen.getByTestId("hamming-stage-" + stage).getAttribute("aria-busy")).toBe("true");
    }
    expect(renderedSyndromeBits()).toBeNull();
    expect(parityBits()).toEqual([null, null, null]);
    expect(screen.getByTestId("hamming-generator-1").querySelector("strong")?.textContent).toBe("P₁");
    expect(generationFormulas()).toEqual(["D₁ ⊕ D₂ ⊕ D₄ = P₁", "D₁ ⊕ D₃ ⊕ D₄ = P₂", "D₂ ⊕ D₃ ⊕ D₄ = P₄"]);
    expect(screen.getByTestId("hamming-venn-check-4").getAttribute("data-parity-check-result")).toBeNull();
    expect(screen.getByTestId("hamming-status").textContent).toContain("Calculating");
    expect(screen.getByTestId("hamming-stage-output").textContent).not.toContain("DATA IN = DATA OUT");

    advance(359);
    expect(stageBits("hamming-stage-encoded")).toBeNull();
    advance(1);
    expect(stageBits("hamming-stage-encoded")).toBe("1111111");
    expect(screen.getByTestId("hamming-generator-1").querySelector("strong")?.textContent).toBe("1");
    expect(generationFormulas()).toEqual(["1 ⊕ 1 ⊕ 1 = 1", "1 ⊕ 1 ⊕ 1 = 1", "1 ⊕ 1 ⊕ 1 = 1"]);
    expect(stageBits("hamming-stage-received")).toBeNull();
    advance(360);
    expect(stageBits("hamming-stage-received")).toBe("1111111");
    expect(parityBits()).toEqual([null, null, null]);
    advance(180);
    expect(parityBits()).toEqual(["0", null, null]);
    expect(screen.getByTestId("hamming-venn-check-4").getAttribute("data-parity-check-result")).toBe("0");
    advance(120);
    expect(parityBits()).toEqual(["0", "0", null]);
    advance(120);
    expect(parityBits()).toEqual(["0", "0", "0"]);
    advance(119);
    expect(renderedSyndromeBits()).toBeNull();
    advance(1);
    expect(renderedSyndromeBits()).toBe("000");
    expect(stageBits("hamming-stage-corrected")).toBeNull();
    expect(screen.getByTestId("hamming-status").textContent).toContain("Calculating");
    advance(360);
    expect(stageBits("hamming-stage-corrected")).toBe("1111111");
    expect(stageBits("hamming-stage-output")).toBeNull();
    advance(180);
    expect(stageBits("hamming-stage-output")).toBe("1111");
    expect(screen.getByTestId("hamming-stage-output").getAttribute("aria-busy")).toBe("false");
    expect(screen.getByTestId("hamming-stage-output").textContent).toContain("DATA IN = DATA OUT");
    expect(screen.getByTestId("hamming-status").textContent).toContain("No channel error");
  });

  it("keeps completed encoding and delays reception onward when an error changes", () => {
    renderExampleData();
    fireEvent.click(screen.getByTestId("hamming-error-3"));

    expect(stageBits("hamming-stage-data")).toBe("1011");
    expect(stageBits("hamming-stage-encoded")).toBe("0110011");
    expect(stageBits("hamming-stage-received")).toBeNull();
    expect(stageBits("hamming-stage-output")).toBeNull();
    expect(screen.getByTestId("hamming-flow-operation-correction").textContent).not.toContain("Flip position 3");
    advance(179);
    expect(stageBits("hamming-stage-received")).toBeNull();
    advance(1);
    expect(stageBits("hamming-stage-received")).toBe("0100011");
    advance(180);
    expect(parityBits()).toEqual(["0", null, null]);
    advance(120);
    expect(parityBits()).toEqual(["0", "1", null]);
    advance(120);
    expect(parityBits()).toEqual(["0", "1", "1"]);
    expect(renderedSyndromeBits()).toBeNull();
    advance(120);
    expect(renderedSyndromeBits()).toBe("011");
    expect(stageBits("hamming-stage-corrected")).toBeNull();
    advance(360);
    expect(stageBits("hamming-stage-corrected")).toBe("0110011");
    expect(screen.getByTestId("hamming-flow-operation-correction").textContent).toContain("Flip position 3");
    expect(stageBits("hamming-stage-output")).toBeNull();
    advance(180);
    expect(stageBits("hamming-stage-output")).toBe("1011");
  });

  it("finishes encoding before transmission when an error changes during pending encoding", () => {
    renderExampleData();
    fireEvent.click(screen.getByTestId("hamming-data-2"));
    advance(200);
    fireEvent.click(screen.getByTestId("hamming-error-5"));
    advance(160);
    expect(stageBits("hamming-stage-encoded")).toBeNull();
    expect(stageBits("hamming-stage-received")).toBeNull();
    advance(200);
    expect(stageBits("hamming-stage-encoded")).toBe("1111111");
    expect(stageBits("hamming-stage-received")).toBeNull();
    advance(360);
    expect(stageBits("hamming-stage-received")).toBe("1111011");
    advance(1080);
    expect(renderedSyndromeBits()).toBe("101");
    expect(stageBits("hamming-stage-output")).toBe("1111");
  });

  it("cancels obsolete downstream results when the data changes again", () => {
    renderExampleData();
    fireEvent.click(screen.getByTestId("hamming-data-2"));
    advance(1500);
    fireEvent.click(screen.getByTestId("hamming-data-1"));
    expect(stageBits("hamming-stage-data")).toBe("0111");
    expect(renderedSyndromeBits()).toBeNull();
    advance(300);
    expect(stageBits("hamming-stage-encoded")).toBeNull();
    expect(stageBits("hamming-stage-corrected")).toBeNull();
    expect(stageBits("hamming-stage-output")).toBeNull();
    advance(1500);
    expect(stageBits("hamming-stage-output")).toBe("0111");
    expect(screen.getByTestId("hamming-status").textContent).toContain("No channel error");
  });

  it("clears pending stage calculations on unmount", () => {
    const { unmount } = renderWithLanguage();
    // Flush the renderer's initial task before counting the calculation timers.
    advance(0);
    fireEvent.click(screen.getByTestId("hamming-data-2"));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
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
    renderExampleData();

    fireEvent.click(screen.getByTestId(`hamming-error-${position}`));
    advance(1260);

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
    renderExampleData();

    fireEvent.click(screen.getByTestId("hamming-error-1"));
    fireEvent.click(screen.getByTestId("hamming-error-2"));
    advance(1260);

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
    advance(1260);
    expect(renderedSyndromeBits()).toBe("000");
    expect(screen.getByTestId("hamming-stage-syndrome").textContent).toContain("000₂");
    expect(screen.getByTestId("hamming-status").textContent).toContain("No channel error");
    expect(screen.queryByRole("button", { name: "Clear errors" })).toBeNull();
  });
});
