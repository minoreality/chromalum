import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { LEVEL_INFO, LEVEL_CANDIDATES, DEFAULT_CC, findClosestCandidate } from "../color-engine";
import { SP, C, R, FS, SHADOW, FONT } from "../styles/tokens";
import { useTranslation } from "../i18n";
import { ACTIVE_LEVELS } from "./LinkedVisualization";
import { MusicLinkedVisualization } from "./music/MusicLinkedVisualization";
import { useMusicEngine, type ScaleMode } from "../hooks/useMusicEngine";
import { Oscilloscope } from "./music/Oscilloscope";
import type { DecoderPhase } from "./music/types";
import { MusicAlgebraPanel } from "./music/MusicAlgebraPanel";
import { MusicFanoControls } from "./music/MusicFanoControls";
import { MusicTransportControls } from "./music/MusicTransportControls";
import { S_ALPHA_TRACK, S_HUE_INPUT, S_HUE_TRACK, S_HUE_WRAP } from "./music/music-panel-styles";
import { FANO_LINES } from "../data/theory-data";

/** Find Fano line index for a triple {a, b, a XOR b}, or -1 if not a Fano line */
function findFanoLine(a: number, b: number): number {
  const c = a ^ b;
  const triple = [a, b, c].sort((x, y) => x - y);
  return FANO_LINES.findIndex((line) => {
    const sorted = [...line].sort((x, y) => x - y);
    return sorted[0] === triple[0] && sorted[1] === triple[1] && sorted[2] === triple[2];
  });
}

export const MusicPanel = React.memo(function MusicPanel() {
  const { t } = useTranslation();

  // Shared state (replaces GlazeContext for this tab)
  const [hueAngle, setHueAngle] = useState(0);
  const [directCandidates, setDirectCandidates] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    for (let lv = 1; lv <= 6; lv++) m.set(lv, DEFAULT_CC[lv]);
    return m;
  });
  const [hoveredCandidate, setHoveredCandidate] = useState<{ lv: number; ci: number } | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set());

  // Track candidate indices for hue-drag tone burst
  const prevCandidatesRef = useRef<Map<number, number>>(new Map());

  // Audio state — always enabled, initAudio called on first interaction
  const audioInitedRef = useRef(false);
  const ensureAudio = useCallback(() => {
    if (!audioInitedRef.current) {
      audioInitedRef.current = true;
    }
  }, []);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const preMuteVolumeRef = useRef(0.7);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("diatonic7");
  const [fmEnabled, setFmEnabled] = useState(false);
  const [alphaSpeed, setAlphaSpeed] = useState(36);
  const [phaseSpeed, setPhaseSpeed] = useState(0);
  const [hueSpeed, setHueSpeed] = useState(36);
  const [hoveredFanoLine, setHoveredFanoLine] = useState<number | null>(null);

  // LinkedVisualization alpha state (lifted here for audio engine access)
  const [alpha0, setAlpha0] = useState(0);
  const [alpha7, setAlpha7] = useState(0);
  const [originMode, setOriginMode] = useState<0 | 7>(0);
  const [droneMuted, setDroneMuted] = useState(true);

  // Auto-rotation state
  const [alphaDir, setAlphaDir] = useState<1 | -1 | 0>(0);
  const [hueDir, setHueDir] = useState<1 | -1 | 0>(0);
  const prevTimeRef = useRef<number>(0);
  const hueRef = useRef(hueAngle);
  const lastHueRoundedRef = useRef(Math.round(hueAngle));
  useEffect(() => {
    hueRef.current = hueAngle;
    lastHueRoundedRef.current = Math.round(hueAngle);
  }, [hueAngle]);

  useEffect(() => {
    if (alphaDir === 0 && hueDir === 0 && phaseSpeed === 0) return;
    let rafId: number;
    const tick = (time: number) => {
      if (prevTimeRef.current) {
        const dt = (time - prevTimeRef.current) / 1000;
        const base = alphaDir !== 0 ? alphaSpeed * dt * alphaDir : 0;
        const drift = phaseSpeed * dt;
        const a0d = base + (originMode === 0 ? drift : 0);
        const a7d = base + (originMode === 7 ? drift : 0);
        if (a0d !== 0) setAlpha0((a) => (((a + a0d) % 360) + 360) % 360);
        if (a7d !== 0) setAlpha7((a) => (((a + a7d) % 360) + 360) % 360);
        if (hueDir !== 0) {
          const hd = hueSpeed * dt * hueDir;
          const next = (((hueRef.current + hd) % 360) + 360) % 360;
          hueRef.current = next;
          // Only trigger React re-render when rounded degree changes (candidate may change)
          const rounded = Math.round(next) % 360;
          if (rounded !== lastHueRoundedRef.current) {
            lastHueRoundedRef.current = rounded;
            setHueAngle(next);
          }
        }
      }
      prevTimeRef.current = time;
      rafId = requestAnimationFrame(tick);
    };
    prevTimeRef.current = 0;
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [alphaDir, hueDir, alphaSpeed, phaseSpeed, hueSpeed, originMode]);

  // Algebra state (non-explorer cards)
  const [gray3Playing, setGray3Playing] = useState(false);
  const [weightPlaying, setWeightPlaying] = useState(false);
  const [weightStep, setWeightStep] = useState<{ positions: number[]; weight: number; index: number } | null>(null);
  const [hammingMode, setHammingMode] = useState<"743" | "844">("743");
  const [cayleyRow, setCayleyRow] = useState(1);
  const [luminanceMode, setLuminanceMode] = useState<"symmetric" | "luminance">("symmetric");
  const [andStep, setAndStep] = useState<{ pairIndex: number; phase: "operands" | "result" } | null>(null);
  const [gray3Code, setGray3Code] = useState<number | null>(null);
  const [cayleyCol, setCayleyCol] = useState(-1);
  const [gl32Perm, setGl32Perm] = useState([0, 1, 2, 3, 4, 5, 6, 7]);
  const [gl32Flash, setGl32Flash] = useState(false);
  const [distA, setDistA] = useState(5);
  const [distB, setDistB] = useState(3);
  const [distC, setDistC] = useState(6);
  const [distPhase, setDistPhase] = useState<"bxc" | "left" | "ab" | "ac" | "right" | "equal" | null>(null);
  const [octaA, setOctaA] = useState(1);
  const [octaB, setOctaB] = useState(2);
  const [octaPhase, setOctaPhase] = useState<"pair" | "result" | null>(null);

  // Fano plane sidebar state
  const [grayStep, setGrayStep] = useState<number | null>(null);
  const [rhythmPlaying, setRhythmPlaying] = useState(false);
  // Multi-line state: each beat can trigger up to 3 Fano lines simultaneously.
  const [rhythmFiringLines, setRhythmFiringLines] = useState<number[]>([]);
  const [rhythmTempo, setRhythmTempo] = useState(120);
  const [xorA, setXorA] = useState<number | null>(null);
  const [xorB, setXorB] = useState<number | null>(null);
  const [xorStep, setXorStep] = useState<number | null>(null);
  const [fanoContextPoint, setFanoContextPoint] = useState(1);
  const [fanoContextLine, setFanoContextLine] = useState(-1);
  const [partitionPhase, setPartitionPhase] = useState<"line" | "complement" | null>(null);
  const [partitionLineIndex, setPartitionLineIndex] = useState(0);

  // Signals for explorer components to stop/reset
  const [stopSignal, setStopSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const backgroundStoppedRef = useRef(false);

  // Cross-card state: K8 layer ↔ TetraSplit phase
  const [k8Layer, setK8Layer] = useState<1 | 2 | 3 | null>(null);
  const [tetraPhase, setTetraPhase] = useState<"t0" | "t1" | null>(null);

  // Cross-card state: Parity ↔ Error Correction
  const [errorPos, setErrorPos] = useState(1);
  const [errorPhase, setErrorPhase] = useState<DecoderPhase>(null);

  // Compute sonification levels
  const sonificationLevels = useMemo(() => {
    return ACTIVE_LEVELS.map((lv) => {
      const ci = directCandidates.has(lv) ? directCandidates.get(lv)! : findClosestCandidate(lv, hueAngle);
      const cand = LEVEL_CANDIDATES[lv][ci];
      return cand ? { lv, angle: cand.angle, gray: LEVEL_INFO[lv].gray } : { lv, angle: 0, gray: 0 };
    });
  }, [hueAngle, directCandidates]);

  // Audio engine
  const engine = useMusicEngine({
    enabled: true,
    levels: sonificationLevels,
    hoveredLv: hoveredCandidate?.lv ?? null,
    alpha0,
    alpha7,
    volume: muted ? 0 : volume,
    scaleMode,
    fmEnabled,
    panEnabled: true,
    hoveredFanoLine,
    luminanceMode,
    originMode,
  });

  const activeAlpha = originMode === 0 ? alpha0 : alpha7;
  const triggerToneBurstAtActiveAlpha = useCallback(
    (lv: number, angle: number) => {
      engine.triggerToneBurst(lv, angle >= 0 ? angle + activeAlpha : angle);
    },
    [activeAlpha, engine],
  );

  // Init audio on mount (tab click provides user gesture for AudioContext)
  useEffect(() => {
    engine.initAudio();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume drone when user interacts with LinkedVisualization controls
  const resumeDrone = useCallback(() => {
    if (droneMuted) {
      engine.setDroneMuted(false);
      setDroneMuted(false);
    }
  }, [droneMuted, engine]);

  const handleAlphaPlay = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setAlphaDir((d) => (d === 1 ? 0 : 1));
  }, [engine, resumeDrone]);
  const handleAlphaReverse = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setAlphaDir((d) => (d === -1 ? 0 : -1));
  }, [engine, resumeDrone]);
  const handleHuePlay = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setHueDir((d) => (d === 1 ? 0 : 1));
  }, [engine, resumeDrone]);
  const handleHueReverse = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setHueDir((d) => (d === -1 ? 0 : -1));
  }, [engine, resumeDrone]);

  // Stop All handler
  const handleStopAll = useCallback(() => {
    engine.stopGrayMelody?.();
    engine.stopFanoRhythm?.();
    engine.stopAlgebra?.();
    engine.stopZigzagMelody?.();
    setAlphaDir(0);
    setHueDir(0);
    // Fano plane sidebar state
    setGrayStep(null);
    setRhythmPlaying(false);
    setRhythmFiringLines([]);
    setXorStep(null);
    setFanoContextLine(-1);
    setPartitionPhase(null);
    // Non-explorer transient state
    setGray3Playing(false);
    setWeightPlaying(false);
    setWeightStep(null);
    setAndStep(null);
    setGray3Code(null);
    setCayleyCol(-1);
    setDistPhase(null);
    setOctaPhase(null);
    setGl32Flash(false);
    setK8Layer(null);
    setTetraPhase(null);
    setErrorPhase(null);
    // Signal explorer components to reset transient state
    setStopSignal((s) => s + 1);
    engine.setDroneMuted(true);
    setDroneMuted(true);
  }, [engine]);

  const handleBackgroundStop = useCallback(() => {
    if (backgroundStoppedRef.current) return;
    backgroundStoppedRef.current = true;
    handleStopAll();
    engine.stopAudio();
  }, [engine, handleStopAll]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBackgroundStop();
      } else if (document.visibilityState === "visible") {
        backgroundStoppedRef.current = false;
      }
    };
    const onPageHide = () => handleBackgroundStop();
    const onPageShow = () => {
      backgroundStoppedRef.current = false;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [handleBackgroundStop]);

  // Reset Defaults handler
  const handleResetDefaults = useCallback(() => {
    handleStopAll();
    engine.setDroneMuted(false);
    setDroneMuted(false);
    setHueAngle(0);
    // Force the canonical 6-color palette (RGB light primaries + CMY pigment primaries):
    // L1=Blue, L2=Red, L3=Magenta, L4=Green, L5=Cyan, L6=Yellow.
    const canonical = new Map<number, number>();
    for (let lv = 1; lv <= 6; lv++) canonical.set(lv, DEFAULT_CC[lv]);
    setDirectCandidates(canonical);
    setSelectedLevels(new Set());
    setVolume(0.7);
    setScaleMode("diatonic7");
    setFmEnabled(false);
    setAlphaSpeed(36);
    setPhaseSpeed(0);
    setHueSpeed(36);
    setAlpha0(0);
    setAlpha7(0);
    setLuminanceMode("symmetric");
    setRhythmTempo(120);
    setFanoContextPoint(1);
    setPartitionLineIndex(0);
    engine.resetGL32Transform?.((perm) => setGl32Perm(perm));
    // null (not 0): 0 would trigger engine's fano-line-0 gain boost → audible "chord".
    setHoveredFanoLine(null);
    setDistA(5);
    setDistB(3);
    setDistC(6);
    setOctaA(1);
    setOctaB(2);
    // Signal explorer components to reset defaults
    setResetSignal((s) => s + 1);
  }, [handleStopAll, engine]);

  // Handlers
  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.initAudio();
      resumeDrone();
      setHueAngle(Number(e.target.value));
      setDirectCandidates(new Map());
      setSelectedLevels(new Set());
    },
    [engine, resumeDrone],
  );

  const handleAlphaBarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.initAudio();
      resumeDrone();
      const v = Number(e.target.value);
      setAlpha0(v);
      setAlpha7(v);
    },
    [engine, resumeDrone],
  );

  // Tone burst highlight: flash white then fade out over 500ms (supports multiple simultaneous)
  const [burstHighlight, setBurstHighlight] = useState<Set<number>>(() => new Set());
  const burstTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const handleBlockClick = useCallback(
    (lv: number, angle: number) => {
      ensureAudio();
      engine.initAudio();
      triggerToneBurstAtActiveAlpha(lv, angle);
      // Clear existing timer for this level (handles rapid re-trigger)
      const prev = burstTimersRef.current.get(lv);
      if (prev) clearTimeout(prev);
      // Remove then re-add to force transition restart
      setBurstHighlight((s) => {
        const n = new Set(s);
        n.delete(lv);
        return n;
      });
      requestAnimationFrame(() => {
        setBurstHighlight((s) => new Set(s).add(lv));
        burstTimersRef.current.set(
          lv,
          setTimeout(() => {
            setBurstHighlight((s) => {
              const n = new Set(s);
              n.delete(lv);
              return n;
            });
            burstTimersRef.current.delete(lv);
          }, 20),
        );
      });
    },
    [engine, ensureAudio, triggerToneBurstAtActiveAlpha],
  );

  // Keyboard 1-6: trigger tone burst for corresponding level
  const sonificationLevelsRef = useRef(sonificationLevels);
  useEffect(() => {
    sonificationLevelsRef.current = sonificationLevels;
  }, [sonificationLevels]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k >= "1" && k <= "6") {
        const lv = +k;
        const entry = sonificationLevelsRef.current.find((s) => s.lv === lv);
        if (entry) handleBlockClick(lv, entry.angle);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleBlockClick]);

  // Sequence handlers
  const grayStepCbRef = useRef<(lv: number | null) => void>((lv) => setGrayStep(lv));
  const fanoBeatCbRef = useRef<(lines: number[], pos: number) => void>((lines) => setRhythmFiringLines(lines));

  const handleGrayMelody = useCallback(() => {
    if (grayStep !== null) {
      engine.stopGrayMelody();
      setGrayStep(null);
      return;
    }
    engine.initAudio();
    engine.playGrayMelody(rhythmTempo, grayStepCbRef.current);
  }, [engine, grayStep, rhythmTempo]);

  const handleFanoRhythm = useCallback(() => {
    if (rhythmPlaying) {
      engine.stopFanoRhythm();
      setRhythmPlaying(false);
      return;
    }
    engine.initAudio();
    engine.startFanoRhythm(rhythmTempo, fanoBeatCbRef.current);
    setRhythmPlaying(true);
  }, [engine, rhythmPlaying, rhythmTempo]);

  // Restart playback when BPM changes while playing
  const tempoMountedRef = useRef(false);
  useEffect(() => {
    if (!tempoMountedRef.current) {
      tempoMountedRef.current = true;
      return;
    }
    if (grayStep !== null) {
      engine.stopGrayMelody();
      engine.playGrayMelody(rhythmTempo, grayStepCbRef.current);
    }
    if (rhythmPlaying) {
      engine.stopFanoRhythm();
      engine.startFanoRhythm(rhythmTempo, fanoBeatCbRef.current);
    }
  }, [rhythmTempo]); // eslint-disable-line react-hooks/exhaustive-deps

  // XOR triple handler
  const handlePlayXor = useCallback(() => {
    if (xorA != null && xorB != null) {
      engine.initAudio();
      const fanoIdx = findFanoLine(xorA, xorB);
      if (fanoIdx >= 0) setHoveredFanoLine(fanoIdx);
      engine.playXorTriple?.(xorA, xorB, (lv) => {
        setXorStep(lv);
        if (lv === null && fanoIdx >= 0) setHoveredFanoLine(null);
      });
    }
  }, [engine, xorA, xorB]);

  // Point context handler
  const handlePlayPointContext = useCallback(() => {
    engine.initAudio();
    engine.playPointFanoContext?.(fanoContextPoint, (idx) => {
      setFanoContextLine(idx ?? -1);
      setHoveredFanoLine(idx ?? null);
    });
  }, [engine, fanoContextPoint]);

  // Line + Complement handler
  const selectedFanoLine = hoveredFanoLine ?? 0;
  const handlePlayPartition = useCallback(() => {
    if (partitionPhase !== null) {
      engine.stopAlgebra?.();
      setPartitionPhase(null);
    } else {
      setPartitionLineIndex(selectedFanoLine);
      engine.initAudio();
      setPartitionPhase(null);
      engine.playLineAndComplement?.(selectedFanoLine, (phase) => setPartitionPhase(phase));
    }
  }, [engine, partitionPhase, selectedFanoLine]);

  // Fano node click → XOR selection
  const handleFanoNodeClick = useCallback(
    (lv: number) => {
      if (xorA == null) {
        setXorA(lv);
      } else if (xorB == null) {
        setXorB(lv);
      } else {
        setXorA(lv);
        setXorB(null);
      }
    },
    [xorA, xorB],
  );

  // Fano line click → Line+Complement selection
  const handleFanoLineClick = useCallback((lineIndex: number) => {
    setHoveredFanoLine(lineIndex);
  }, []);

  // Level preview (same as GlazePanel)
  const levelPreview = useMemo(() => {
    return LEVEL_INFO.map((info, lv) => {
      const candidates = LEVEL_CANDIDATES[lv];
      const ci = directCandidates.has(lv) ? directCandidates.get(lv)! : findClosestCandidate(lv, hueAngle);
      const rgb = candidates[ci]?.rgb ?? [128, 128, 128];
      return { lv, name: info.name, rgb, hex: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
    });
  }, [hueAngle, directCandidates]);

  const activeLevels = useMemo(
    () => levelPreview.filter((lp) => lp.lv >= 1 && lp.lv <= 6).map((lp) => ({ lv: lp.lv, rgb: lp.rgb as [number, number, number] })),
    [levelPreview],
  );

  // Hue marker position
  const hueMarkerLeft = `${((hueAngle % 360) / 360) * 100}%`;
  const alphaMarkerLeft = `${((((alpha0 % 360) + 360) % 360) / 360) * 100}%`;

  // Candidate switch-point tick marks (memoized once)
  const hueTicks = useMemo(() => {
    const ticks: { deg: number; color: string }[] = [];
    for (let lv = 2; lv <= 5; lv++) {
      const cands = LEVEL_CANDIDATES[lv];
      if (cands.length <= 1 || cands[0].angle < 0) continue;
      const angles = cands.map((c) => c.angle).sort((a, b) => a - b);
      for (let i = 0; i < angles.length; i++) {
        const a1 = angles[i];
        const a2 = angles[(i + 1) % angles.length];
        const diff = (a2 - a1 + 360) % 360;
        const mid = (a1 + diff / 2) % 360;
        ticks.push({ deg: mid, color: `rgb(${cands[0].rgb.join(",")})` });
      }
    }
    return ticks;
  }, []);

  // Disabled style for play buttons when audio is off
  // All buttons auto-init audio on click; no disabled state needed

  const handleBgTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Reset hover state when tapping non-interactive background areas
    const el = e.target as HTMLElement;
    if (el.closest("button, [role='button'], input, select, a, canvas, svg")) return;
    setHoveredCandidate(null);
    setHoveredFanoLine(null);
  }, []);

  return (
    <div onClick={handleBgTap} style={{ display: "flex", flexDirection: "column", gap: SP.md, padding: `0 ${SP.md}px ${SP.md}px` }}>
      <div className="panel-layout music-layout">
        {/* ═══ Left Column: Visualizations ═══ */}
        <div className="panel-canvas" style={{ "--display-max": "420px" } as React.CSSProperties}>
          {/* Title — same style as other tabs */}
          <div style={{ fontSize: FS.md, color: C.textDim, textAlign: "center", lineHeight: "14px", marginBottom: SP.md }}>
            {t("music_title")}
          </div>

          {/* Hue angle slider with marker */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: SP.md }}>
            <div style={{ fontSize: FS.lg, color: C.textPrimary, textAlign: "center", fontFamily: FONT.mono }}>
              {t("glaze_hue_angle")}: {Math.round(hueAngle % 360)}&deg;
            </div>
            <div style={S_HUE_WRAP}>
              <div style={S_HUE_TRACK} />
              {/* Marker triangle */}
              <div
                style={{
                  position: "absolute",
                  top: 1,
                  left: hueMarkerLeft,
                  transform: "translateX(-5px)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `6px solid ${C.textPrimary}`,
                  pointerEvents: "none",
                }}
              />
              {/* Candidate switch-point tick marks (above the bar) */}
              {hueTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: 3,
                    left: `${(tick.deg / 359) * 100}%`,
                    transform: "translateX(-0.5px)",
                    width: 1,
                    height: 5,
                    background: C.textDimmer,
                    pointerEvents: "none",
                  }}
                />
              ))}
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(hueAngle) % 360}
                onChange={handleHueChange}
                aria-label={t("aria_hue_slider")}
                style={S_HUE_INPUT}
              />
            </div>
            {/* Alpha angle bar */}
            <div style={{ fontSize: FS.lg, color: C.textPrimary, textAlign: "center", fontFamily: FONT.mono }}>
              {"\u03b1"}: {Math.round(((alpha0 % 360) + 360) % 360)}&deg;
            </div>
            <div style={S_HUE_WRAP}>
              <div style={S_ALPHA_TRACK} />
              {/* Marker triangle */}
              <div
                style={{
                  position: "absolute",
                  top: 1,
                  left: alphaMarkerLeft,
                  transform: "translateX(-5px)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `6px solid ${C.textPrimary}`,
                  pointerEvents: "none",
                }}
              />
              {/* 60° interval tick marks */}
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <div
                  key={deg}
                  style={{
                    position: "absolute",
                    top: 3,
                    left: `${(deg / 360) * 100}%`,
                    transform: "translateX(-0.5px)",
                    width: 1,
                    height: 5,
                    background: C.textDimmer,
                    pointerEvents: "none",
                  }}
                />
              ))}
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(((alpha0 % 360) + 360) % 360)}
                onChange={handleAlphaBarChange}
                aria-label={t("aria_alpha_angle")}
                style={S_HUE_INPUT}
              />
            </div>
          </div>

          {/* Level preview — 2D candidate grid with tone burst */}
          <div style={{ display: "flex", gap: SP.sm, justifyContent: "center", alignItems: "center", marginTop: SP.lg }}>
            {levelPreview.map((lp) => {
              const cands = LEVEL_CANDIDATES[lp.lv];
              const hasCands = cands.length > 1;
              const isDirect = directCandidates.has(lp.lv);
              const directIdx = directCandidates.get(lp.lv);
              const autoIdx = hasCands ? findClosestCandidate(lp.lv, hueAngle) : 0;
              const currentIdx = isDirect ? directIdx! : autoIdx;
              const prevIdx = hasCands ? (currentIdx - 1 + cands.length) % cands.length : -1;
              const nextIdx = hasCands ? (currentIdx + 1) % cands.length : -1;

              const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;

              const makeSwatch = (ci: number, size: number) => {
                const cand = cands[ci];
                const candHex = `#${cand.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
                const isSwatchHovered = hoveredCandidate !== null && hoveredCandidate.lv === lp.lv && hoveredCandidate.ci === ci;
                const swatchClick = () => {
                  setDirectCandidates((prev) => {
                    const next = new Map(prev);
                    next.set(lp.lv, ci);
                    return next;
                  });
                  setSelectedLevels((prev) => {
                    const next = new Set(prev);
                    next.delete(lp.lv);
                    return next;
                  });
                  setHoveredCandidate(null);
                  handleBlockClick(lp.lv, cand.angle);
                };
                return (
                  <div
                    key={ci}
                    role="button"
                    tabIndex={0}
                    aria-label={t("aria_color_candidate", lp.lv, candHex, `${Math.round(cand.angle)}°`)}
                    onClick={swatchClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        swatchClick();
                      }
                    }}
                    onPointerEnter={isTouchDevice ? undefined : () => setHoveredCandidate({ lv: lp.lv, ci })}
                    onPointerLeave={isTouchDevice ? undefined : () => setHoveredCandidate(null)}
                    title={`${candHex} ${Math.round(cand.angle)}\u00B0`}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: R.md,
                      cursor: "pointer",
                      background: `rgb(${cand.rgb.join(",")})`,
                      border: `2px solid ${C.border}`,
                      boxSizing: "border-box" as const,
                      boxShadow: isSwatchHovered ? SHADOW.glow(C.accent) : "none",
                      transition: "background 0.4s, box-shadow 0.15s, border-color 0.15s",
                    }}
                  />
                );
              };

              const cycleCand = (dir: number) => {
                const cur = directCandidates.has(lp.lv) ? directCandidates.get(lp.lv)! : autoIdx;
                const newIdx = (((cur + dir) % cands.length) + cands.length) % cands.length;
                setDirectCandidates((prev) => {
                  const next = new Map(prev);
                  next.set(lp.lv, newIdx);
                  return next;
                });
                setHoveredCandidate({ lv: lp.lv, ci: newIdx });
              };

              const handleWheel = hasCands
                ? (e: React.WheelEvent) => {
                    e.preventDefault();
                    cycleCand(e.deltaY > 0 ? 1 : -1);
                  }
                : undefined;

              const swipeStartRef = { current: 0, startX: 0 };
              const handleTouchStart = hasCands
                ? (e: React.TouchEvent) => {
                    swipeStartRef.current = e.touches[0].clientY;
                    swipeStartRef.startX = e.touches[0].clientX;
                  }
                : undefined;
              const handleTouchEnd = hasCands
                ? (e: React.TouchEvent) => {
                    const dy = e.changedTouches[0].clientY - swipeStartRef.current;
                    const dx = e.changedTouches[0].clientX - swipeStartRef.startX;
                    // Only cycle if intentional vertical swipe (not a tap)
                    if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) cycleCand(dy > 0 ? 1 : -1);
                  }
                : undefined;

              return (
                <div
                  key={lp.lv}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    cursor: hasCands ? "pointer" : "default",
                    touchAction: hasCands ? "none" : "auto",
                  }}
                >
                  {/* Upper candidate */}
                  {hasCands ? makeSwatch(prevIdx, 20) : <div style={{ height: 20 }} />}
                  {/* Current / main swatch */}
                  {(() => {
                    const mainCi = currentIdx;
                    const mainCand = cands[mainCi];
                    const mainHex = mainCand ? `#${mainCand.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}` : "";
                    const isMainHovered = hoveredCandidate !== null && hoveredCandidate.lv === lp.lv && hoveredCandidate.ci === mainCi;
                    const isSelected = selectedLevels.has(lp.lv);
                    const isBurst = burstHighlight.has(lp.lv);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={mainCand ? t("aria_color_candidate", lp.lv, mainHex, `${Math.round(mainCand.angle)}°`) : undefined}
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!mainCand) return;
                          setSelectedLevels((prev) => {
                            const next = new Set(prev);
                            if (isSelected) next.delete(lp.lv);
                            else next.add(lp.lv);
                            return next;
                          });
                          handleBlockClick(lp.lv, mainCand.angle);
                        }}
                        onKeyDown={
                          isTouchDevice
                            ? undefined
                            : (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (!mainCand) return;
                                  setSelectedLevels((prev) => {
                                    const next = new Set(prev);
                                    if (isSelected) next.delete(lp.lv);
                                    else next.add(lp.lv);
                                    return next;
                                  });
                                  handleBlockClick(lp.lv, mainCand.angle);
                                }
                              }
                        }
                        onPointerEnter={isTouchDevice ? undefined : () => setHoveredCandidate({ lv: lp.lv, ci: mainCi })}
                        onPointerLeave={isTouchDevice ? undefined : () => setHoveredCandidate(null)}
                        title={mainCand ? `${mainHex} ${Math.round(mainCand.angle)}\u00B0` : undefined}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: R.md,
                          background: isDirect ? `rgb(${cands[directIdx!]?.rgb.join(",")})` : lp.hex,
                          border: `2px solid ${isBurst ? "#ffffff" : isMainHovered || isSelected ? C.accent : C.border}`,
                          boxSizing: "border-box" as const,
                          cursor: "pointer",
                          boxShadow: isBurst ? SHADOW.glow("#ffffff") : isMainHovered ? SHADOW.glow(C.accent) : "none",
                          transition: isBurst ? "none" : "background 0.4s, box-shadow 0.5s, border-color 0.5s",
                        }}
                      />
                    );
                  })()}
                  {/* Lower candidate */}
                  {hasCands ? makeSwatch(nextIdx, 20) : <div style={{ height: 20 }} />}
                </div>
              );
            })}
          </div>

          {/* LinkedVisualization */}
          <MusicLinkedVisualization
            hueAngle={hueAngle}
            brushLevel={0}
            onHueAngleChange={(a) => {
              engine.initAudio();
              resumeDrone();
              // Tone burst when candidate changes; pitch follows the active alpha rotation.
              for (const lv of ACTIVE_LEVELS) {
                const ci = findClosestCandidate(lv, a);
                const prev = prevCandidatesRef.current.get(lv);
                if (prev !== undefined && prev !== ci) {
                  const cand = LEVEL_CANDIDATES[lv][ci];
                  if (cand && cand.angle >= 0) triggerToneBurstAtActiveAlpha(lv, cand.angle);
                }
                prevCandidatesRef.current.set(lv, ci);
              }
              setHueAngle(a);
              setDirectCandidates(new Map());
              setSelectedLevels(new Set());
            }}
            hoveredCandidate={hoveredCandidate}
            onHoverCandidate={setHoveredCandidate}
            directCandidates={directCandidates}
            scaleMode={scaleMode}
            alpha0={alpha0}
            onAlpha0Change={(a) => {
              engine.initAudio();
              resumeDrone();
              setAlpha0(a);
            }}
            alpha7={alpha7}
            onAlpha7Change={(a) => {
              engine.initAudio();
              resumeDrone();
              setAlpha7(a);
            }}
            onOriginModeChange={(m) => {
              resumeDrone();
              setOriginMode(m);
            }}
          />
        </div>

        {/* ═══ Right Column: Controls ═══ */}
        <div className="panel-sidebar">
          <MusicTransportControls
            scaleMode={scaleMode}
            onScaleModeChange={setScaleMode}
            onStopAll={handleStopAll}
            onResetDefaults={handleResetDefaults}
            luminanceMode={luminanceMode}
            onLuminanceModeChange={setLuminanceMode}
            fmEnabled={fmEnabled}
            onFmEnabledChange={setFmEnabled}
            hueDir={hueDir}
            onHueReverse={handleHueReverse}
            onHuePlay={handleHuePlay}
            hueSpeed={hueSpeed}
            onHueSpeedChange={setHueSpeed}
            alphaDir={alphaDir}
            onAlphaReverse={handleAlphaReverse}
            onAlphaPlay={handleAlphaPlay}
            alphaSpeed={alphaSpeed}
            onAlphaSpeedChange={setAlphaSpeed}
            phaseSpeed={phaseSpeed}
            onPhaseSpeedChange={setPhaseSpeed}
            muted={muted}
            volume={volume}
            onMuteToggle={() => {
              if (muted) {
                setMuted(false);
                setVolume(preMuteVolumeRef.current);
              } else {
                preMuteVolumeRef.current = volume;
                setMuted(true);
              }
              if (droneMuted) {
                engine.setDroneMuted(false);
                setDroneMuted(false);
              }
            }}
            onVolumeChange={(v) => {
              engine.initAudio();
              setVolume(v);
              if (muted && v > 0) setMuted(false);
            }}
          />

          {/* Oscilloscope */}
          <Oscilloscope analyserNode={engine.analyserNode} />

          <MusicFanoControls
            hoveredFanoLine={hoveredFanoLine}
            onHoveredFanoLineChange={setHoveredFanoLine}
            onFanoNodeClick={handleFanoNodeClick}
            onFanoLineClick={handleFanoLineClick}
            activeLevels={activeLevels}
            grayStep={grayStep}
            xorStep={xorStep}
            rhythmPlaying={rhythmPlaying}
            rhythmFiringLines={rhythmFiringLines}
            partitionPhase={partitionPhase}
            partitionLineIndex={partitionLineIndex}
            xorA={xorA}
            xorB={xorB}
            onXorAChange={setXorA}
            onXorBChange={setXorB}
            onPlayXor={handlePlayXor}
            fanoContextPoint={fanoContextPoint}
            onFanoContextPointChange={setFanoContextPoint}
            fanoContextLine={fanoContextLine}
            onPlayPointContext={handlePlayPointContext}
            selectedFanoLine={selectedFanoLine}
            onSelectedFanoLineChange={setHoveredFanoLine}
            onPlayPartition={handlePlayPartition}
            onGrayMelody={handleGrayMelody}
            onFanoRhythm={handleFanoRhythm}
            rhythmTempo={rhythmTempo}
            onRhythmTempoChange={setRhythmTempo}
          />
        </div>
      </div>

      <MusicAlgebraPanel
        engine={engine}
        activeLevels={activeLevels}
        stopSignal={stopSignal}
        resetSignal={resetSignal}
        cayleyRow={cayleyRow}
        onCayleyRowChange={setCayleyRow}
        cayleyCol={cayleyCol}
        onCayleyColChange={setCayleyCol}
        distA={distA}
        onDistAChange={setDistA}
        distB={distB}
        onDistBChange={setDistB}
        distC={distC}
        onDistCChange={setDistC}
        distPhase={distPhase}
        onDistPhaseChange={setDistPhase}
        andStep={andStep}
        onAndStepChange={setAndStep}
        errorPos={errorPos}
        errorPhase={errorPhase}
        onErrorPosChange={setErrorPos}
        onErrorPhaseChange={setErrorPhase}
        hammingMode={hammingMode}
        onHammingModeChange={setHammingMode}
        weightPlaying={weightPlaying}
        onWeightPlayingChange={setWeightPlaying}
        weightStep={weightStep}
        onWeightStepChange={setWeightStep}
        onHoveredFanoLineChange={setHoveredFanoLine}
        octaA={octaA}
        onOctaAChange={setOctaA}
        octaB={octaB}
        onOctaBChange={setOctaB}
        octaPhase={octaPhase}
        onOctaPhaseChange={setOctaPhase}
        gray3Playing={gray3Playing}
        onGray3PlayingChange={setGray3Playing}
        gray3Code={gray3Code}
        onGray3CodeChange={setGray3Code}
        k8Layer={k8Layer}
        onK8LayerChange={setK8Layer}
        tetraPhase={tetraPhase}
        onTetraPhaseChange={setTetraPhase}
        gl32Perm={gl32Perm}
        onGl32PermChange={setGl32Perm}
        gl32Flash={gl32Flash}
        onGl32FlashChange={setGl32Flash}
      />
    </div>
  );
});
