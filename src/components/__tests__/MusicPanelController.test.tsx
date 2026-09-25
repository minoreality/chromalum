// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { MusicPanel } from "../MusicPanel";
import { CX, CY, TW, TH } from "../linked-visualization-geometry";

type MusicEngineParams = Parameters<(typeof import("../../hooks/useMusicEngine"))["useMusicEngine"]>[0];

const musicEngineMock = vi.hoisted(() => {
  const engine = {
    initAudio: vi.fn(),
    stopAudio: vi.fn(),
    triggerToneBurst: vi.fn(),
    playGrayMelody: vi.fn(),
    setGrayMelodyTempo: vi.fn(),
    stopGrayMelody: vi.fn(),
    startFanoRhythm: vi.fn(),
    setFanoRhythmTempo: vi.fn(),
    stopFanoRhythm: vi.fn(),
    analyserNode: null,
    playXorTriple: vi.fn(),
    playParityChord: vi.fn(),
    playComplementChord: vi.fn(),
    playLineAndComplement: vi.fn(),
    playSyndromeDemo: vi.fn(),
    playGray3Voice: vi.fn(),
    playWeightSpectrum: vi.fn(),
    playCayleyRow: vi.fn(),
    stopCayleyRow: vi.fn(),
    applyGL32Transform: vi.fn(),
    resetGL32Transform: vi.fn(),
    setToneMode: vi.fn(),
    stopAlgebra: vi.fn(),
    setDroneMuted: vi.fn(),
    playComplementCanon: vi.fn(),
    playZigzagMelody: vi.fn(),
    stopZigzagMelody: vi.fn(),
    playToneCrossingMelody: vi.fn(),
    stopToneCrossingMelody: vi.fn(),
    playPointFanoContext: vi.fn(),
    playExtendedHamming: vi.fn(),
    playDistributiveLaw: vi.fn(),
    playAndTriads: vi.fn(),
    playOctahedronMix: vi.fn(),
    playK8Layer: vi.fn(),
  };
  return {
    engine,
    useMusicEngine: vi.fn((_params: unknown) => engine),
  };
});

vi.mock("../../hooks/useMusicEngine", () => ({
  useMusicEngine: musicEngineMock.useMusicEngine,
}));

function isResettableMock(value: unknown): value is { mockReset: () => void } {
  return typeof value === "function" && "mockReset" in value;
}

function resetMusicEngineMocks() {
  for (const value of Object.values(musicEngineMock.engine)) {
    if (isResettableMock(value)) value.mockReset();
  }
  musicEngineMock.useMusicEngine.mockReset();
  musicEngineMock.useMusicEngine.mockImplementation((_params: unknown) => musicEngineMock.engine);
}

function renderWithLanguage(node: ReactNode) {
  localStorage.setItem("chromalum_lang", "en");
  return render(<LanguageProvider>{node}</LanguageProvider>);
}

function latestEngineParams(): MusicEngineParams {
  const latest = musicEngineMock.useMusicEngine.mock.calls[musicEngineMock.useMusicEngine.mock.calls.length - 1];
  if (!latest) throw new Error("useMusicEngine was not called");
  return latest[0] as MusicEngineParams;
}

function getMainCandidateButton(level: number): HTMLElement {
  const button = screen
    .getAllByRole("button", { name: new RegExp(`Level ${level} color candidate`) })
    .find((candidate) => candidate.getAttribute("aria-pressed") !== null);
  if (!button) throw new Error(`Level ${level} main candidate button was not found`);
  return button;
}

describe("MusicPanel controller integration", () => {
  beforeEach(() => {
    resetMusicEngineMocks();
  });

  it("passes transport mode changes through to the music engine", () => {
    renderWithLanguage(<MusicPanel />);

    expect(latestEngineParams()).toMatchObject({
      pitchMappingMode: "chromalum",
      fmEnabled: false,
      toneMode: "grbTone",
      volume: 0.7,
    });

    fireEvent.click(screen.getByRole("radio", { name: "Whole-tone" }));
    expect(latestEngineParams().pitchMappingMode).toBe("wholeTone");

    fireEvent.click(screen.getByRole("button", { name: "FM" }));
    expect(latestEngineParams().fmEnabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Even" }));
    expect(latestEngineParams().toneMode).toBe("symmetric");

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(latestEngineParams().volume).toBe(0);
    expect(screen.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "25" } });
    expect(latestEngineParams().volume).toBe(0.25);
    expect(screen.getByRole("button", { name: "Mute" })).toBeTruthy();
  });

  it("restores the pre-mute volume when unmuted", () => {
    renderWithLanguage(<MusicPanel />);

    fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "25" } });
    expect(latestEngineParams().volume).toBe(0.25);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(latestEngineParams().volume).toBe(0);
    expect(screen.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(latestEngineParams().volume).toBe(0.25);
    expect(screen.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("initializes audio and resumes the drone from hue and alpha rotation controls", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();
    musicEngineMock.engine.setDroneMuted.mockClear();

    for (const name of [
      "Auto-rotate hue backward",
      "Auto-rotate hue forward",
      "Auto-rotate hue phase backward",
      "Auto-rotate hue phase forward",
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    expect(musicEngineMock.engine.initAudio).toHaveBeenCalledTimes(4);
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);
  });

  it("routes hue, alpha, and candidate interactions through the controller", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();
    musicEngineMock.engine.setDroneMuted.mockClear();
    musicEngineMock.engine.triggerToneBurst.mockClear();

    fireEvent.click(getMainCandidateButton(2));
    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.triggerToneBurst).toHaveBeenCalledWith(2, expect.any(Number));
    expect(getMainCandidateButton(2).getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText("Hue angle (0-359 degrees)"), { target: { value: "180" } });
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);
    expect((screen.getByLabelText("Hue angle (0-359 degrees)") as HTMLInputElement).value).toBe("180");
    expect(getMainCandidateButton(2).getAttribute("aria-pressed")).toBe("false");

    fireEvent.change(screen.getByLabelText("Hue phase"), { target: { value: "90" } });
    expect(latestEngineParams()).toMatchObject({ alpha0: 90, alpha7: 270 });
  });

  it("triggers tone bursts from music keyboard shortcuts", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();
    musicEngineMock.engine.triggerToneBurst.mockClear();

    fireEvent.keyDown(document, { key: "3" });

    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.triggerToneBurst).toHaveBeenCalledWith(3, expect.any(Number));
  });

  it("does not trigger music shortcuts while typing in text controls", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();
    musicEngineMock.engine.triggerToneBurst.mockClear();

    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.append(textarea, editable);

    for (const target of [screen.getByRole("combobox", { name: "Fano point" }), textarea, editable]) {
      fireEvent.keyDown(target, { key: "3" });
    }

    expect(musicEngineMock.engine.initAudio).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.triggerToneBurst).not.toHaveBeenCalled();
    textarea.remove();
    editable.remove();
  });

  it("keeps music shortcuts while a button or slider has focus", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.triggerToneBurst.mockClear();

    fireEvent.keyDown(screen.getByRole("button", { name: "Reset" }), { key: "3" });
    fireEvent.keyDown(screen.getByLabelText("Volume"), { key: "4" });
    fireEvent.keyDown(screen.getByLabelText("Volume"), { key: "ArrowUp" });

    expect(musicEngineMock.engine.triggerToneBurst).toHaveBeenCalledTimes(2);
    expect(musicEngineMock.engine.triggerToneBurst).toHaveBeenCalledWith(3, expect.any(Number));
    expect(musicEngineMock.engine.triggerToneBurst).toHaveBeenCalledWith(4, expect.any(Number));
  });

  it("stops every sequence from Escape and toggles mute from M outside controls", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.stopFanoRhythm.mockClear();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(musicEngineMock.engine.stopFanoRhythm).toHaveBeenCalled();

    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(document, { key: "m" });
    expect(mute.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Fano point" }), { key: "m" });
    expect(mute.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(document, { key: "m" });
    expect(mute.getAttribute("aria-pressed")).toBe("false");
  });

  it("routes linked visualization origin and phase controls through the controller", () => {
    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.setDroneMuted.mockClear();

    expect(latestEngineParams()).toMatchObject({ originMode: 0, alpha7: 180 });
    expect(screen.getByText("\u03b1\u2080: 0\u00b0")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "L7=origin" }));
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);
    expect(latestEngineParams().originMode).toBe(7);
    expect(screen.getByText("\u03b1\u2087: 180\u00b0")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Antiphase" }));
    expect(latestEngineParams().alpha7).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "In phase" }));
    expect(latestEngineParams().alpha7).toBe(180);
  });

  it("starts traversal playback and Stop All resets active playback state", () => {
    musicEngineMock.engine.playGrayMelody.mockImplementation((_tempo: number, onStep: (levelIndex: number | null) => void) => onStep(2));
    musicEngineMock.engine.startFanoRhythm.mockImplementation((_tempo: number, onBeat: (lines: number[], pos: number) => void) =>
      onBeat([0, 2], 1),
    );

    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Gray" }));
    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.playGrayMelody).toHaveBeenCalledWith(120, expect.any(Function));
    expect(screen.getByRole("button", { name: "\u23f9 Gray" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Rhythm" }));
    expect(musicEngineMock.engine.startFanoRhythm).toHaveBeenCalledWith(120, expect.any(Function));
    expect(screen.getByRole("button", { name: "\u23f9 Rhythm" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Stop All" }));

    expect(musicEngineMock.engine.stopGrayMelody).toHaveBeenCalled();
    expect(musicEngineMock.engine.stopFanoRhythm).toHaveBeenCalled();
    expect(musicEngineMock.engine.stopAlgebra).toHaveBeenCalled();
    expect(musicEngineMock.engine.stopZigzagMelody).toHaveBeenCalled();
    expect(musicEngineMock.engine.stopToneCrossingMelody).toHaveBeenCalled();
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(true);
    expect(musicEngineMock.engine.stopAudio).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "\u25b6 Gray" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "\u25b6 Rhythm" })).toBeTruthy();
  });

  it("keeps the drone state synchronized after Stop All", () => {
    renderWithLanguage(<MusicPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Auto-rotate hue forward" }));
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);

    musicEngineMock.engine.setDroneMuted.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Stop All" }));
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(true);

    musicEngineMock.engine.setDroneMuted.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Auto-rotate hue forward" }));
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);
  });

  it("stops active traversal playback from the Fano controls", () => {
    musicEngineMock.engine.playGrayMelody.mockImplementation((_tempo: number, onStep: (levelIndex: number | null) => void) => onStep(2));
    musicEngineMock.engine.startFanoRhythm.mockImplementation((_tempo: number, onBeat: (lines: number[], pos: number) => void) =>
      onBeat([0, 2], 1),
    );

    renderWithLanguage(<MusicPanel />);

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Gray" }));
    expect(screen.getByRole("button", { name: "\u23f9 Gray" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "\u23f9 Gray" }));
    expect(musicEngineMock.engine.stopGrayMelody).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "\u25b6 Gray" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Rhythm" }));
    expect(screen.getByRole("button", { name: "\u23f9 Rhythm" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "\u23f9 Rhythm" }));
    expect(musicEngineMock.engine.stopFanoRhythm).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "\u25b6 Rhythm" })).toBeTruthy();
  });

  it("resets transport settings back to defaults", () => {
    renderWithLanguage(<MusicPanel />);

    fireEvent.click(screen.getByRole("radio", { name: "Whole-tone" }));
    fireEvent.click(screen.getByRole("button", { name: "FM" }));
    fireEvent.click(screen.getByRole("button", { name: "Even" }));
    fireEvent.change(screen.getByLabelText("Hue angle (0-359 degrees)"), { target: { value: "180" } });
    fireEvent.change(screen.getByLabelText("Hue phase"), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("BPM"), { target: { value: "160" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Fano point" }), { target: { value: "6" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Fano line" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "L7=origin" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));

    expect(latestEngineParams()).toMatchObject({
      pitchMappingMode: "wholeTone",
      fmEnabled: true,
      toneMode: "symmetric",
      originMode: 7,
      volume: 0,
    });
    expect((screen.getByLabelText("Hue angle (0-359 degrees)") as HTMLInputElement).value).toBe("180");
    expect((screen.getByLabelText("Hue phase") as HTMLInputElement).value).toBe("90");
    expect((screen.getByLabelText("BPM") as HTMLInputElement).value).toBe("160");
    expect((screen.getByRole("combobox", { name: "Fano point" }) as HTMLSelectElement).value).toBe("6");
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("2");

    musicEngineMock.engine.setDroneMuted.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(latestEngineParams()).toMatchObject({
      pitchMappingMode: "chromalum",
      fmEnabled: false,
      toneMode: "grbTone",
      originMode: 0,
      volume: 0.7,
    });
    expect(screen.getByText("\u03b1\u2080: 0\u00b0")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mute" })).toBeTruthy();
    expect((screen.getByLabelText("Hue angle (0-359 degrees)") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("Hue phase") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("BPM") as HTMLInputElement).value).toBe("120");
    expect((screen.getByRole("combobox", { name: "Fano point" }) as HTMLSelectElement).value).toBe("1");
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("0");
    expect(musicEngineMock.engine.resetGL32Transform).toHaveBeenCalledWith(expect.any(Function));
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(true);
    expect(musicEngineMock.engine.setDroneMuted).not.toHaveBeenCalledWith(false);
  });

  it("re-times active traversal playback when the tempo changes, without restarting it", async () => {
    musicEngineMock.engine.playGrayMelody.mockImplementation((_tempo: number, onStep: (levelIndex: number | null) => void) => onStep(1));
    musicEngineMock.engine.startFanoRhythm.mockImplementation((_tempo: number, onBeat: (lines: number[], pos: number) => void) =>
      onBeat([1], 0),
    );

    renderWithLanguage(<MusicPanel />);

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Gray" }));
    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Rhythm" }));
    musicEngineMock.engine.playGrayMelody.mockClear();
    musicEngineMock.engine.startFanoRhythm.mockClear();
    musicEngineMock.engine.stopGrayMelody.mockClear();
    musicEngineMock.engine.stopFanoRhythm.mockClear();

    fireEvent.change(screen.getByLabelText("BPM"), { target: { value: "160" } });

    await waitFor(() => expect(musicEngineMock.engine.setGrayMelodyTempo).toHaveBeenCalledWith(160));
    expect(musicEngineMock.engine.setFanoRhythmTempo).toHaveBeenCalledWith(160);
    // A restart would send the melody back to its first note and the canon to beat 0.
    expect(musicEngineMock.engine.stopGrayMelody).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.playGrayMelody).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.stopFanoRhythm).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.startFanoRhythm).not.toHaveBeenCalled();
  });

  it("leaves the tempo setters alone when nothing is playing", async () => {
    renderWithLanguage(<MusicPanel />);

    fireEvent.change(screen.getByLabelText("BPM"), { target: { value: "160" } });

    await waitFor(() => expect((screen.getByLabelText("BPM") as HTMLInputElement).value).toBe("160"));
    expect(musicEngineMock.engine.setGrayMelodyTempo).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.setFanoRhythmTempo).not.toHaveBeenCalled();
  });

  it("routes XOR playback through selected operands", () => {
    let onXorStep: ((levelIndex: number | null) => void) | undefined;
    musicEngineMock.engine.playXorTriple.mockImplementation((_a: number, _b: number, onStep: (levelIndex: number | null) => void) => {
      onXorStep = onStep;
      onStep(5);
    });

    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();

    fireEvent.change(screen.getByRole("combobox", { name: "XOR first color" }), { target: { value: "3" } });
    fireEvent.change(screen.getByRole("combobox", { name: "XOR second color" }), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "\u25b6 XOR" }));

    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.playXorTriple).toHaveBeenCalledWith(3, 5, expect.any(Function));
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("6");

    act(() => onXorStep?.(null));
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("0");
  });

  it("routes point context playback callback through the selected Fano line", () => {
    let onContextLine: ((idx: number | null) => void) | undefined;
    musicEngineMock.engine.playPointFanoContext.mockImplementation((_point: number, onLine: (idx: number | null) => void) => {
      onContextLine = onLine;
      onLine(4);
    });

    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();

    fireEvent.change(screen.getByRole("combobox", { name: "Fano point" }), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Lines" }));

    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.playPointFanoContext).toHaveBeenCalledWith(6, expect.any(Function));
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("4");

    act(() => onContextLine?.(null));
    expect((screen.getByRole("combobox", { name: "Fano line" }) as HTMLSelectElement).value).toBe("0");
  });

  it("routes partition playback through the selected Fano line and stops active partition playback", () => {
    musicEngineMock.engine.playLineAndComplement.mockImplementation(
      (_line: number, onPhase: (phase: "line" | "complement" | null) => void) => onPhase("line"),
    );

    renderWithLanguage(<MusicPanel />);
    musicEngineMock.engine.initAudio.mockClear();

    fireEvent.change(screen.getByRole("combobox", { name: "Fano line" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Complement" }));

    expect(musicEngineMock.engine.initAudio).toHaveBeenCalled();
    expect(musicEngineMock.engine.playLineAndComplement).toHaveBeenCalledWith(2, expect.any(Function));

    fireEvent.click(screen.getByRole("button", { name: "\u25b6 Complement" }));
    expect(musicEngineMock.engine.stopAlgebra).toHaveBeenCalled();
    expect(musicEngineMock.engine.playLineAndComplement).toHaveBeenCalledTimes(1);
  });
});

describe("Music modal and wheel ownership", () => {
  beforeEach(resetMusicEngineMocks);
  afterEach(() => vi.unstubAllGlobals());

  it.each(["1", "2", "3", "4", "5", "6", "m", "Escape"])("leaves %s to an open modal", (key) => {
    const view = renderWithLanguage(
      <>
        <MusicPanel />
        <div role="dialog" aria-modal="true">
          <button>Modal action</button>
        </div>
      </>,
    );
    musicEngineMock.engine.triggerToneBurst.mockClear();
    musicEngineMock.engine.stopAlgebra.mockClear();
    fireEvent.keyDown(screen.getByRole("button", { name: "Modal action" }), { key });
    expect(screen.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed")).toBe("false");
    // Focus can briefly be outside during opening; modal ownership still holds.
    fireEvent.keyDown(document, { key });
    expect(musicEngineMock.engine.triggerToneBurst).not.toHaveBeenCalled();
    expect(musicEngineMock.engine.stopAlgebra).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed")).toBe("false");
    view.unmount();
  });

  it.each(["drag", "coast"])("Stop All cancels wheel %s until a fresh pointerdown", (phase) => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.set(++frameId, cb);
      return frameId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const view = renderWithLanguage(<MusicPanel />);
    const svg = view.container.querySelector(".linked-viz-root svg") as SVGSVGElement;
    const wheel = svg.querySelector('g[style*="cursor: grab"]')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: TW, height: TH }) as DOMRect;
    const pointer = (target: Element, type: string, x: number, y: number, time: number) => {
      const event = new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y });
      Object.defineProperty(event, "timeStamp", { value: time });
      fireEvent(target, event);
    };
    pointer(wheel, "pointerdown", CX, CY - 40, 1000);
    pointer(svg, "pointermove", CX + 40, CY, 1050);
    if (phase === "coast") pointer(svg, "pointerup", CX + 40, CY, 1060);
    const stoppedAlpha = latestEngineParams().alpha0;
    expect(stoppedAlpha).toBe(90);
    fireEvent.click(screen.getByRole("button", { name: "Stop All" }));
    musicEngineMock.engine.setDroneMuted.mockClear();
    pointer(svg, "pointermove", CX, CY + 40, 1070);
    pointer(svg, "pointerup", CX, CY + 40, 1080);
    for (const time of [100, 116, 132]) {
      const pending = [...frames.values()];
      frames.clear();
      act(() => pending.forEach((cb) => cb(time)));
    }
    expect(latestEngineParams().alpha0).toBe(stoppedAlpha);
    expect(musicEngineMock.engine.setDroneMuted).not.toHaveBeenCalledWith(false);
    pointer(wheel, "pointerdown", CX, CY - 40, 2000);
    pointer(svg, "pointermove", CX + 40, CY, 2050);
    expect(latestEngineParams().alpha0).toBe(180);
    expect(musicEngineMock.engine.setDroneMuted).toHaveBeenCalledWith(false);
    view.unmount();
    vi.unstubAllGlobals();
  });
});
