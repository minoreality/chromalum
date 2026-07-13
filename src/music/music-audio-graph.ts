import { FANO_LINES } from "../data/theory-data";
import { TONE_NORM_VALUES, bitSpectrumComponents } from "../data/music-data";
import { BASE_FREQ, angleToFreq, semitoneToFreq, type PitchMappingMode } from "../data/music-frequency";
import { GL32_IDENTITY_PERMUTATION, toneToFreq } from "./music-engine-core";
import { complementPhaseFactor, hueStereoPan, liveHueAngleDeg } from "./music-phase";

export interface SonificationLevel {
  levelIndex: number;
  hueAngleDeg: number;
  toneNorm: number;
}

export interface AudioNodes {
  ctx: AudioContext;
  oscs: OscillatorNode[];
  gains: GainNode[];
  panners: StereoPannerNode[];
  /** Silent under identity; represents source L7 when GL(3,2) maps it to L1-L6. */
  gl32L7Osc: OscillatorNode;
  gl32L7Gain: GainNode;
  gl32L7Panner: StereoPannerNode;
  noiseSource: AudioBufferSourceNode;
  noiseGain: GainNode;
  master: GainNode;
  analyser: AnalyserNode;
  compressor: DynamicsCompressorNode;
  // FM synthesis nodes (created/destroyed dynamically)
  fmOscs: OscillatorNode[];
  fmGains: GainNode[];
}

const GAIN_SCALE = 0.15;
const NOISE_GAIN = 0.005;
const RAMP_TC = 0.02;
const DUCK_TC = 0.05;
const HOVER_BOOST = 1.5;
const HOVER_DUCK = 0.1;
const BIT_TIMBRE_GAIN_SCALE = 0.42;
const C2_PAIRS: [number, number][] = [
  [6, 1],
  [5, 2],
  [4, 3],
]; // carrier, modulator

const CHROMATIC_LEVEL_COUNT = 6;

function mappedLevel(permutation: readonly number[], sourceLevel: number): number {
  const targetLevel = permutation[sourceLevel];
  return targetLevel >= 1 && targetLevel <= 7 ? targetLevel : sourceLevel;
}

function levelToneNorm(levels: SonificationLevel[], levelIndex: number): number {
  return levels.find((level) => level.levelIndex === levelIndex)?.toneNorm ?? TONE_NORM_VALUES[levelIndex] ?? levelIndex / 7;
}

function targetFrequency(
  levels: SonificationLevel[],
  targetLevel: number,
  activeAlpha: number,
  pitchMappingMode: PitchMappingMode,
): number {
  if (targetLevel === 7) return toneToFreq(1);
  const targetData = levels.find((level) => level.levelIndex === targetLevel);
  return angleToFreq(liveHueAngleDeg(targetData?.hueAngleDeg ?? 0, activeAlpha), pitchMappingMode);
}

function targetPan(levels: SonificationLevel[], targetLevel: number, activeAlpha: number, panEnabled: boolean): number {
  if (!panEnabled || targetLevel === 7) return 0;
  const targetData = levels.find((level) => level.levelIndex === targetLevel);
  return hueStereoPan(targetData?.hueAngleDeg ?? 0, activeAlpha);
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function buildAudioGraph(ctx: AudioContext): AudioNodes {
  const master = ctx.createGain();
  master.gain.value = 0.8;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -6;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;

  master.connect(analyser).connect(compressor).connect(ctx.destination);

  // Six ordinary chromatic drone oscillators for L1-L6.
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const panners: StereoPannerNode[] = [];
  for (let i = 0; i < CHROMATIC_LEVEL_COUNT; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = BASE_FREQ;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;
    osc.connect(gain).connect(panner).connect(master);
    osc.start();
    oscs.push(osc);
    gains.push(gain);
    panners.push(panner);
  }

  // White noise for L7
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(ctx);
  noiseSource.loop = true;
  noiseSource.connect(noiseGain).connect(master);
  noiseSource.start();

  // A separate, normally-muted oscillator completes the seven GL(3,2) source
  // slots without changing the six-oscillator contract used by ordinary audio
  // and FM carriers. It becomes audible only when source L7 maps to L1-L6.
  const gl32L7Osc = ctx.createOscillator();
  gl32L7Osc.type = "sine";
  gl32L7Osc.frequency.value = BASE_FREQ;
  const gl32L7Gain = ctx.createGain();
  gl32L7Gain.gain.value = 0;
  const gl32L7Panner = ctx.createStereoPanner();
  gl32L7Panner.pan.value = 0;
  gl32L7Osc.connect(gl32L7Gain).connect(gl32L7Panner).connect(master);
  gl32L7Osc.start();

  return {
    ctx,
    oscs,
    gains,
    panners,
    gl32L7Osc,
    gl32L7Gain,
    gl32L7Panner,
    noiseSource,
    noiseGain,
    master,
    analyser,
    compressor,
    fmOscs: [],
    fmGains: [],
  };
}

export function teardownFM(nodes: AudioNodes) {
  for (const osc of nodes.fmOscs) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
    osc.disconnect();
  }
  for (const g of nodes.fmGains) g.disconnect();
  nodes.fmOscs = [];
  nodes.fmGains = [];
}

export function teardown(nodes: AudioNodes) {
  teardownFM(nodes);
  for (const osc of nodes.oscs) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
    osc.disconnect();
  }
  for (const g of nodes.gains) g.disconnect();
  for (const p of nodes.panners) p.disconnect();
  try {
    nodes.gl32L7Osc.stop();
  } catch {
    /* already stopped */
  }
  nodes.gl32L7Osc.disconnect();
  nodes.gl32L7Gain.disconnect();
  nodes.gl32L7Panner.disconnect();
  try {
    nodes.noiseSource.stop();
  } catch {
    /* already stopped */
  }
  nodes.noiseSource.disconnect();
  nodes.noiseGain.disconnect();
  nodes.master.disconnect();
  nodes.analyser.disconnect();
  nodes.compressor.disconnect();
  void nodes.ctx.close();
}

/** Build or rebuild FM modulator nodes */
export function buildFM(
  nodes: AudioNodes,
  levels: SonificationLevel[],
  pitchMappingMode: PitchMappingMode,
  activeAlpha = 0,
  levelPermutation: readonly number[] = GL32_IDENTITY_PERMUTATION,
) {
  teardownFM(nodes);
  const fmOscs: OscillatorNode[] = [];
  const fmGains: GainNode[] = [];

  for (const [carrierLevelIndex, modulatorLevelIndex] of C2_PAIRS) {
    const carrierLevel = levels.find((level) => level.levelIndex === carrierLevelIndex);
    const modulatorLevel = levels.find((level) => level.levelIndex === modulatorLevelIndex);
    if (!carrierLevel || !modulatorLevel) continue;

    const modOsc = nodes.ctx.createOscillator();
    modOsc.type = "sine";
    modOsc.frequency.value = targetFrequency(levels, mappedLevel(levelPermutation, modulatorLevelIndex), activeAlpha, pitchMappingMode);

    const modGain = nodes.ctx.createGain();
    const modIndex = Math.abs(carrierLevel.toneNorm - modulatorLevel.toneNorm) * 400;
    modGain.gain.value = modIndex;

    // The carrier oscillator array is indexed by levelIndex - 1.
    const carrierOsc = nodes.oscs[carrierLevelIndex - 1];
    modOsc.connect(modGain).connect(carrierOsc.frequency);
    modOsc.start();

    fmOscs.push(modOsc);
    fmGains.push(modGain);
  }

  nodes.fmOscs = fmOscs;
  nodes.fmGains = fmGains;
}

function triggerSineBurst(nodes: AudioNodes, frequency: number, panValue = 0) {
  const ctx = nodes.ctx;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = frequency;
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  panner.pan.value = panValue;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain.gain.linearRampToValueAtTime(0.0, now + 0.31);
  osc.connect(gain).connect(panner).connect(nodes.master);
  osc.start(now);
  osc.stop(now + 0.35);
}

/** Trigger a short tone burst at a tone-derived frequency */
export function triggerToneValueBurst(nodes: AudioNodes, toneNorm: number) {
  triggerSineBurst(nodes, toneToFreq(toneNorm));
}

/** Trigger a short tone burst at a hue-derived pitch. */
function triggerPitchBurst(nodes: AudioNodes, hueAngleDeg: number, pitchMappingMode: PitchMappingMode, panEnabled: boolean) {
  triggerSineBurst(nodes, angleToFreq(hueAngleDeg, pitchMappingMode), panEnabled ? hueStereoPan(hueAngleDeg, 0) : 0);
}

/** Trigger a short tone burst at a fixed 12-EDO semitone offset from C4. */
export function triggerSemitoneBurst(nodes: AudioNodes, semitone: number) {
  triggerSineBurst(nodes, semitoneToFreq(semitone));
}

export function triggerPitchOrToneBurst(
  nodes: AudioNodes,
  levelIndex: number,
  hueAngleDeg: number,
  pitchMappingMode: PitchMappingMode,
  panEnabled = false,
) {
  if (hueAngleDeg < 0) {
    triggerToneValueBurst(nodes, TONE_NORM_VALUES[levelIndex] ?? 0);
    return;
  }

  triggerPitchBurst(nodes, hueAngleDeg, pitchMappingMode, panEnabled);
}

/** Trigger a bit-basis timbre burst: GF(2)^3 bits select spectral basis components. */
export function triggerBitSpectrumBurst(nodes: AudioNodes, levelIndex: number, hueAngleDeg: number, panEnabled: boolean) {
  const components = bitSpectrumComponents(levelIndex);
  if (components.length === 0) return;

  const toneNorm = Math.max(0, Math.min(1, TONE_NORM_VALUES[levelIndex] ?? 0));
  if (toneNorm <= 0) return;

  const ctx = nodes.ctx;
  const now = ctx.currentTime;
  const group = ctx.createGain();
  const panner = ctx.createStereoPanner();

  group.gain.setValueAtTime(0, now);
  group.gain.linearRampToValueAtTime(toneNorm * BIT_TIMBRE_GAIN_SCALE, now + 0.01);
  group.gain.linearRampToValueAtTime(0, now + 0.31);

  if (panEnabled && hueAngleDeg >= 0) {
    panner.pan.value = hueStereoPan(hueAngleDeg, 0);
  }

  const componentNorm = 1 / Math.sqrt(components.length);
  for (const component of components) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = BASE_FREQ * component.harmonic;

    const gain = ctx.createGain();
    gain.gain.value = component.gain * componentNorm;

    osc.connect(gain).connect(group);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  group.connect(panner).connect(nodes.master);
}

/** Non-pitched transient used only to mark a Hamming error position. */
export function triggerErrorMarker(nodes: AudioNodes) {
  const ctx = nodes.ctx;
  const now = ctx.currentTime;
  const bufLen = Math.floor(ctx.sampleRate * 0.06);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.06);

  source.connect(filter).connect(gain).connect(nodes.master);
  source.start(now);
  source.stop(now + 0.07);
}

/** Apply current frequency, gain, pan, and FM values to the audio graph */
export function applyParams(
  nodes: AudioNodes,
  levels: SonificationLevel[],
  hoveredLevelIndex: number | null,
  alpha0: number,
  alpha7: number,
  volume: number,
  pitchMappingMode: PitchMappingMode,
  fmEnabled: boolean,
  panEnabled: boolean,
  hoveredFanoLine: number | null,
  toneMode: "symmetric" | "grbTone" = "symmetric",
  originMode: 0 | 7 = 0,
  droneMuted = false,
  levelPermutation: readonly number[] = GL32_IDENTITY_PERMUTATION,
) {
  const now = nodes.ctx.currentTime;

  // Active alpha: use alpha0 in L0 mode, alpha7 in L7 mode
  const activeAlpha = originMode === 0 ? alpha0 : alpha7;

  // Normalized magnitude of the complementary vectors displayed by the UI.
  const phaseFactor = complementPhaseFactor(alpha0, alpha7);

  // Master volume
  nodes.master.gain.setTargetAtTime(volume * 0.8, now, RAMP_TC);

  // Determine which levels are boosted by Fano line hover
  let fanoBoostSet: Set<number> | null = null;
  if (hoveredFanoLine !== null && hoveredFanoLine >= 0 && hoveredFanoLine < 7) {
    fanoBoostSet = new Set(FANO_LINES[hoveredFanoLine]);
  }

  for (let i = 0; i < CHROMATIC_LEVEL_COUNT; i++) {
    const sourceLevel = i + 1;
    const targetLevel = mappedLevel(levelPermutation, sourceLevel);
    const sourceToneNorm = levelToneNorm(levels, sourceLevel);

    // Frequency/pan follow the target point, while gain remains attached to the
    // source drone being transformed. A target of L7 is rendered by noise below.
    nodes.oscs[i].frequency.setTargetAtTime(targetFrequency(levels, targetLevel, activeAlpha, pitchMappingMode), now, RAMP_TC);

    // Gain: Even mode keeps chromatic drones level-matched. Tone mode follows the
    // active GRB 4:2:1 tone radius from the selected origin.
    const toneRadius = originMode === 0 ? sourceToneNorm : 1 - sourceToneNorm;
    const baseGain = toneMode === "grbTone" ? toneRadius * GAIN_SCALE : GAIN_SCALE;
    let targetGain: number;

    if (hoveredLevelIndex !== null) {
      // Individual level hover takes priority
      if (hoveredLevelIndex === sourceLevel) {
        targetGain = baseGain * HOVER_BOOST;
      } else {
        targetGain = baseGain * HOVER_DUCK * phaseFactor;
      }
    } else if (fanoBoostSet !== null) {
      // Fano line hover: boost members, duck others
      if (fanoBoostSet.has(sourceLevel)) {
        targetGain = baseGain * HOVER_BOOST;
      } else {
        targetGain = baseGain * HOVER_DUCK * phaseFactor;
      }
    } else {
      targetGain = baseGain * phaseFactor;
    }

    const tc = hoveredLevelIndex !== null || fanoBoostSet !== null ? DUCK_TC : RAMP_TC;
    // When drone is muted, only play hovered level or Fano line members
    let finalGain: number;
    if (droneMuted) {
      const isHoveredLevel = hoveredLevelIndex !== null && hoveredLevelIndex === sourceLevel;
      const isFanoMember = fanoBoostSet !== null && fanoBoostSet.has(sourceLevel);
      finalGain = isHoveredLevel || isFanoMember ? baseGain * HOVER_BOOST : 0;
    } else {
      finalGain = targetGain;
    }
    nodes.gains[i].gain.setTargetAtTime(targetLevel === 7 ? 0 : finalGain, now, tc);

    // Stereo pan
    nodes.panners[i].pan.setTargetAtTime(targetPan(levels, targetLevel, activeAlpha, panEnabled), now, RAMP_TC);
  }

  const l7TargetLevel = mappedLevel(levelPermutation, 7);
  const l7ToneRadius = originMode === 0 ? 1 : 0;
  const l7BaseGain = toneMode === "grbTone" ? l7ToneRadius * GAIN_SCALE : GAIN_SCALE;
  let l7TargetGain: number;
  if (hoveredLevelIndex !== null) {
    l7TargetGain = hoveredLevelIndex === 7 ? l7BaseGain * HOVER_BOOST : l7BaseGain * HOVER_DUCK * phaseFactor;
  } else if (fanoBoostSet !== null) {
    l7TargetGain = fanoBoostSet.has(7) ? l7BaseGain * HOVER_BOOST : l7BaseGain * HOVER_DUCK * phaseFactor;
  } else {
    l7TargetGain = l7BaseGain * phaseFactor;
  }
  if (droneMuted) {
    const l7IsActive = hoveredLevelIndex === 7 || fanoBoostSet?.has(7) === true;
    l7TargetGain = l7IsActive ? l7BaseGain * HOVER_BOOST : 0;
  }
  nodes.gl32L7Osc.frequency.setTargetAtTime(targetFrequency(levels, l7TargetLevel, activeAlpha, pitchMappingMode), now, RAMP_TC);
  nodes.gl32L7Gain.gain.setTargetAtTime(l7TargetLevel === 7 ? 0 : l7TargetGain, now, RAMP_TC);
  nodes.gl32L7Panner.pan.setTargetAtTime(targetPan(levels, l7TargetLevel, activeAlpha, panEnabled), now, RAMP_TC);

  // Exactly one source maps to L7. Render that source through the persistent
  // noise node while its oscillator is muted. Identity behavior for source L7
  // remains unchanged.
  const noiseSourceLevel = GL32_IDENTITY_PERMUTATION.slice(1).find((sourceLevel) => mappedLevel(levelPermutation, sourceLevel) === 7) ?? 7;
  const noiseSourceTone = levelToneNorm(levels, noiseSourceLevel);
  const noiseToneRadius = originMode === 0 ? noiseSourceTone : 1 - noiseSourceTone;
  const noiseBase = NOISE_GAIN * (noiseSourceLevel === 7 || toneMode === "grbTone" ? noiseToneRadius : 1);
  let noiseTarget = noiseBase * phaseFactor;
  if (hoveredLevelIndex === noiseSourceLevel) noiseTarget = noiseBase * HOVER_BOOST;
  else if (hoveredLevelIndex !== null) noiseTarget = noiseBase * HOVER_DUCK;
  else if (fanoBoostSet !== null) {
    noiseTarget = noiseSourceLevel !== 7 && fanoBoostSet.has(noiseSourceLevel) ? noiseBase * HOVER_BOOST : noiseBase * HOVER_DUCK;
  }
  const noiseIsActive = hoveredLevelIndex === noiseSourceLevel || (noiseSourceLevel !== 7 && fanoBoostSet?.has(noiseSourceLevel) === true);
  const finalNoise = droneMuted ? (noiseIsActive ? noiseBase * HOVER_BOOST : 0) : noiseTarget;
  nodes.noiseGain.gain.setTargetAtTime(finalNoise, now, DUCK_TC);

  // FM synthesis: update modulator parameters if enabled
  if (fmEnabled && nodes.fmOscs.length > 0) {
    let pairIdx = 0;
    for (const [carrierLevelIndex, modulatorLevelIndex] of C2_PAIRS) {
      if (pairIdx >= nodes.fmOscs.length) break;
      const carrierLevel = levels.find((level) => level.levelIndex === carrierLevelIndex);
      const modulatorLevel = levels.find((level) => level.levelIndex === modulatorLevelIndex);
      if (!carrierLevel || !modulatorLevel) {
        pairIdx++;
        continue;
      }
      nodes.fmOscs[pairIdx].frequency.setTargetAtTime(
        targetFrequency(levels, mappedLevel(levelPermutation, modulatorLevelIndex), activeAlpha, pitchMappingMode),
        now,
        RAMP_TC,
      );
      const modIndex = Math.abs(carrierLevel.toneNorm - modulatorLevel.toneNorm) * 400;
      nodes.fmGains[pairIdx].gain.setTargetAtTime(modIndex, now, RAMP_TC);
      pairIdx++;
    }
  }
}
