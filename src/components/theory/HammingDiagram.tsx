import React, { useCallback, useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { S_BTN_SM } from "../../styles/shared";
import { C, FONT, FS, FW, R, SP } from "../../styles/tokens";

export type Bit = 0 | 1;
export type DataWord = readonly [Bit, Bit, Bit, Bit];
export type HammingWord = readonly [Bit, Bit, Bit, Bit, Bit, Bit, Bit];

const DATA_POSITIONS = [3, 5, 6, 7] as const;
const CODE_POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const;
const CODE_POSITION_ROLES = ["P1", "P2", "D1", "P4", "D2", "D3", "D4"] as const;
const HAMMING_COLUMN_BITS = ["001", "010", "011", "100", "101", "110", "111"] as const;
const FLOW_ROW_COLUMNS = "24px minmax(72px, 0.55fr) minmax(0, 1fr)";
const ZERO_ERRORS: HammingWord = [0, 0, 0, 0, 0, 0, 0];
const INITIAL_DATA: DataWord = [1, 0, 1, 1];
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇";
const FLOW_TRACE_TIMELINE = {
  data: 0,
  encode: 180,
  encoded: 360,
  transmit: 540,
  received: 720,
  checkInput: 840,
  checkRows: [900, 1020, 1140],
  checkOutput: 1200,
  syndrome: 1260,
  correction: 1440,
  corrected: 1620,
  extract: 1710,
  output: 1800,
} as const;
const READABLE_CHECK_COLORS: Readonly<Record<number, string>> = {
  1: "#6f86ff",
  2: "#ff5666",
  4: "#20dc58",
};

const PARITY_GROUPS = [
  { parity: 1, channel: "B", checks: [1, 3, 5, 7] as const, data: [1, 2, 4] as const },
  { parity: 2, channel: "R", checks: [2, 3, 6, 7] as const, data: [1, 3, 4] as const },
  { parity: 4, channel: "G", checks: [4, 5, 6, 7] as const, data: [2, 3, 4] as const },
] as const;

const VENN_CIRCLES = [
  { parity: 2, cx: 170, cy: 94, labelX: 170, labelY: 12 },
  { parity: 4, cx: 220, cy: 156, labelX: 292, labelY: 248 },
  { parity: 1, cx: 120, cy: 156, labelX: 48, labelY: 248 },
] as const;

const VENN_POSITIONS: Readonly<Record<number, { x: number; y: number }>> = {
  1: { x: 76, y: 194 },
  2: { x: 170, y: 39 },
  3: { x: 125, y: 101 },
  4: { x: 264, y: 194 },
  5: { x: 170, y: 215 },
  6: { x: 215, y: 101 },
  7: { x: 170, y: 153 },
};

interface HammingComputation {
  readonly encoded: HammingWord;
  readonly received: HammingWord;
  readonly syndromeBits: readonly [Bit, Bit, Bit];
  readonly syndrome: number;
  readonly corrected: HammingWord;
  readonly output: DataWord;
}

/** Encode D1,D2,D3,D4 into positions (P1,P2,D1,P4,D2,D3,D4) using even parity. */
export function encodeHamming74([d1, d2, d3, d4]: DataWord): HammingWord {
  const p1 = (d1 ^ d2 ^ d4) as Bit;
  const p2 = (d1 ^ d3 ^ d4) as Bit;
  const p4 = (d2 ^ d3 ^ d4) as Bit;
  return [p1, p2, d1, p4, d2, d3, d4];
}

/** Run the complete Hamming(7,4) encode, channel, syndrome, and correction pipeline. */
export function calculateHamming74(data: DataWord, errors: HammingWord): HammingComputation {
  const encoded = encodeHamming74(data);
  const received = encoded.map((bit, index) => (bit ^ errors[index]) as Bit) as unknown as HammingWord;
  const s1 = (received[0] ^ received[2] ^ received[4] ^ received[6]) as Bit;
  const s2 = (received[1] ^ received[2] ^ received[5] ^ received[6]) as Bit;
  const s4 = (received[3] ^ received[4] ^ received[5] ^ received[6]) as Bit;
  const syndromeBits = [s4, s2, s1] as const;
  const syndrome = 4 * s4 + 2 * s2 + s1;
  const corrected = received.map((bit, index) => (bit ^ (syndrome === index + 1 ? 1 : 0)) as Bit) as unknown as HammingWord;
  const output = [corrected[2], corrected[4], corrected[5], corrected[6]] as const;
  return { encoded, received, syndromeBits, syndrome, corrected, output };
}

function bits(word: readonly Bit[]): string {
  return word.join("");
}

function levelLabel(level: number): string {
  return `${THEORY_LEVELS[level].short}${SUBSCRIPT_DIGITS[level]}`;
}

function inkForLevel(level: number): string {
  return level >= 4 ? "#000" : "#fff";
}

function readableLevelColor(level: number): string {
  return READABLE_CHECK_COLORS[level] ?? THEORY_LEVELS[level].color;
}

function dataCodeSlots(data: DataWord): readonly (Bit | null)[] {
  return [null, null, data[0], null, data[1], data[2], data[3]];
}

function HammingBridgeCard() {
  const { t } = useTranslation();
  return (
    <div
      data-testid="hamming-fano-bridge"
      role="group"
      aria-label={t("theory_hamming_bridge_card_aria")}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SP.md,
        width: "100%",
        maxWidth: 560,
        padding: `${SP.lg}px ${SP.xl}px`,
        border: `1px solid ${C.borderAlt}`,
        borderRadius: R.md,
        background: C.bgSurfaceAlt,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: SP.sm,
          fontFamily: FONT.mono,
        }}
      >
        <strong style={{ color: C.accentBright, fontSize: FS.xs }}>{t("theory_hamming_bridge_card_title")}</strong>
        <strong style={{ color: C.textPrimary, fontSize: FS.sm }}>ker H = Hamming [7,4,3]</strong>
      </div>
      <div>
        <div style={{ marginBottom: SP.xs, color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xxs }}>H = [B₁ R₂ M₃ G₄ C₅ Y₆ W₇]</div>
        <div data-testid="hamming-fano-columns" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: SP.xs }}>
          {CODE_POSITIONS.map((position, index) => (
            <span
              key={`bridge-column-${position}`}
              data-h-column={position}
              data-h-column-bits={HAMMING_COLUMN_BITS[index]}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minWidth: 0,
                padding: `${SP.xs}px 1px`,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                background: C.bgPanel,
                fontFamily: FONT.mono,
                boxSizing: "border-box",
              }}
            >
              <strong style={{ color: readableLevelColor(position), fontSize: FS.xs, lineHeight: 1 }}>{levelLabel(position)}</strong>
              <small style={{ color: C.textMuted, fontSize: "7px", lineHeight: 1 }}>{HAMMING_COLUMN_BITS[index]}</small>
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: SP.sm,
          color: C.textMuted,
          fontFamily: FONT.mono,
          fontSize: FS.xs,
          textAlign: "center",
        }}
      >
        <span>rank H = 3</span>
        <span aria-hidden="true">→</span>
        <span>dim ker H = 4</span>
        <span aria-hidden="true">·</span>
        <span>Fano line → wt = 3</span>
        <span aria-hidden="true">·</span>
        <strong style={{ color: C.textPrimary }}>dₘᵢₙ = 3</strong>
      </div>
    </div>
  );
}

interface BitRailProps {
  slots: readonly (Bit | null)[];
  bitString: string;
  emphasizedPositions?: readonly number[];
  emphasisTone?: "error" | "success" | "warning";
  emphasisLabel?: string;
}

function BitRail({ slots, bitString, emphasizedPositions = [], emphasisTone = "error", emphasisLabel }: BitRailProps) {
  const emphasisColor = emphasisTone === "success" ? C.success : emphasisTone === "warning" ? C.warning : C.error;
  return (
    <div
      data-bit-string={bitString}
      aria-label={bitString}
      style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: SP.xs, width: "100%" }}
    >
      {slots.map((bit, index) => {
        const position = index + 1;
        const emphasized = emphasizedPositions.includes(position);
        return (
          <span
            key={`bit-slot-${position}`}
            data-code-position={position}
            data-bit-role={CODE_POSITION_ROLES[index]}
            data-empty={bit === null ? "true" : "false"}
            data-flow-emphasis={emphasized ? emphasisTone : undefined}
            aria-hidden="true"
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: emphasized ? 1 : 0,
              minWidth: 0,
              minHeight: emphasized ? 30 : 22,
              border: emphasized ? `1px solid ${emphasisColor}` : bit === null ? `1px dashed ${C.border}` : `1px solid ${C.borderAlt}`,
              borderRadius: 3,
              background: bit === null ? "transparent" : C.bgSurfaceHover,
              color: bit === null ? C.textSubtle : C.textPrimary,
              boxShadow: emphasized ? `inset 0 0 0 1px ${emphasisColor}` : undefined,
              boxSizing: "border-box",
            }}
          >
            <span>{bit ?? "–"}</span>
            {emphasized && emphasisLabel && (
              <small style={{ color: emphasisColor, fontFamily: FONT.mono, fontSize: "7px", fontWeight: FW.bold, lineHeight: 1 }}>
                {emphasisLabel}
              </small>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface SyndromeDisplayProps {
  syndromeBits: readonly [Bit, Bit, Bit];
  level: string;
  position: number;
  positionText: string;
}

function SyndromeDisplay({ syndromeBits, level, position, positionText }: SyndromeDisplayProps) {
  const syndrome = bits(syndromeBits);
  return (
    <div
      data-syndrome-bits={syndrome}
      data-syndrome-position={position}
      aria-label={`${syndrome}, j=${position}, ${positionText}`}
      style={{ minWidth: 0 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: SP.sm }}>
        {(["sG", "sR", "sB"] as const).map((channel, index) => (
          <span
            key={channel}
            data-syndrome-channel={channel}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}
          >
            <small style={{ color: C.textMuted, fontFamily: FONT.mono, fontSize: FS.xxs, lineHeight: 1 }}>{channel}</small>
            <strong
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minHeight: 22,
                border: `1px solid ${C.borderAlt}`,
                borderRadius: 3,
                background: C.bgSurfaceHover,
                color: C.textPrimary,
                boxSizing: "border-box",
              }}
            >
              {syndromeBits[index]}
            </strong>
          </span>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: SP.sm,
          marginTop: SP.sm,
          color: C.textMuted,
          fontSize: FS.xs,
        }}
      >
        <strong style={{ color: C.textPrimary }}>{syndrome}₂</strong>
        <span aria-hidden="true">→</span>
        <strong style={{ color: C.accentBright }}>j={position}</strong>
        <span aria-hidden="true">→</span>
        <span>{positionText}</span>
      </div>
      <div style={{ marginTop: 2, color: C.textDimmer, fontSize: FS.xxs, textAlign: "right" }}>
        4×{syndromeBits[0]} + 2×{syndromeBits[1]} + {syndromeBits[2]} = {position} · {level}
      </div>
    </div>
  );
}

interface ParityCheckResult {
  parity: number;
  channel: string;
  checks: readonly number[];
  failed: Bit;
}

interface ParityCheckOperationProps {
  results: readonly ParityCheckResult[];
  inputTraceDelayMs?: number | undefined;
  rowTraceDelaysMs?: readonly number[];
  outputTraceDelayMs?: number | undefined;
}

function ParityCheckOperation({ results, inputTraceDelayMs, rowTraceDelaysMs = [], outputTraceDelayMs }: ParityCheckOperationProps) {
  const { t } = useTranslation();
  const orderedResults = [...results].sort((a, b) => b.parity - a.parity);
  return (
    <div
      data-testid="hamming-flow-operation-check"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SP.sm,
        margin: `${SP.sm}px 0`,
        minWidth: 0,
      }}
    >
      <FlowOperation
        label={t("theory_hamming_operation_check")}
        testId="hamming-flow-operation-check-input"
        traceDelayMs={inputTraceDelayMs}
      />
      <div
        data-testid="hamming-syndrome-identity"
        className={inputTraceDelayMs === undefined ? undefined : "theory-hamming-syndrome-identity-tracing"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: SP.sm,
          minWidth: 0,
          margin: `0 ${SP.lg}px`,
          padding: `${SP.sm}px ${SP.md}px`,
          border: `1px solid ${C.border}`,
          borderRadius: R.md,
          background: C.bgPanel,
          animationDelay: inputTraceDelayMs === undefined ? undefined : `${inputTraceDelayMs}ms`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: SP.sm,
            color: C.textMuted,
            fontFamily: FONT.mono,
            fontSize: FS.xs,
          }}
        >
          <span>r = c ⊕ e</span>
          <span aria-hidden="true">→</span>
          <span>Hcᵀ = 000</span>
          <span aria-hidden="true">⇒</span>
          <strong style={{ color: C.accentBright }}>s = Hrᵀ = Heᵀ</strong>
        </div>
        <small style={{ color: C.textDimmer, fontFamily: FONT.sans, fontSize: FS.xxs, lineHeight: 1.4, textAlign: "center" }}>
          {t("theory_hamming_syndrome_identity_note")}
        </small>
      </div>
      <div
        data-testid="hamming-parity-check-card"
        role="group"
        aria-label={t("theory_hamming_parity_block_title")}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: SP.sm,
          minWidth: 0,
          margin: `0 ${SP.lg}px`,
          padding: `${SP.md}px ${SP.lg}px`,
          border: `1px solid ${C.borderAlt}`,
          borderRadius: R.md,
          background: C.bgSurface,
          boxSizing: "border-box",
        }}
      >
        <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.xs, fontWeight: FW.bold }}>
          {t("theory_hamming_parity_block_title")}
        </div>
        <div style={{ display: "grid", gap: 3 }}>
          {orderedResults.map((result, index) => {
            const channel = `s${result.channel}`;
            const formula = result.checks.map((position) => `r${SUBSCRIPT_DIGITS[position]}`).join("⊕");
            const traceDelayMs = rowTraceDelaysMs[index];
            return (
              <div
                key={result.parity}
                data-parity-check-channel={channel}
                data-parity-check-result={result.failed}
                data-flow-delay-ms={traceDelayMs}
                className={traceDelayMs === undefined ? undefined : "theory-hamming-parity-check-tracing"}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px minmax(0, 1fr) 18px minmax(32px, auto)",
                  alignItems: "center",
                  gap: SP.xs,
                  minWidth: 0,
                  padding: "2px 4px",
                  border: `1px solid ${result.failed ? C.error : C.border}`,
                  borderRadius: 3,
                  background: C.bgPanel,
                  fontFamily: FONT.mono,
                  animationDelay: traceDelayMs === undefined ? undefined : `${traceDelayMs}ms`,
                }}
              >
                <strong style={{ color: readableLevelColor(result.parity), fontSize: FS.xs }}>{channel}</strong>
                <span style={{ minWidth: 0, color: C.textDimmer, fontSize: FS.xxs, whiteSpace: "nowrap" }}>{formula}</span>
                <strong style={{ color: result.failed ? C.error : C.textPrimary, fontSize: FS.xs, textAlign: "center" }}>
                  {result.failed}
                </strong>
                <small style={{ color: result.failed ? C.error : C.textDimmer, fontSize: FS.xxs, textAlign: "right" }}>
                  {t(result.failed ? "theory_hamming_check_fail" : "theory_hamming_check_pass")}
                </small>
              </div>
            );
          })}
        </div>
      </div>
      <FlowOperation
        label={t("theory_hamming_checks_to_syndrome")}
        testId="hamming-flow-operation-check-output"
        traceDelayMs={outputTraceDelayMs}
      />
    </div>
  );
}

function BitRailHeader({ label }: { label: string }) {
  return (
    <div
      data-testid="hamming-flow-bit-header"
      style={{
        display: "grid",
        gridTemplateColumns: FLOW_ROW_COLUMNS,
        alignItems: "end",
        columnGap: SP.md,
        padding: `0 ${SP.lg}px ${SP.sm}px`,
        color: C.textDimmer,
        fontFamily: FONT.mono,
        fontSize: FS.xxs,
        boxSizing: "border-box",
      }}
    >
      <span />
      <span>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: SP.xs }}>
        {CODE_POSITION_ROLES.map((role, index) => (
          <span
            key={role}
            data-code-position={index + 1}
            data-h-column-bits={HAMMING_COLUMN_BITS[index]}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, lineHeight: 1.15 }}
          >
            <span style={{ color: C.textSubtle }}>{index + 1}</span>
            <strong style={{ color: C.textMuted, fontSize: "inherit" }}>{role}</strong>
            <span style={{ marginTop: 2, color: readableLevelColor(index + 1), fontSize: "7px" }}>{HAMMING_COLUMN_BITS[index]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface StageCardProps {
  number: number;
  label: string;
  value: React.ReactNode;
  note?: string;
  testId: string;
  traceDelayMs?: number | undefined;
}

function StageCard({ number, label, value, note, testId, traceDelayMs }: StageCardProps) {
  return (
    <div
      data-testid={testId}
      data-flow-delay-ms={traceDelayMs}
      className={`theory-hamming-stage${traceDelayMs === undefined ? "" : " theory-hamming-stage-tracing"}`}
      style={{
        display: "grid",
        gridTemplateColumns: FLOW_ROW_COLUMNS,
        alignItems: "center",
        columnGap: SP.md,
        rowGap: SP.xs,
        minWidth: 0,
        minHeight: 46,
        padding: `${SP.md}px ${SP.lg}px`,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        background: C.bgPanel,
        boxSizing: "border-box",
        animationDelay: traceDelayMs === undefined ? undefined : `${traceDelayMs}ms`,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          border: `1px solid ${C.borderHover}`,
          borderRadius: "50%",
          color: C.textMuted,
          fontFamily: FONT.mono,
          fontSize: FS.xs,
          fontWeight: FW.bold,
          boxSizing: "border-box",
        }}
      >
        {number}
      </span>
      <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs, whiteSpace: "nowrap" }}>{label}</div>
      <div
        data-stage-value=""
        style={{ minWidth: 0, color: C.textPrimary, fontFamily: FONT.mono, fontSize: FS.lg, fontWeight: FW.bold, letterSpacing: 1 }}
      >
        {value}
      </div>
      {note && (
        <div style={{ gridColumn: "1 / -1", color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xxs, textAlign: "right" }}>{note}</div>
      )}
    </div>
  );
}

interface FlowOperationProps {
  label: string;
  testId: string;
  traceDelayMs?: number | undefined;
}

function FlowOperation({ label, testId, traceDelayMs }: FlowOperationProps) {
  return (
    <div
      data-testid={testId}
      data-flow-delay-ms={traceDelayMs}
      className={traceDelayMs === undefined ? undefined : "theory-hamming-operation-tracing"}
      style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: SP.md,
        minHeight: 28,
        padding: `0 ${SP.lg}px`,
        color: C.textMuted,
        fontFamily: FONT.mono,
        fontSize: FS.xs,
        boxSizing: "border-box",
        animationDelay: traceDelayMs === undefined ? undefined : `${traceDelayMs}ms`,
      }}
    >
      <span
        aria-hidden="true"
        className="theory-hamming-operation-arrow"
        style={{
          color: C.accentBright,
          fontSize: FS.lg,
          lineHeight: 1,
          textAlign: "center",
          animationDelay: traceDelayMs === undefined ? undefined : `${traceDelayMs}ms`,
        }}
      >
        ↓
      </span>
      <span>{label}</span>
    </div>
  );
}

interface Props {
  hlLevel: number | null;
  onHover: (level: number | null) => void;
}

type FlowTraceOrigin = "data" | "error";

function flowTraceDelay(origin: FlowTraceOrigin | null, absoluteDelayMs: number): number | undefined {
  if (origin === null) return undefined;
  if (origin === "error" && absoluteDelayMs < FLOW_TRACE_TIMELINE.transmit) return undefined;
  return absoluteDelayMs - (origin === "error" ? FLOW_TRACE_TIMELINE.transmit : 0);
}

export const HammingDiagram = React.memo(function HammingDiagram({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<DataWord>(INITIAL_DATA);
  const [errors, setErrors] = useState<HammingWord>(ZERO_ERRORS);
  const [flowRevision, setFlowRevision] = useState(0);
  const [flowTraceOrigin, setFlowTraceOrigin] = useState<FlowTraceOrigin | null>(null);
  const result = calculateHamming74(data, errors);
  const errorCount = errors.reduce<number>((sum, bit) => sum + bit, 0);
  const outputMatches = result.output.every((bit, index) => bit === data[index]);

  const enter = useCallback((level: number) => onHover(level), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);

  const toggleData = useCallback((index: number) => {
    setData((current) => current.map((bit, bitIndex) => (bitIndex === index ? ((bit ^ 1) as Bit) : bit)) as unknown as DataWord);
    setFlowTraceOrigin("data");
    setFlowRevision((revision) => revision + 1);
  }, []);

  const toggleError = useCallback((index: number) => {
    setErrors((current) => current.map((bit, bitIndex) => (bitIndex === index ? ((bit ^ 1) as Bit) : bit)) as unknown as HammingWord);
    setFlowTraceOrigin("error");
    setFlowRevision((revision) => revision + 1);
  }, []);

  const parityResults = PARITY_GROUPS.map((group) => {
    const failed = group.checks.reduce<Bit>((parity, position) => (parity ^ result.received[position - 1]) as Bit, 0);
    const generated = result.encoded[group.parity - 1];
    return { ...group, failed, generated };
  });

  const statusColor = errorCount === 0 ? C.textMuted : errorCount === 1 && outputMatches ? C.success : C.error;
  const statusText =
    errorCount === 0
      ? t("theory_hamming_status_none")
      : errorCount === 1
        ? t("theory_hamming_status_single", `${result.syndrome}`, levelLabel(result.syndrome))
        : t("theory_hamming_status_multiple", `${errorCount}`, bits(result.syndromeBits), levelLabel(result.syndrome));
  const transmissionOperation =
    errorCount === 0 ? t("theory_hamming_operation_transmit_clean") : t("theory_hamming_operation_transmit_errors", `${errorCount}`);
  const correctionOperation =
    errorCount === 0
      ? t("theory_hamming_operation_correction_none")
      : errorCount === 1
        ? t(
            "theory_hamming_operation_correction_single",
            `${result.syndrome}`,
            `${result.syndrome}`,
            `${result.received[result.syndrome - 1]}`,
            `${result.corrected[result.syndrome - 1]}`,
          )
        : t("theory_hamming_operation_correction_multiple", `${result.syndrome}`, `${result.syndrome}`);
  const receivedErrorPositions = errors.flatMap((bit, index) => (bit ? [index + 1] : []));
  const correctionPositions = result.syndrome === 0 ? [] : [result.syndrome];
  const syndromePositionText =
    result.syndrome === 0 ? t("theory_hamming_syndrome_no_position") : t("theory_hamming_syndrome_points_to", `${result.syndrome}`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SP["3xl"],
        width: "100%",
        maxWidth: 700,
        minWidth: 0,
      }}
    >
      <HammingBridgeCard />

      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ marginBottom: SP.md, color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
          {t("theory_hamming_data_controls")}
        </div>
        <div role="group" aria-label={t("theory_hamming_data_controls_aria")} style={{ display: "flex", gap: SP.md, width: "100%" }}>
          {data.map((bit, index) => {
            const position = DATA_POSITIONS[index];
            return (
              <button
                key={`data-${index}`}
                type="button"
                data-testid={`hamming-data-${index + 1}`}
                aria-pressed={bit === 1}
                aria-label={`D${index + 1}, ${levelLabel(position)}, ${bit}`}
                onClick={() => toggleData(index)}
                onMouseEnter={() => enter(position)}
                onMouseLeave={leave}
                onFocus={() => enter(position)}
                onBlur={leave}
                style={{
                  ...S_BTN_SM,
                  flex: "1 1 0",
                  minWidth: 0,
                  minHeight: 38,
                  padding: `${SP.sm}px ${SP.md}px`,
                  borderColor: bit ? C.textWhite : C.border,
                  color: readableLevelColor(position),
                  background: bit ? C.bgSurfaceAlt : C.bgPanel,
                  fontFamily: FONT.mono,
                  fontSize: FS.sm,
                }}
              >
                <span>
                  D{index + 1} · {levelLabel(position)}
                </span>
                <strong style={{ marginLeft: SP.md, color: bit ? C.textWhite : C.textDimmer }}>{bit}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ marginBottom: SP.md, color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
          {t("theory_hamming_error_controls")}
        </div>
        <div style={{ width: "100%", overflowX: "auto", overscrollBehaviorInline: "contain", scrollbarWidth: "thin" }}>
          <div
            role="group"
            aria-label={t("theory_hamming_error_controls_aria")}
            style={{ display: "flex", flexWrap: "nowrap", gap: SP.sm, width: "max-content", minWidth: "100%", justifyContent: "center" }}
          >
            {errors.map((bit, index) => {
              const position = index + 1;
              return (
                <button
                  key={`error-${position}`}
                  type="button"
                  data-testid={`hamming-error-${position}`}
                  aria-pressed={bit === 1}
                  aria-label={`${t("theory_hamming_error_position")} ${position}, ${levelLabel(position)}, ${bit}`}
                  onClick={() => toggleError(index)}
                  onMouseEnter={() => enter(position)}
                  onMouseLeave={leave}
                  onFocus={() => enter(position)}
                  onBlur={leave}
                  style={{
                    ...S_BTN_SM,
                    flex: "0 0 auto",
                    minWidth: 52,
                    minHeight: 36,
                    padding: `${SP.xs}px ${SP.md}px`,
                    borderColor: bit ? C.textWhite : C.border,
                    background: bit ? C.bgSurfaceAlt : C.bgPanel,
                    color: readableLevelColor(position),
                    fontFamily: FONT.mono,
                    fontSize: FS.xs,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{levelLabel(position)}</span>
                  <strong style={{ marginLeft: SP.sm, color: bit ? C.error : C.textDimmer }}>· {bit}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label={t("theory_hamming_flow_aria")}
        className="theory-hamming-flow"
        style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 560 }}
      >
        <BitRailHeader label={t("theory_hamming_position_legend")} />
        <StageCard
          key={`data-${flowRevision}`}
          number={1}
          label={t("theory_hamming_stage_data")}
          value={<BitRail slots={dataCodeSlots(data)} bitString={bits(data)} />}
          testId="hamming-stage-data"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.data)}
        />
        <FlowOperation
          key={`encode-${flowRevision}`}
          label={t("theory_hamming_operation_encode")}
          testId="hamming-flow-operation-encode"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.encode)}
        />
        <StageCard
          key={`encoded-${flowRevision}`}
          number={2}
          label={t("theory_hamming_stage_encoded")}
          value={<BitRail slots={result.encoded} bitString={bits(result.encoded)} />}
          testId="hamming-stage-encoded"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.encoded)}
        />
        <FlowOperation
          key={`transmit-${flowRevision}`}
          label={transmissionOperation}
          testId="hamming-flow-operation-transmit"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.transmit)}
        />
        <StageCard
          key={`received-${flowRevision}`}
          number={3}
          label={t("theory_hamming_stage_received")}
          value={
            <BitRail
              slots={result.received}
              bitString={bits(result.received)}
              emphasizedPositions={receivedErrorPositions}
              emphasisTone="error"
              emphasisLabel={t("theory_hamming_received_error_marker")}
            />
          }
          testId="hamming-stage-received"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.received)}
        />
        <ParityCheckOperation
          key={`checks-${flowRevision}`}
          results={parityResults}
          inputTraceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.checkInput)}
          rowTraceDelaysMs={FLOW_TRACE_TIMELINE.checkRows
            .map((delay) => flowTraceDelay(flowTraceOrigin, delay))
            .filter((delay) => delay !== undefined)}
          outputTraceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.checkOutput)}
        />
        <StageCard
          key={`syndrome-${flowRevision}`}
          number={4}
          label={t("theory_hamming_stage_syndrome")}
          value={
            <SyndromeDisplay
              syndromeBits={result.syndromeBits}
              level={levelLabel(result.syndrome)}
              position={result.syndrome}
              positionText={syndromePositionText}
            />
          }
          testId="hamming-stage-syndrome"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.syndrome)}
        />
        <FlowOperation
          key={`correction-${flowRevision}`}
          label={correctionOperation}
          testId="hamming-flow-operation-correction"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.correction)}
        />
        <StageCard
          key={`corrected-${flowRevision}`}
          number={5}
          label={t("theory_hamming_stage_corrected")}
          value={
            <BitRail
              slots={result.corrected}
              bitString={bits(result.corrected)}
              emphasizedPositions={correctionPositions}
              emphasisTone={errorCount === 1 ? "success" : "warning"}
              emphasisLabel={t(errorCount === 1 ? "theory_hamming_corrected_marker" : "theory_hamming_trial_marker")}
            />
          }
          testId="hamming-stage-corrected"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.corrected)}
        />
        <FlowOperation
          key={`extract-${flowRevision}`}
          label={t("theory_hamming_operation_extract")}
          testId="hamming-flow-operation-extract"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.extract)}
        />
        <StageCard
          key={`output-${flowRevision}`}
          number={6}
          label={t("theory_hamming_stage_output")}
          value={<BitRail slots={dataCodeSlots(result.output)} bitString={bits(result.output)} />}
          note={t(outputMatches ? "theory_hamming_output_match" : "theory_hamming_output_mismatch")}
          testId="hamming-stage-output"
          traceDelayMs={flowTraceDelay(flowTraceOrigin, FLOW_TRACE_TIMELINE.output)}
        />
      </div>

      <div
        data-testid="hamming-status"
        role="status"
        style={{
          width: "100%",
          padding: `${SP.lg}px ${SP.xl}px`,
          border: `1px solid ${statusColor}`,
          borderRadius: R.md,
          background: C.bgSurfaceAlt,
          color: statusColor,
          fontFamily: FONT.sans,
          fontSize: FS.md,
          lineHeight: 1.55,
          boxSizing: "border-box",
        }}
      >
        {statusText}
      </div>

      <div style={{ width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: SP.md, color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
          {t("theory_hamming_venn_title")}
        </div>
        <svg
          viewBox="0 0 340 260"
          role="img"
          aria-label={t("theory_hamming_venn_aria")}
          style={{ display: "block", width: "100%", maxWidth: 420, margin: "0 auto", overflow: "visible" }}
        >
          <rect x="0" y="0" width="340" height="260" rx="6" fill={C.bgPanel} />
          {VENN_CIRCLES.map(({ parity, cx, cy, labelX, labelY }) => {
            const info = THEORY_LEVELS[parity];
            const failed = parityResults.find((entry) => entry.parity === parity)?.failed === 1;
            return (
              <g key={`circle-${parity}`} data-testid={`hamming-parity-set-${parity}`}>
                <circle cx={cx} cy={cy} r="86" fill={info.color} fillOpacity="0.045" stroke={info.color} strokeWidth={failed ? 2.6 : 1.5} />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill={readableLevelColor(parity)}
                  fontFamily={FONT.mono}
                  fontSize={FS.sm}
                  fontWeight={FW.bold}
                >
                  {info.hamming} · s{info.short} {failed ? "=1" : "=0"}
                </text>
              </g>
            );
          })}

          {CODE_POSITIONS.map((position) => {
            const point = VENN_POSITIONS[position];
            const info = THEORY_LEVELS[position];
            const errored = errors[position - 1] === 1;
            const highlighted = hlLevel === position;
            return (
              <g
                key={`position-${position}`}
                data-testid={`hamming-venn-position-${position}`}
                opacity={hlLevel === null || highlighted ? 1 : 0.38}
              >
                <text
                  x={point.x}
                  y={point.y - 19}
                  textAnchor="middle"
                  fill={readableLevelColor(position)}
                  fontFamily={FONT.mono}
                  fontSize={FS.xxs}
                  fontWeight={FW.bold}
                >
                  {info.hamming} · {levelLabel(position)}
                </text>
                {errored && <circle cx={point.x} cy={point.y} r="18" fill="none" stroke={C.error} strokeWidth="2.5" />}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="14"
                  fill={info.color}
                  stroke={highlighted ? "#fff" : C.bgSurfaceAlt}
                  strokeWidth={highlighted ? 2.5 : 1.5}
                />
                <text
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={inkForLevel(position)}
                  fontFamily={FONT.mono}
                  fontSize={FS.lg}
                  fontWeight={900}
                >
                  {result.received[position - 1]}
                </text>
                <text x={point.x} y={point.y + 25} textAnchor="middle" fill={C.textDimmer} fontFamily={FONT.mono} fontSize={FS.xxs}>
                  j={position}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: SP.md, width: "100%" }}>
        <div style={{ flex: "1 1 250px", padding: SP.xl, border: `1px solid ${C.border}`, borderRadius: R.md, background: C.bgPanel }}>
          <div style={{ marginBottom: SP.lg, color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
            {t("theory_hamming_generator_title")}
          </div>
          {parityResults.map((group) => {
            const color = readableLevelColor(group.parity);
            return (
              <div
                key={`generator-${group.parity}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: SP.md,
                  marginTop: SP.md,
                  color,
                  fontFamily: FONT.mono,
                  fontSize: FS.xs,
                }}
              >
                <span>
                  P{group.parity} = {group.data.map((index) => `D${index}`).join(" ⊕ ")}
                </span>
                <strong>{group.generated}</strong>
              </div>
            );
          })}
        </div>

        <div style={{ flex: "1 1 250px", padding: SP.xl, border: `1px solid ${C.border}`, borderRadius: R.md, background: C.bgPanel }}>
          <div style={{ marginBottom: SP.lg, color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
            {t("theory_hamming_checker_title")}
          </div>
          {parityResults.map((group) => {
            const color = readableLevelColor(group.parity);
            return (
              <div
                key={`checker-${group.parity}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: SP.md,
                  marginTop: SP.md,
                  color,
                  fontFamily: FONT.mono,
                  fontSize: FS.xs,
                }}
              >
                <span>
                  s{group.channel} = {group.checks.map((position) => `r${position}`).join(" ⊕ ")}
                </span>
                <strong>{group.failed}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
