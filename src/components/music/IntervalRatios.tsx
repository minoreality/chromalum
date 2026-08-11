import {
  MAJOR_SEMITONES,
  OCTATONIC_SEMITONES,
  WHOLE_TONE_SEMITONES,
  angleToFreq,
  freqToNote,
  semitoneToFreq,
  type PitchMappingMode,
} from "../../data/music-frequency";
import { useTranslation } from "../../i18n";
import type { TranslationFn } from "../../i18n/types";
import { liveHueAngleDeg } from "../../music/music-phase";
import { C } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import type { LinkedVisualizationDot, LinkedVisualizationOverlayContext } from "../LinkedVisualization";

interface RatioMember {
  levelIndex: number;
  rgb: readonly [number, number, number];
  candidateIndex: number;
}

interface RatioEntry {
  label: string;
  value: string;
  dim?: boolean | undefined;
  color?: string | undefined;
  levelIndex?: number | undefined;
  candidateIndex?: number | undefined;
  members?: RatioMember[] | undefined;
}

interface IntervalRatiosProps extends LinkedVisualizationOverlayContext {
  pitchMappingMode: PitchMappingMode;
}

const TITLE_FONT_SIZE = 15;
const ROW_FONT_SIZE = 14;
const LABEL_W = 32;
const SCALE_LABEL_W = 30;
const MEMBER_SQ = 12;
const SCALE_MEMBER_SQ = 12;
const MEMBER_GAP = 2;
const SCALE_MEMBER_GAP = 1.5;
const SCALE_MEMBER_LABEL_OPACITY = 0.85;
function memberTextColor(levelIndex: number): string {
  return levelIndex >= 4 ? "#000" : "#fff";
}

function buildRatioRows(
  activeDots: LinkedVisualizationDot[],
  activeAlpha: number,
  pitchMappingMode: PitchMappingMode,
  t: TranslationFn,
): { title: string; rows: RatioEntry[] } {
  const rows: RatioEntry[] = [];
  const levelFreq = (d: LinkedVisualizationDot) => angleToFreq(liveHueAngleDeg(d.angleDeg, activeAlpha), pitchMappingMode);

  if (pitchMappingMode === "chromalum") {
    const sorted = [...activeDots].sort((a, b) => a.levelIndex - b.levelIndex);
    for (const d of sorted) {
      const f = levelFreq(d);
      const hz = Math.round(f);
      rows.push({
        label: `L${d.levelIndex}`,
        value: `\u00b7 ${freqToNote(f)} ${hz}Hz`,
        color: `rgb(${d.rgb.join(",")})`,
        levelIndex: d.levelIndex,
        candidateIndex: d.candidateIndex,
      });
    }
    return { title: t("music_pitch_legend_chromalum"), rows };
  }

  const steps =
    pitchMappingMode === "octatonic" ? OCTATONIC_SEMITONES : pitchMappingMode === "wholeTone" ? WHOLE_TONE_SEMITONES : MAJOR_SEMITONES;
  const n = steps.length;
  // Keep the upper tonic separate from the lower tonic: the pitch mapping
  // deliberately holds C5 immediately before the 360° hue seam.
  const perDegree: RatioMember[][] = Array.from({ length: n + 1 }, () => []);
  for (const d of activeDots) {
    if (d.levelIndex === 0 || d.levelIndex === 7) continue;
    const norm = liveHueAngleDeg(d.angleDeg, activeAlpha);
    const idx = Math.round((norm / 360) * n);
    perDegree[idx].push({ levelIndex: d.levelIndex, rgb: d.rgb, candidateIndex: d.candidateIndex });
  }
  for (let i = 0; i <= n; i++) {
    const semitone = i === n ? 12 : steps[i];
    const hz = semitoneToFreq(semitone);
    const note = freqToNote(hz);
    const next = i < n ? (i === n - 1 ? 12 : steps[i + 1]) : null;
    rows.push({
      label: note,
      value: next == null ? `${Math.round(hz)}Hz` : `${Math.round(hz)}Hz ${t("music_pitch_step", next - semitone)}`,
      members: perDegree[i].length > 0 ? perDegree[i] : undefined,
    });
  }
  const titleKey =
    pitchMappingMode === "octatonic"
      ? "music_pitch_legend_octatonic"
      : pitchMappingMode === "wholeTone"
        ? "music_pitch_legend_whole_tone"
        : "music_pitch_legend_major";
  return { title: t(titleKey), rows };
}

export function IntervalRatios({
  activeDots,
  activeAlpha,
  hoveredDot,
  setHoveredDot,
  x,
  y,
  rowHeight,
  width,
  pitchMappingMode,
}: IntervalRatiosProps) {
  const { t } = useTranslation();
  const { title, rows } = buildRatioRows(activeDots, activeAlpha, pitchMappingMode, t);
  const swatchSize = ROW_FONT_SIZE - 2;
  const isScaleLegend = pitchMappingMode === "major" || pitchMappingMode === "octatonic" || pitchMappingMode === "wholeTone";
  const memberSq = isScaleLegend ? SCALE_MEMBER_SQ : MEMBER_SQ;
  const memberGap = isScaleLegend ? SCALE_MEMBER_GAP : MEMBER_GAP;
  const legendRowHeight = isScaleLegend ? 18 : rowHeight;

  return (
    <g>
      <text x={x} y={y} fontSize={TITLE_FONT_SIZE} fill={C.accent} fontWeight="bold" fontFamily="var(--font-mono)">
        {title}
      </text>
      {rows.map((r, i) => {
        const isHovered = hoveredDot !== null && r.levelIndex != null && hoveredDot.levelIndex === r.levelIndex;
        const isDimmed = hoveredDot !== null && r.levelIndex != null && !isHovered;
        const textFill = r.dim ? C.textDimmer : isHovered ? "#fff" : C.textDim;
        const textX = r.color ? x + swatchSize + 4 : x;
        const labelW = isScaleLegend && !r.color ? SCALE_LABEL_W : LABEL_W;
        const rowY = y + (i + 1) * legendRowHeight;
        return (
          <g
            key={i}
            style={{ cursor: r.levelIndex != null ? "pointer" : undefined }}
            opacity={isDimmed ? 0.3 : 1}
            onPointerEnter={
              r.levelIndex != null && r.candidateIndex != null
                ? () => setHoveredDot({ levelIndex: r.levelIndex!, candidateIndex: r.candidateIndex! })
                : undefined
            }
            onPointerLeave={r.levelIndex != null ? () => setHoveredDot(null) : undefined}
          >
            {r.levelIndex != null && (
              <rect x={x - 2} y={rowY - ROW_FONT_SIZE} width={width - x} height={legendRowHeight} fill="transparent" />
            )}
            {r.color && <rect x={x} y={rowY - swatchSize} width={swatchSize} height={swatchSize} rx={2} fill={r.color} />}
            <text
              x={textX}
              y={rowY}
              fontSize={ROW_FONT_SIZE}
              fill={textFill}
              fontWeight={r.dim ? "normal" : "bold"}
              fontFamily="var(--font-sans)"
            >
              {r.label}
            </text>
            <text
              x={textX + labelW}
              y={rowY}
              fontSize={ROW_FONT_SIZE}
              fill={textFill}
              fontFamily="var(--font-mono)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {r.value}
            </text>
            {r.members?.map((m, mi) => {
              const mx = width - 4 - (r.members!.length - mi) * (memberSq + memberGap);
              const my = rowY - memberSq + (isScaleLegend ? 1 : 0);
              const isMHovered = hoveredDot !== null && hoveredDot.levelIndex === m.levelIndex;
              return (
                <g
                  key={`m${mi}`}
                  style={S_CURSOR_POINTER}
                  onPointerEnter={() => setHoveredDot({ levelIndex: m.levelIndex, candidateIndex: m.candidateIndex })}
                  onPointerLeave={() => setHoveredDot(null)}
                >
                  <rect
                    x={mx}
                    y={my}
                    width={memberSq}
                    height={memberSq}
                    rx={2}
                    fill={`rgb(${m.rgb.join(",")})`}
                    stroke={isMHovered ? "#fff" : C.border}
                    strokeWidth={isMHovered ? 1.5 : 0.5}
                  />
                  {isScaleLegend ? (
                    <text
                      x={mx + memberSq / 2}
                      y={my + memberSq / 2 + 3}
                      fontSize={8}
                      fill={memberTextColor(m.levelIndex)}
                      textAnchor="middle"
                      fontWeight="bold"
                      opacity={SCALE_MEMBER_LABEL_OPACITY}
                      fontFamily="var(--font-sans)"
                    >
                      {m.levelIndex}
                    </text>
                  ) : (
                    <text x={mx + memberSq / 2} y={my - 1} fontSize={8} fill={C.textDim} textAnchor="middle" fontFamily="var(--font-sans)">
                      {m.levelIndex}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
