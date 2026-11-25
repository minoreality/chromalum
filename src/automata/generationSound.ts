import { semitoneToFreq } from "../data/music-frequency";
import { PLANE_SIZE, type VisibleEvolution } from "./model";

const NOTE_SECONDS = 0.35;
const EDIT_SECONDS = 0.08;
// A single flipped cell contributes 1/8 power per active voice. Play a brush tap at half its amplitude.
const EDIT_GAIN = 0.5 * Math.sqrt(1 / 8);
// Matches the sustained chord's level to the single-step chord in the Flow audition.
const DRAG_GAIN = 0.424;
const DRAG_IDLE_SECONDS = 0.24;
const masks = [1, 2, 3, 4, 5, 6, 7];
const oddParity = new Set([1, 2, 4, 7]);
type VoicePower = { cell: number; edge: number };
// B, R, RB, G, GB, GR, GRB. Complementary tests are voiced an octave apart.
const voiceSettings = [0, 4, 19, 7, 16, 12, -12].map((semitones, i) => ({
  frequency: semitoneToFreq(semitones),
  masks: masks.filter((change) => oddParity.has(change & (i + 1))),
}));

function sampleVoices(sampleRate: number) {
  const length = Math.round(NOTE_SECONDS * sampleRate);
  const voices = voiceSettings.map((settings) => ({
    ...settings,
    cell: new Float32Array(length),
    edge: new Float32Array(length),
  }));
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attack = Math.sin((Math.PI / 2) * Math.min(1, t / 0.014)) ** 2;
    const release = Math.sin((Math.PI / 2) * Math.min(1, (NOTE_SECONDS - t) / 0.055)) ** 2;
    const amplitude = 0.32 * attack * Math.exp(-t / 0.16) * release;
    const progress = Math.max(0, Math.min(1, (t - 0.055) / 0.115));
    const edgeMix = progress * progress * (3 - 2 * progress);
    for (const voice of voices) {
      const sample = amplitude * Math.sin(2 * Math.PI * voice.frequency * t);
      voice.cell[i] = sample * (1 - edgeMix);
      voice.edge[i] = sample * edgeMix;
    }
  }
  return { sampleRate, length, voices };
}

let bank: ReturnType<typeof sampleVoices> | undefined;

function voicesAt(sampleRate: number) {
  if (bank?.sampleRate !== sampleRate) bank = sampleVoices(sampleRate);
  return bank;
}

export function generationSpectrum(evolution: VisibleEvolution, from: number, to: number): VoicePower[] | undefined {
  return boardChangeSpectrum(evolution.at(from), evolution.at(to), evolution.neighborOffsets);
}

export function boardChangeSpectrum(
  before: Uint8Array,
  after: Uint8Array,
  neighbors: VisibleEvolution["neighborOffsets"],
): VoicePower[] | undefined {
  const changes = after.map((color, i) => color ^ before[i]);
  const cellCounts = new Uint32Array(8);
  const edgeCounts = new Uint32Array(8);
  let changed = 0;
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (change === 0) continue;
    changed++;
    cellCounts[change]++;
    const x = i % PLANE_SIZE;
    const y = Math.floor(i / PLANE_SIZE);
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      // Cells outside the visible board contribute zero change.
      const neighbor = nx >= 0 && nx < PLANE_SIZE && ny >= 0 && ny < PLANE_SIZE ? changes[ny * PLANE_SIZE + nx] : 0;
      edgeCounts[change ^ neighbor]++;
    }
  }
  if (changed === 0) return;

  // Each nonzero mask activates four voices. Unchanged relations stay in the edge denominator.
  const cellPower = 4 * (changed + 1);
  const edgePower = cellPower * neighbors.length;
  return voiceSettings.map(({ masks }) => ({
    cell: masks.reduce((sum, mask) => sum + cellCounts[mask], 0) / cellPower,
    edge: masks.reduce((sum, mask) => sum + edgeCounts[mask], 0) / edgePower,
  }));
}

export function playGenerationChange(audio: BaseAudioContext, spectrum: readonly VoicePower[]): GainNode {
  const { voices, length } = voicesAt(audio.sampleRate);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (const [index, voice] of voices.entries()) {
    const { cell, edge } = spectrum[index];
    if (!cell && !edge) continue;
    const onset = Math.sqrt(cell);
    const tail = Math.sqrt(edge);
    for (let i = 0; i < samples.length; i++) samples[i] += voice.cell[i] * onset + voice.edge[i] * tail;
  }
  return playBuffer(audio, buffer);
}

export function playPaintChanges(audio: BaseAudioContext, changes: readonly number[]): GainNode | undefined {
  if (!changes.length) return;
  const { voices } = voicesAt(audio.sampleRate);
  const tap = Math.round(EDIT_SECONDS * audio.sampleRate);
  // A fast pointer event can cross several colors. Keep their order within one tap's worth of lead-in.
  const lead = Math.max(1, Math.floor(tap / changes.length));
  const buffer = audio.createBuffer(1, (changes.length - 1) * lead + tap, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (const [index, change] of changes.entries()) {
    const offset = index * lead;
    const length = index === changes.length - 1 ? tap : lead;
    for (const voice of voices) {
      if (!voice.masks.includes(change)) continue;
      for (let i = 0; i < length; i++) samples[offset + i] += voice.cell[i];
    }
    for (let i = 0; i < length; i++) {
      const release = Math.min(1, (2 * (length - 1 - i)) / length);
      samples[offset + i] *= EDIT_GAIN * release * release;
    }
  }
  return playBuffer(audio, buffer);
}

function playBuffer(audio: BaseAudioContext, buffer: AudioBuffer): GainNode {
  const note = audio.createBufferSource();
  note.buffer = buffer;
  const output = audio.createGain();
  note.connect(output).connect(audio.destination);
  note.onended = () => {
    note.disconnect();
    output.disconnect();
  };
  note.start(audio.currentTime);
  return output;
}

function sustainedTone(audio: BaseAudioContext, frequency: number, gain: number, response: number, decay: number, start: number) {
  const oscillator = audio.createOscillator();
  const output = audio.createGain();
  const level = output.gain;
  oscillator.frequency.value = frequency;
  level.value = 0;
  oscillator.connect(output).connect(audio.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    output.disconnect();
  };
  oscillator.start(start);
  return {
    update(power: number, now: number) {
      level.cancelScheduledValues(now);
      level.setTargetAtTime(gain * power, now, response);
      // Moving again replaces this fade, including after a pause with the pointer held.
      level.setTargetAtTime(0, now + DRAG_IDLE_SECONDS, decay);
    },
    release(now: number) {
      const releaseAt = now + 0.035;
      level.cancelScheduledValues(releaseAt);
      level.setTargetAtTime(0, releaseAt, decay);
      oscillator.stop(releaseAt + 8 * decay);
    },
  };
}

export function startDragChord(audio: BaseAudioContext) {
  const start = audio.currentTime;
  const voices = voiceSettings.map(({ frequency }) => ({
    cell: sustainedTone(audio, frequency, DRAG_GAIN, 0.024, 0.045, start),
    edge: sustainedTone(audio, 2 * frequency, DRAG_GAIN * 0.45, 0.064, 0.085, start),
  }));
  return {
    update(spectrum: readonly VoicePower[] | undefined) {
      const now = audio.currentTime;
      for (const [index, voice] of voices.entries()) {
        voice.cell.update(spectrum?.[index].cell ?? 0, now);
        voice.edge.update(spectrum?.[index].edge ?? 0, now);
      }
    },
    release() {
      const now = audio.currentTime;
      for (const voice of voices) {
        voice.cell.release(now);
        voice.edge.release(now);
      }
    },
  };
}
