// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { angleToFreq, PITCH_BASE_FREQ } from "../../data/music-frequency";
import { useMusicEngine } from "../useMusicEngine";

class FakeAudioParam {
  private current = 0;
  readonly valueAssignments: number[] = [];
  readonly targetValues: number[] = [];

  get value() {
    return this.current;
  }

  set value(next: number) {
    this.current = next;
    this.valueAssignments.push(next);
  }

  setTargetAtTime(value: number, _startTime: number, _timeConstant: number) {
    this.current = value;
    this.targetValues.push(value);
    return this;
  }

  setValueAtTime(value: number, _startTime: number) {
    this.current = value;
    return this;
  }

  linearRampToValueAtTime(value: number, _endTime: number) {
    this.current = value;
    return this;
  }
}

class FakeAudioNode {
  connect<T>(destination: T): T {
    return destination;
  }

  disconnect() {}
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  type: OscillatorType = "sine";
  readonly frequency = new FakeAudioParam();

  start(_when?: number) {}
  stop(_when?: number) {}
}

class FakeStereoPannerNode extends FakeAudioNode {
  readonly pan = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = "lowpass";
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
}

class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 0;
}

class FakeDynamicsCompressorNode extends FakeAudioNode {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
}

class FakeAudioBuffer {
  private readonly data: Float32Array;

  constructor(length: number) {
    this.data = new Float32Array(length);
  }

  getChannelData(_channel: number) {
    return this.data;
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null;
  loop = false;

  start(_when?: number) {}
  stop(_when?: number) {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  readonly currentTime = 0;
  readonly destination = new FakeAudioNode();
  readonly gains: FakeGainNode[] = [];
  readonly oscillators: FakeOscillatorNode[] = [];
  readonly panners: FakeStereoPannerNode[] = [];
  readonly sampleRate: number;
  state: AudioContextState = "running";

  constructor(options?: AudioContextOptions) {
    this.sampleRate = options?.sampleRate ?? 44100;
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  createAnalyser() {
    return new FakeAnalyserNode();
  }

  createDynamicsCompressor() {
    return new FakeDynamicsCompressorNode();
  }

  createOscillator() {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createStereoPanner() {
    const panner = new FakeStereoPannerNode();
    this.panners.push(panner);
    return panner;
  }

  createBiquadFilter() {
    return new FakeBiquadFilterNode();
  }

  createBufferSource() {
    return new FakeAudioBufferSourceNode();
  }

  createBuffer(_numberOfChannels: number, length: number, _sampleRate: number) {
    return new FakeAudioBuffer(length);
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  FakeAudioContext.instances = [];
});

function last(values: number[]): number {
  return values[values.length - 1] ?? 0;
}

type MusicEngineParams = Parameters<typeof useMusicEngine>[0];

const DEFAULT_LEVELS: MusicEngineParams["levels"] = [
  { levelIndex: 1, hueAngleDeg: 240, toneNorm: 1 / 7 },
  { levelIndex: 2, hueAngleDeg: 0, toneNorm: 2 / 7 },
  { levelIndex: 3, hueAngleDeg: 300, toneNorm: 3 / 7 },
  { levelIndex: 4, hueAngleDeg: 120, toneNorm: 4 / 7 },
  { levelIndex: 5, hueAngleDeg: 180, toneNorm: 5 / 7 },
  { levelIndex: 6, hueAngleDeg: 60, toneNorm: 6 / 7 },
];

function renderMusicEngine(overrides: Partial<MusicEngineParams> = {}) {
  return renderHook(() =>
    useMusicEngine({
      enabled: true,
      levels: DEFAULT_LEVELS,
      hoveredLevelIndex: null,
      alpha0: 0,
      alpha7: 180,
      volume: 0.7,
      pitchMappingMode: "chromalum",
      fmEnabled: false,
      panEnabled: true,
      hoveredFanoLine: null,
      toneMode: "symmetric",
      originMode: 0,
      ...overrides,
    }),
  );
}

describe("useMusicEngine", () => {
  it("starts the persistent L7 noise source muted", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();

    act(() => {
      result.current.initAudio();
    });

    const ctx = FakeAudioContext.instances[0];
    const noiseGain = ctx.gains[7];
    expect(noiseGain.gain.valueAssignments[0]).toBe(0);
    expect(noiseGain.gain.targetValues).toContain(0);

    unmount();
  });

  it("releases the audio context and creates a fresh one on the next init", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();

    act(() => {
      result.current.initAudio();
    });
    const firstCtx = FakeAudioContext.instances[0];

    act(() => {
      result.current.stopAudio();
    });
    expect(firstCtx.state).toBe("closed");

    act(() => {
      result.current.initAudio();
    });
    expect(FakeAudioContext.instances).toHaveLength(2);

    unmount();
  });

  it("tears down audio and active playback when disabled", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, rerender, unmount } = renderHook(
      ({ enabled }) =>
        useMusicEngine({
          enabled,
          levels: DEFAULT_LEVELS,
          hoveredLevelIndex: null,
          alpha0: 0,
          alpha7: 180,
          volume: 0.7,
          pitchMappingMode: "chromalum",
          fmEnabled: false,
          panEnabled: true,
          hoveredFanoLine: null,
          toneMode: "symmetric",
          originMode: 0,
        }),
      { initialProps: { enabled: true } },
    );

    act(() => {
      result.current.initAudio();
    });
    const ctx = FakeAudioContext.instances[0];

    const onStep = vi.fn();
    act(() => {
      result.current.playGrayMelody(60, onStep);
    });
    act(() => {
      rerender({ enabled: false });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(ctx.state).toBe("closed");
    expect(onStep).not.toHaveBeenCalled();

    unmount();
  });

  it("starts, restarts, and stops the Gray melody interval", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();
    act(() => {
      result.current.initAudio();
    });

    const onStep = vi.fn();
    act(() => {
      result.current.playGrayMelody(60, onStep);
      vi.advanceTimersByTime(1000);
    });
    expect(onStep).toHaveBeenCalledTimes(1);

    const restartedStep = vi.fn();
    act(() => {
      result.current.playGrayMelody(120, restartedStep);
      vi.advanceTimersByTime(1000);
    });
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(restartedStep).toHaveBeenCalledTimes(2);

    restartedStep.mockClear();
    act(() => {
      result.current.stopGrayMelody();
      vi.advanceTimersByTime(1000);
    });
    expect(restartedStep).not.toHaveBeenCalled();

    unmount();
  });

  it("starts, restarts, and stops the Fano rhythm interval", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();
    act(() => {
      result.current.initAudio();
    });

    const onBeat = vi.fn();
    act(() => {
      result.current.startFanoRhythm(60, onBeat);
      vi.advanceTimersByTime(143);
    });
    expect(onBeat).toHaveBeenCalledTimes(1);

    onBeat.mockClear();
    act(() => {
      result.current.startFanoRhythm(60, onBeat);
      vi.advanceTimersByTime(143);
    });
    expect(onBeat).toHaveBeenCalledTimes(1);

    onBeat.mockClear();
    act(() => {
      result.current.stopFanoRhythm();
      vi.advanceTimersByTime(1000);
    });
    expect(onBeat).not.toHaveBeenCalled();

    unmount();
  });

  it("clears queued algebra timeouts before they run", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();
    act(() => {
      result.current.initAudio();
    });

    const onPhase = vi.fn();
    act(() => {
      result.current.playLineAndComplement(0, onPhase);
      result.current.stopAlgebra();
      vi.advanceTimersByTime(1000);
    });

    expect(onPhase).not.toHaveBeenCalled();

    unmount();
  });

  it("keeps GL(3,2) transformed pitch and pan on the same target hue", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine({ pitchMappingMode: "chromalum", panEnabled: true });
    act(() => {
      result.current.initAudio();
    });
    const ctx = FakeAudioContext.instances[0];
    const l1VoicePan = ctx.panners[0].pan;

    expect(l1VoicePan.targetValues[l1VoicePan.targetValues.length - 1]).toBeCloseTo(Math.sin((240 * Math.PI) / 180), 10);

    act(() => {
      result.current.applyGL32Transform("A");
    });
    expect(l1VoicePan.targetValues[l1VoicePan.targetValues.length - 1]).toBeCloseTo(Math.sin((120 * Math.PI) / 180), 10);

    act(() => {
      result.current.resetGL32Transform();
    });
    expect(l1VoicePan.targetValues[l1VoicePan.targetValues.length - 1]).toBeCloseTo(Math.sin((240 * Math.PI) / 180), 10);

    unmount();
  });

  it("keeps the seven-point GL(3,2) audio permutation across parameter updates", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const initialParams: MusicEngineParams = {
      enabled: true,
      levels: DEFAULT_LEVELS,
      hoveredLevelIndex: null,
      alpha0: 0,
      alpha7: 180,
      volume: 0.7,
      pitchMappingMode: "chromalum",
      fmEnabled: false,
      panEnabled: true,
      hoveredFanoLine: null,
      toneMode: "symmetric",
      originMode: 0,
    };
    const { result, rerender, unmount } = renderHook((params: MusicEngineParams) => useMusicEngine(params), {
      initialProps: initialParams,
    });

    act(() => {
      result.current.initAudio();
      result.current.setDroneMuted(false);
    });

    const ctx = FakeAudioContext.instances[0];
    const onPerm = vi.fn();
    act(() => {
      result.current.applyGL32Transform("C", onPerm);
    });

    expect(onPerm).toHaveBeenLastCalledWith([0, 1, 3, 2, 4, 5, 7, 6]);
    expect(last(ctx.gains[6].gain.targetValues)).toBe(0);
    expect(last(ctx.gains[7].gain.targetValues)).toBeGreaterThan(0);
    expect(last(ctx.gains[8].gain.targetValues)).toBeGreaterThan(0);
    expect(last(ctx.oscillators[6].frequency.targetValues)).toBeCloseTo(angleToFreq(60, "chromalum"), 10);

    const updatedLevels = DEFAULT_LEVELS.map((level) => (level.levelIndex === 6 ? { ...level, hueAngleDeg: 90 } : level));
    act(() => {
      rerender({ ...initialParams, levels: updatedLevels, alpha0: 30, volume: 0.4 });
    });

    expect(last(ctx.oscillators[6].frequency.targetValues)).toBeCloseTo(angleToFreq(120, "chromalum"), 10);
    expect(last(ctx.panners[6].pan.targetValues)).toBeCloseTo(Math.sin((120 * Math.PI) / 180), 10);
    expect(last(ctx.gains[0].gain.targetValues)).toBeCloseTo(0.32, 10);
    expect(last(ctx.gains[6].gain.targetValues)).toBe(0);

    const onReset = vi.fn();
    act(() => {
      result.current.resetGL32Transform(onReset);
    });
    expect(onReset).toHaveBeenLastCalledWith([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(last(ctx.oscillators[5].frequency.targetValues)).toBeCloseTo(angleToFreq(120, "chromalum"), 10);
    expect(last(ctx.gains[6].gain.targetValues)).toBeGreaterThan(0);
    expect(last(ctx.gains[8].gain.targetValues)).toBe(0);

    unmount();
  });

  it("stops algebra interval playback for Gray voices, Cayley rows, and K8 layers", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine();
    act(() => {
      result.current.initAudio();
    });

    const onGray3 = vi.fn();
    const onCayley = vi.fn();
    const onK8 = vi.fn();

    act(() => {
      result.current.playGray3Voice(onGray3);
      result.current.playCayleyRow(1, onCayley);
      result.current.playK8Layer(1, onK8);
      vi.advanceTimersByTime(400);
    });

    expect(onGray3).toHaveBeenCalled();
    expect(onCayley).toHaveBeenCalled();
    expect(onK8).toHaveBeenCalled();

    onGray3.mockClear();
    onCayley.mockClear();
    onK8.mockClear();

    act(() => {
      result.current.stopAlgebra();
      vi.advanceTimersByTime(1000);
    });

    expect(onGray3).not.toHaveBeenCalled();
    expect(onCayley).not.toHaveBeenCalled();
    expect(onK8).not.toHaveBeenCalled();

    unmount();
  });

  it("plays tone crossing melody as fixed 12-TET semitone steps", () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { result, unmount } = renderMusicEngine({ alpha0: 90, pitchMappingMode: "wholeTone" });
    act(() => {
      result.current.initAudio();
    });
    const ctx = FakeAudioContext.instances[0];

    const onStep = vi.fn();
    act(() => {
      result.current.playToneCrossingMelody(onStep);
      vi.advanceTimersByTime(200);
    });

    expect(onStep).toHaveBeenCalledWith(0);
    expect(ctx.oscillators[ctx.oscillators.length - 1].frequency.value).toBeCloseTo(PITCH_BASE_FREQ);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onStep).toHaveBeenLastCalledWith(1);
    expect(ctx.oscillators[ctx.oscillators.length - 1].frequency.value).toBeCloseTo(PITCH_BASE_FREQ * Math.pow(2, 1 / 12));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onStep).toHaveBeenLastCalledWith(4);

    onStep.mockClear();
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(onStep).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onStep).toHaveBeenLastCalledWith(5);

    onStep.mockClear();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onStep).toHaveBeenLastCalledWith(6);

    onStep.mockClear();
    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(onStep).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onStep).toHaveBeenLastCalledWith(7);

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(onStep).toHaveBeenLastCalledWith(14);
    expect(ctx.oscillators[ctx.oscillators.length - 1].frequency.value).toBeCloseTo(PITCH_BASE_FREQ * 4);

    onStep.mockClear();
    act(() => {
      result.current.stopToneCrossingMelody();
      vi.advanceTimersByTime(720);
    });

    expect(onStep).not.toHaveBeenCalled();

    unmount();
  });
});
