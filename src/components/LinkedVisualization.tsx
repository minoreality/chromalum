import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { SP, C, R } from "../styles/tokens";
import { S_CURSOR_POINTER } from "../styles/shared";
import { useTranslation } from "../i18n";
import { normalizeHueAngleDeg } from "../music/music-phase";
import { LinkedVisualizationGuides } from "./LinkedVisualizationGuides";
import { LinkedVisualizationLegend } from "./LinkedVisualizationLegend";
import { BottomProjectionGraph, RightProjectionGraph } from "./LinkedVisualizationProjectionGraphs";
import { LinkedVisualizationWheel } from "./LinkedVisualizationWheel";
import {
  buildLinkedVisualizationDots,
  BXright,
  BY,
  clampHueFromBottomGraphY,
  clampHueFromRightGraphX,
  cosinePath,
  CX,
  CY,
  toneR0,
  toneR7,
  LV_COLORS,
  sinePath,
  TH,
  TW,
  WO,
  type LinkedVisualizationDot,
  type LinkedVisualizationHover,
} from "./linked-visualization-geometry";

export type { LinkedVisualizationDot } from "./linked-visualization-geometry";

export interface LinkedVisualizationOverlayContext {
  activeDots: LinkedVisualizationDot[];
  activeAlpha: number;
  hoveredDot: LinkedVisualizationHover | null;
  setHoveredDot: (d: LinkedVisualizationHover | null) => void;
  x: number;
  y: number;
  rowHeight: number;
  width: number;
}

export interface LinkedVisualizationProps {
  hueAngleDeg: number;
  brushLevel: number;
  onHueAngleDegChange?: (angle: number) => void;
  hoveredCandidate?: LinkedVisualizationHover | null;
  onHoverCandidate?: (d: LinkedVisualizationHover | null) => void;
  candidateOverridesByLevel?: Map<number, number>;
  showLegend?: boolean;
  bottomRightOverlay?: (ctx: LinkedVisualizationOverlayContext) => React.ReactNode;
  /** Controlled alpha state (for Music tab integration) */
  alpha0?: number;
  onAlpha0Change?: (angleDeg: number) => void;
  alpha7?: number;
  onAlpha7Change?: (angleDeg: number) => void;
  /** Controlled L0/L7 origin state (for Music tab integration) */
  originMode?: 0 | 7;
  onOriginModeChange?: (mode: 0 | 7) => void;
}

const DOT_HIT_R = 10;
const DOT_TRANSITION = "r 0.3s, opacity 0.3s, stroke 0.3s, stroke-width 0.3s, fill 0.3s";

/**
 * Letting go of the wheel leaves it turning. Speed is averaged over this much
 * of the closing travel rather than the last pair of moves, which at a touch
 * screen's sampling rate is mostly jitter. The window is measured back from the
 * last move and not from the lift, because how densely the pointer was sampled
 * is the device's business: measured from the lift, a pair 126ms and 63ms old
 * left one sample inside the window and no flick at all.
 */
const SPIN_SAMPLE_MS = 90;
/**
 * A finger whose last movement is older than this had stopped before it lifted,
 * and a wheel it stopped stays stopped. Longer than a frame or two of a real
 * flick, shorter than the pause a hand makes when it means to park the wheel.
 */
const SPIN_REST_MS = 120;
/**
 * Velocity decays as exp(-t / SPIN_DECAY_S), so a release carries the wheel
 * about velocity x SPIN_DECAY_S degrees: half a second sends a brisk 720 deg/s
 * flick around once and stops it inside two.
 */
const SPIN_DECAY_S = 0.5;
/** A degree every three frames reads as stopped, so stop. */
const SPIN_MIN_DEG_PER_S = 20;
/** A frame this long is a stall rather than motion, and must not jump the wheel. */
const SPIN_MAX_FRAME_S = 1 / 20;
/**
 * Follow the pointer once it leaves the figure. A capture the browser will not
 * grant - the touch already ended, or the id is not one it is tracking - throws,
 * and losing the drag over it would be worse than following the pointer only
 * while it stays inside.
 */
function capturePointer(element: SVGSVGElement | null, pointerId: number) {
  try {
    element?.setPointerCapture(pointerId);
  } catch {
    /* the pointer is gone; the drag still ends on its own pointerup */
  }
}

/** Shortest way round from one angle to another, in (-180, 180]. */
const angleStep = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

/* ── Toggle button style ── */
const S_TOGGLE: React.CSSProperties = {
  padding: "var(--linked-viz-toggle-padding, 3px 10px)",
  fontSize: "var(--linked-viz-toggle-fs, 11px)",
  lineHeight: "var(--linked-viz-toggle-line, 14px)",
  borderRadius: R.md,
  border: `1px solid ${C.border}`,
  cursor: "pointer",
  background: "transparent",
  color: C.textSecondary,
  transition: "all 0.15s",
  whiteSpace: "nowrap",
};
const S_TOGGLE_ACTIVE: React.CSSProperties = {
  padding: "var(--linked-viz-toggle-padding, 3px 10px)",
  fontSize: "var(--linked-viz-toggle-fs, 11px)",
  lineHeight: "var(--linked-viz-toggle-line, 14px)",
  borderRadius: R.md,
  border: `1px solid ${C.accent}`,
  cursor: "pointer",
  background: C.accent,
  color: C.bgRoot,
  transition: "all 0.15s",
  whiteSpace: "nowrap",
};

export const LinkedVisualization = React.memo(function LinkedVisualization({
  hueAngleDeg,
  brushLevel,
  onHueAngleDegChange,
  hoveredCandidate,
  onHoverCandidate,
  candidateOverridesByLevel,
  showLegend = true,
  bottomRightOverlay,
  alpha0: alpha0Prop,
  onAlpha0Change,
  alpha7: alpha7Prop,
  onAlpha7Change,
  originMode: originModeProp,
  onOriginModeChange,
}: LinkedVisualizationProps) {
  const { t } = useTranslation();
  const [originModeInternal, setOriginModeInternal] = useState<0 | 7>(0);
  const mode = originModeProp ?? originModeInternal;
  const setModeRaw = useCallback(
    (m: 0 | 7) => {
      if (originModeProp === undefined) setOriginModeInternal(m);
      onOriginModeChange?.(m);
    },
    [onOriginModeChange, originModeProp],
  );
  const [alpha0Internal, setAlpha0Internal] = useState(0);
  const [alpha7Internal, setAlpha7Internal] = useState(180);
  const alpha0 = alpha0Prop ?? alpha0Internal;
  const alpha7 = alpha7Prop ?? alpha7Internal;
  const setAlpha0 = useMemo<React.Dispatch<React.SetStateAction<number>>>(
    () =>
      onAlpha0Change
        ? (v) => {
            onAlpha0Change(typeof v === "function" ? (v as (prev: number) => number)(alpha0) : v);
          }
        : setAlpha0Internal,
    [alpha0, onAlpha0Change],
  );
  const setAlpha7 = useMemo<React.Dispatch<React.SetStateAction<number>>>(
    () =>
      onAlpha7Change
        ? (v) => {
            onAlpha7Change(typeof v === "function" ? (v as (prev: number) => number)(alpha7) : v);
          }
        : setAlpha7Internal,
    [alpha7, onAlpha7Change],
  );
  const [localHoveredDot, setLocalHoveredDot] = useState<LinkedVisualizationHover | null>(null);
  const hoveredDot = onHoverCandidate ? (hoveredCandidate ?? null) : localHoveredDot;
  const setHoveredDot = onHoverCandidate ?? setLocalHoveredDot;
  const svgRef = useRef<SVGSVGElement>(null);
  /**
   * The one pointer a drag belongs to. Without the id the ref was a single slot
   * that whichever pointer touched down last would overwrite: resting a second
   * finger on the figure while the first turned the wheel reset the drag origin
   * under it, so alpha jumped 20 deg on contact and the next 80 deg of travel
   * read as 100. A hand steadying the phone is enough to do it.
   */
  const dragRef = useRef<
    | { pointerId: number; type: "wheel"; startAlpha: number; lastAngle: number; travelled: number }
    | { pointerId: number; type: "hue" }
    | { pointerId: number; type: "hue-bottom" }
    | null
  >(null);
  /**
   * How far the wheel has been turned, and when, over the closing stretch of a
   * drag. Travel is accumulated rather than measured against the angle the drag
   * opened at, so it runs past a full turn instead of folding back at the atan2
   * seam, which is what a velocity would otherwise read as a 360 deg jump.
   */
  const spinSamplesRef = useRef<{ time: number; travelled: number }[]>([]);
  const spinRef = useRef<{ velocity: number; alpha: number; mode: 0 | 7; time: number | null; frame: number } | null>(null);
  const setAlphaRef = useRef({ setAlpha0, setAlpha7 });
  useEffect(() => {
    setAlphaRef.current = { setAlpha0, setAlpha7 };
  });

  const stopSpin = useCallback(() => {
    if (spinRef.current) cancelAnimationFrame(spinRef.current.frame);
    spinRef.current = null;
  }, []);
  useEffect(() => stopSpin, [stopSpin]);
  // A coast belongs to the origin it was released under, so switching origin
  // ends it rather than carrying its speed over to the other one's alpha.
  const setMode = useCallback(
    (m: 0 | 7) => {
      stopSpin();
      setModeRaw(m);
    },
    [setModeRaw, stopSpin],
  );

  const activeAlpha = mode === 0 ? alpha0 : alpha7;
  const activeRadiusFn = mode === 0 ? toneR0 : toneR7;

  // Compute dots
  const dots = useMemo(() => {
    return buildLinkedVisualizationDots(hueAngleDeg, candidateOverridesByLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brushLevel triggers re-render for active dot updates
  }, [hueAngleDeg, brushLevel, candidateOverridesByLevel]);

  const activeDots = useMemo(() => dots.filter((d) => d.isActive), [dots]);
  const projectionDots = dots;

  // SVG coordinate conversion
  const svgCoord = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (clientX - rect.left) * (TW / rect.width), y: (clientY - rect.top) * (TH / rect.height) };
  }, []);

  // Wheel rotation drag
  const onWheelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) return;
      // A hand on the platter stops it, the way it stops a record.
      const coasting = spinRef.current;
      stopSpin();
      const pt = svgCoord(e.clientX, e.clientY);
      const angle = (Math.atan2(pt.y - CY, pt.x - CX) * 180) / Math.PI;
      dragRef.current = {
        pointerId: e.pointerId,
        type: "wheel",
        startAlpha: coasting ? coasting.alpha : activeAlpha,
        lastAngle: angle,
        travelled: 0,
      };
      spinSamplesRef.current = [{ time: e.timeStamp, travelled: 0 }];
      capturePointer(svgRef.current, e.pointerId);
    },
    [activeAlpha, svgCoord, stopSpin],
  );

  // Hue line drag (on right graph)
  const onHuePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (dragRef.current) return;
      dragRef.current = { pointerId: e.pointerId, type: "hue" };
      capturePointer(svgRef.current, e.pointerId);
      // Immediately update hue
      const pt = svgCoord(e.clientX, e.clientY);
      const hue = clampHueFromRightGraphX(pt.x);
      onHueAngleDegChange?.(Math.round(hue));
    },
    [svgCoord, onHueAngleDegChange],
  );

  // Hue line drag (on bottom graph)
  const onHueBottomPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (dragRef.current) return;
      dragRef.current = { pointerId: e.pointerId, type: "hue-bottom" };
      capturePointer(svgRef.current, e.pointerId);
      const pt = svgCoord(e.clientX, e.clientY);
      const hue = clampHueFromBottomGraphY(pt.y);
      onHueAngleDegChange?.(Math.round(hue));
    },
    [svgCoord, onHueAngleDegChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const pt = svgCoord(e.clientX, e.clientY);
      if (drag.type === "wheel") {
        const angle = (Math.atan2(pt.y - CY, pt.x - CX) * 180) / Math.PI;
        drag.travelled += angleStep(drag.lastAngle, angle);
        drag.lastAngle = angle;
        const samples = spinSamplesRef.current;
        samples.push({ time: e.timeStamp, travelled: drag.travelled });
        while (samples.length > 2 && e.timeStamp - samples[0].time > SPIN_SAMPLE_MS) samples.shift();
        const newAlpha = normalizeHueAngleDeg(drag.startAlpha + drag.travelled);
        if (mode === 0) setAlpha0(newAlpha);
        else setAlpha7(newAlpha);
      } else if (drag.type === "hue") {
        const hue = clampHueFromRightGraphX(pt.x);
        onHueAngleDegChange?.(Math.round(hue));
      } else if (drag.type === "hue-bottom") {
        const hue = clampHueFromBottomGraphY(pt.y);
        onHueAngleDegChange?.(Math.round(hue));
      }
    },
    [svgCoord, mode, setAlpha0, setAlpha7, onHueAngleDegChange],
  );

  /** One frame of the coast: decay the speed, move alpha, ask for the next. */
  const spinStep = useCallback((now: number) => {
    const spin = spinRef.current;
    if (!spin) return;
    if (spin.time === null) {
      // The first frame only starts the clock. rAF hands us its own timestamp,
      // so the coast never reads a clock of its own and never has to guess how
      // long the gap since the finger lifted was.
      spin.time = now;
      spin.frame = requestAnimationFrame(spinStep);
      return;
    }
    const elapsed = Math.min((now - spin.time) / 1000, SPIN_MAX_FRAME_S);
    spin.time = now;
    spin.alpha = normalizeHueAngleDeg(spin.alpha + spin.velocity * elapsed);
    spin.velocity *= Math.exp(-elapsed / SPIN_DECAY_S);
    const { setAlpha0: set0, setAlpha7: set7 } = setAlphaRef.current;
    if (spin.mode === 0) set0(spin.alpha);
    else set7(spin.alpha);
    if (Math.abs(spin.velocity) < SPIN_MIN_DEG_PER_S) {
      spinRef.current = null;
      return;
    }
    spin.frame = requestAnimationFrame(spinStep);
  }, []);

  // Only the pointer that owns the drag ends it. A second finger lifting, or
  // leaving the figure, used to drop a turn that was still under way.
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag?.pointerId !== e.pointerId) return;
      dragRef.current = null;
      if (drag.type !== "wheel") return;

      const samples = spinSamplesRef.current;
      spinSamplesRef.current = [];
      const last = samples[samples.length - 1];
      // A finger that had already stopped leaves the wheel where it put it.
      if (!last || e.timeStamp - last.time > SPIN_REST_MS) return;
      const first = samples.find((s) => last.time - s.time <= SPIN_SAMPLE_MS);
      if (!first || first === last) return;
      const seconds = (last.time - first.time) / 1000;
      if (seconds <= 0) return;
      const velocity = (last.travelled - first.travelled) / seconds;
      if (Math.abs(velocity) < SPIN_MIN_DEG_PER_S) return;
      // A coast is motion, and a reader who asked for less of it gets the wheel
      // stopped where the finger left it instead.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      stopSpin();
      const spin = {
        velocity,
        alpha: normalizeHueAngleDeg(drag.startAlpha + drag.travelled),
        mode,
        time: null as number | null,
        frame: 0,
      };
      spinRef.current = spin;
      spin.frame = requestAnimationFrame(spinStep);
    },
    [mode, spinStep, stopSpin],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    spinSamplesRef.current = [];
  }, []);

  // Pre-compute all sine/cosine paths so vizContent doesn't recalculate them
  const sinePaths = useMemo(() => {
    const r0: Record<number, string> = {};
    const r7: Record<number, string> = {};
    for (let levelIndex = 0; levelIndex <= 7; levelIndex++) {
      r0[levelIndex] = sinePath(levelIndex, toneR0, alpha0);
      r7[levelIndex] = sinePath(levelIndex, toneR7, alpha7);
    }
    return { r0, r7 };
  }, [alpha0, alpha7]);

  const cosinePaths = useMemo(() => {
    const r0: Record<number, string> = {};
    const r7: Record<number, string> = {};
    for (let levelIndex = 0; levelIndex <= 7; levelIndex++) {
      r0[levelIndex] = cosinePath(levelIndex, toneR0, alpha0);
      r7[levelIndex] = cosinePath(levelIndex, toneR7, alpha7);
    }
    return { r0, r7 };
  }, [alpha0, alpha7]);

  // Hover helpers
  const dotHandlers = (d: LinkedVisualizationDot) => ({
    onPointerEnter: () => setHoveredDot({ levelIndex: d.levelIndex, candidateIndex: d.candidateIndex }),
    onPointerLeave: () => setHoveredDot(null),
    style: S_CURSOR_POINTER,
  });
  const legendL0 = mode === 0 ? t("linkedviz_legend_l0_origin") : t("linkedviz_legend_l0_boundary");
  const legendL7 = mode === 0 ? t("linkedviz_legend_l7_boundary") : t("linkedviz_legend_l7_origin");

  // Main visualization content
  const vizContent = useMemo(() => {
    const lvColor = (levelIndex: number) => {
      // Use hovered dot's color if hovering a specific candidate for this level
      if (hoveredDot && hoveredDot.levelIndex === levelIndex) {
        const hd = dots.find((dd) => dd.levelIndex === levelIndex && dd.candidateIndex === hoveredDot.candidateIndex);
        if (hd) return `rgb(${hd.rgb.join(",")})`;
      }
      const d = activeDots.find((ad) => ad.levelIndex === levelIndex);
      return d ? `rgb(${d.rgb.join(",")})` : LV_COLORS[levelIndex];
    };

    return (
      <>
        <LinkedVisualizationGuides
          dots={dots}
          activeDots={activeDots}
          hoveredDot={hoveredDot}
          activeAlpha={activeAlpha}
          activeRadiusFn={activeRadiusFn}
          alpha0={alpha0}
          alpha7={alpha7}
          mode={mode}
        />

        <RightProjectionGraph
          mode={mode}
          hueAngleDeg={hueAngleDeg}
          alpha0={alpha0}
          alpha7={alpha7}
          activeAlpha={activeAlpha}
          activeRadiusFn={activeRadiusFn}
          activeDots={activeDots}
          projectionDots={projectionDots}
          hoveredDot={hoveredDot}
          dotHandlers={dotHandlers}
          lvColor={lvColor}
          paths={sinePaths}
          dotHitR={DOT_HIT_R}
          dotTransition={DOT_TRANSITION}
          axisLabel={t("linkedviz_axis_sin")}
          onHuePointerDown={onHuePointerDown}
        />

        <BottomProjectionGraph
          mode={mode}
          hueAngleDeg={hueAngleDeg}
          alpha0={alpha0}
          alpha7={alpha7}
          activeAlpha={activeAlpha}
          activeRadiusFn={activeRadiusFn}
          activeDots={activeDots}
          projectionDots={projectionDots}
          hoveredDot={hoveredDot}
          dotHandlers={dotHandlers}
          lvColor={lvColor}
          paths={cosinePaths}
          dotHitR={DOT_HIT_R}
          dotTransition={DOT_TRANSITION}
          axisLabel={t("linkedviz_axis_cos")}
          onHuePointerDown={onHueBottomPointerDown}
        />

        {showLegend && (
          <LinkedVisualizationLegend
            activeDots={activeDots}
            hoveredDot={hoveredDot}
            setHoveredDot={setHoveredDot}
            dotHandlers={dotHandlers}
            legendL0={legendL0}
            legendL7={legendL7}
          />
        )}
        {!showLegend &&
          bottomRightOverlay?.({
            activeDots,
            activeAlpha,
            hoveredDot,
            setHoveredDot,
            x: BXright + 10,
            y: BY + 16,
            rowHeight: 24,
            width: TW,
          })}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredDot is intentionally reactive
  }, [
    dots,
    hueAngleDeg,
    alpha0,
    alpha7,
    mode,
    activeAlpha,
    activeRadiusFn,
    sinePaths,
    cosinePaths,
    hoveredDot,
    onHuePointerDown,
    onHueBottomPointerDown,
    legendL0,
    legendL7,
    showLegend,
    bottomRightOverlay,
    activeDots,
    projectionDots,
  ]);

  const deltaAlpha = Math.round(normalizeHueAngleDeg(alpha7 - alpha0)) % 360;
  const isAligned = deltaAlpha === 180;

  return (
    <div className="linked-viz-root" style={{ marginTop: SP.xl, textAlign: "center" }}>
      {/* L0/L7 Toggle + Δα controls */}
      <div
        className="linked-viz-controls"
        style={{
          marginBottom: SP.md,
          display: "flex",
          flexWrap: "nowrap",
          gap: "var(--linked-viz-control-gap, 3px)",
          justifyContent: "center",
          alignItems: "center",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <button type="button" aria-pressed={mode === 0} style={mode === 0 ? S_TOGGLE_ACTIVE : S_TOGGLE} onClick={() => setMode(0)}>
          {t("linkedviz_mode_l0")}
        </button>
        <button type="button" aria-pressed={mode === 7} style={mode === 7 ? S_TOGGLE_ACTIVE : S_TOGGLE} onClick={() => setMode(7)}>
          {t("linkedviz_mode_l7")}
        </button>
        <span
          style={{
            color: isAligned ? C.accent : C.textDim,
            fontSize: "var(--linked-viz-toggle-fs, 11px)",
            width: "var(--linked-viz-delta-width, 62px)",
            textAlign: "right",
            display: "inline-block",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {"\u0394\u03b1:\u00a0" + deltaAlpha + "\u00b0"}
        </span>
        <button
          type="button"
          aria-pressed={isAligned}
          style={isAligned ? S_TOGGLE_ACTIVE : S_TOGGLE}
          onClick={() => setAlpha7((alpha0 + 180) % 360)}
        >
          {t("linkedviz_complement_align")}
        </button>
        <button
          type="button"
          aria-pressed={deltaAlpha === 0}
          style={deltaAlpha === 0 ? S_TOGGLE_ACTIVE : S_TOGGLE}
          onClick={() => setAlpha7(alpha0)}
        >
          {t("linkedviz_complement_cancel")}
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${TW} ${TH}`}
        width="100%"
        style={{ maxWidth: "min(500px, calc(100vw - 24px))" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        // Nothing should cancel a turn now that the figure claims the gesture,
        // but a cancel that went unhandled left the drag armed, so the next
        // move resumed it from a stale origin. A gesture taken away is not a
        // release, so it drops the drag without leaving the wheel coasting.
        onPointerCancel={onPointerCancel}
      >
        <defs>
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {vizContent}

        <LinkedVisualizationWheel
          alpha={activeAlpha}
          radiusFn={activeRadiusFn}
          dots={dots}
          hueAngleDeg={hueAngleDeg}
          hoveredDot={hoveredDot}
          onHoverDot={setHoveredDot}
          mode={mode}
          onPointerDown={onWheelPointerDown}
        />

        {/* Label with rotation angle */}
        <text x={CX} y={WO - 2} fontSize={8} fill={C.textDimmer} textAnchor="middle">
          {mode === 0 ? `\u03b1\u2080: ${Math.round(alpha0)}\u00b0` : `\u03b1\u2087: ${Math.round(alpha7)}\u00b0`}
        </text>
      </svg>
    </div>
  );
});
