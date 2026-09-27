import React, { useCallback, useEffect, useState } from "react";
import { THEORY_LEVELS, SUBSCRIPT_DIGITS, levelLabel } from "../../data/theory-data";
import {
  HAMMING_DATA_POSITIONS,
  HAMMING_PARITY_GROUPS,
  HAMMING_POSITION_ROLES,
  HAMMING_POSITIONS,
  HAMMING_SYNDROME_GROUPS,
  calculateHamming74,
  checkParity,
  correctWord,
  encodeHamming74,
  extractData,
  positionBits,
  syndromePosition,
  transmitWord,
  type Bit,
  type DataWord,
  type HammingComputation,
  type HammingWord,
} from "../../data/hamming-data";
import { useTranslation } from "../../i18n";
import { C, FONT, FS, FW, R, SP } from "../../styles/tokens";
import { HammingParitySets } from "./HammingParitySets";
import { usePinReset } from "./pin-reset";

const HAMMING_COLUMN_BITS = HAMMING_POSITIONS.map(positionBits);
const FLOW_ROW_COLUMNS = "var(--theory-hamming-row-columns, 24px minmax(72px, 0.4fr) minmax(0, 1fr))";
const ZERO_ERRORS: HammingWord = [0, 0, 0, 0, 0, 0, 0];
const EMPTY_SLOTS = HAMMING_POSITIONS.map(() => null);
const INITIAL_DATA: DataWord = [0, 0, 0, 0];
const FLOW_TIMELINE = {
  encoded: 360,
  transmit: 540,
  received: 720,
  checkRows: [900, 1020, 1140],
  syndrome: 1260,
  corrected: 1620,
  output: 1800,
} as const;
const READABLE_CHECK_COLORS: Readonly<Record<number, string>> = {
  1: "#6f86ff",
  2: "#ff5666",
  4: "#20dc58",
};

type HammingProgress = { readonly [Key in keyof HammingComputation]: HammingComputation[Key] | null } & {
  readonly checkBits: readonly [Bit | null, Bit | null, Bit | null];
};

interface HammingSimulation {
  readonly data: DataWord;
  readonly errors: HammingWord;
  readonly run: { readonly encoded: HammingWord | null } | null;
  readonly result: HammingProgress;
}

function pendingComputation(encoded: HammingWord | null): HammingProgress {
  return { encoded, received: null, checkBits: [null, null, null], syndromeBits: null, syndrome: null, corrected: null, output: null };
}

function useHammingSimulation() {
  const [simulation, setSimulation] = useState<HammingSimulation>(() => {
    const initial = calculateHamming74(INITIAL_DATA, ZERO_ERRORS);
    return { data: INITIAL_DATA, errors: ZERO_ERRORS, run: null, result: { ...initial, checkBits: initial.syndromeBits } };
  });
  const { data, errors, run } = simulation;

  useEffect(() => {
    if (run === null) return;
    const offset = run.encoded === null ? 0 : FLOW_TIMELINE.transmit;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let encoded = run.encoded;
    let received: HammingWord | null = null;
    let checkBits: HammingProgress["checkBits"] = [null, null, null];
    let syndrome: number | null = null;
    let corrected: HammingWord | null = null;
    const publish = (patch: Partial<HammingProgress>) => {
      setSimulation((current) => (current.run === run ? { ...current, result: { ...current.result, ...patch } } : current));
    };
    const schedule = (at: number, compute: () => void) => {
      timers.push(setTimeout(compute, at - offset));
    };

    // Each stage calculates from the preceding stage only when its delay has elapsed.
    if (encoded === null) {
      schedule(FLOW_TIMELINE.encoded, () => {
        encoded = encodeHamming74(data);
        publish({ encoded });
      });
    }
    schedule(FLOW_TIMELINE.received, () => {
      if (encoded === null) return;
      received = transmitWord(encoded, errors);
      publish({ received });
    });
    HAMMING_SYNDROME_GROUPS.forEach((group, index) => {
      schedule(FLOW_TIMELINE.checkRows[index], () => {
        if (received === null) return;
        const next = [...checkBits] as [Bit | null, Bit | null, Bit | null];
        next[index] = checkParity(received, group.checks);
        checkBits = next;
        publish({ checkBits });
      });
    });
    schedule(FLOW_TIMELINE.syndrome, () => {
      const [s4, s2, s1] = checkBits;
      if (s4 === null || s2 === null || s1 === null) return;
      const syndromeBits = [s4, s2, s1] as const;
      syndrome = syndromePosition(syndromeBits);
      publish({ syndromeBits, syndrome });
    });
    schedule(FLOW_TIMELINE.corrected, () => {
      if (received === null || syndrome === null) return;
      corrected = correctWord(received, syndrome);
      publish({ corrected });
    });
    schedule(FLOW_TIMELINE.output, () => {
      if (corrected === null) return;
      publish({ output: extractData(corrected) });
    });
    return () => timers.forEach(clearTimeout);
  }, [data, errors, run]);

  const toggleData = useCallback((index: number) => {
    setSimulation((current) => ({
      ...current,
      data: current.data.map((bit, bitIndex) => (bitIndex === index ? ((bit ^ 1) as Bit) : bit)) as unknown as DataWord,
      run: { encoded: null },
      result: pendingComputation(null),
    }));
  }, []);

  const toggleError = useCallback((index: number) => {
    setSimulation((current) => ({
      ...current,
      errors: current.errors.map((bit, bitIndex) => (bitIndex === index ? ((bit ^ 1) as Bit) : bit)) as unknown as HammingWord,
      // Reuse encoding only if it has already completed for the current data.
      run: { encoded: current.result.encoded },
      result: pendingComputation(current.result.encoded),
    }));
  }, []);

  return { data, errors, result: simulation.result, toggleData, toggleError };
}

function bits(word: readonly Bit[]): string {
  return word.join("");
}

function readableLevelColor(level: number): string {
  return READABLE_CHECK_COLORS[level] ?? THEORY_LEVELS[level].color;
}

function dataCodeSlots(data: DataWord | null): readonly (Bit | null)[] {
  return [null, null, data?.[0] ?? null, null, data?.[1] ?? null, data?.[2] ?? null, data?.[3] ?? null];
}

interface BitRailProps {
  slots: readonly (Bit | null)[];
  bitString: string | undefined;
  emphasizedPositions?: readonly number[];
  emphasisTone?: "error" | "success" | "warning";
  emphasisLabel?: string;
  control?: "data" | "error";
  errors?: HammingWord;
  onToggle?: (index: number) => void;
  onHover?: (level: number | null) => void;
  checkPositions?: readonly number[] | undefined;
}

function BitRail({
  slots,
  bitString,
  emphasizedPositions = [],
  emphasisTone = "error",
  emphasisLabel,
  control,
  errors,
  onToggle,
  onHover,
  checkPositions,
}: BitRailProps) {
  const { t } = useTranslation();
  const emphasisColor = emphasisTone === "success" ? C.success : emphasisTone === "warning" ? C.warning : C.error;
  return (
    <div
      data-bit-string={bitString}
      role={control ? "group" : undefined}
      aria-label={
        control
          ? t(control === "data" ? "theory_hamming_data_controls_aria" : "theory_hamming_error_controls_aria")
          : (bitString ?? t("theory_hamming_pending"))
      }
      aria-busy={bitString === undefined}
      style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: SP.xs, width: "100%" }}
    >
      {slots.map((bit, index) => {
        const position = index + 1;
        const emphasized = emphasizedPositions.includes(position);
        const dataIndex = HAMMING_DATA_POSITIONS.findIndex((entry) => entry === position);
        const interactive = !!onToggle && (control === "error" || dataIndex >= 0);
        const Slot = interactive ? "button" : "span";
        return (
          <Slot
            key={`bit-slot-${position}`}
            data-code-position={position}
            data-bit-role={HAMMING_POSITION_ROLES[index]}
            data-empty={bit === null ? "true" : "false"}
            data-flow-emphasis={emphasized ? emphasisTone : undefined}
            data-parity-member={checkPositions ? checkPositions.includes(position) : undefined}
            data-testid={interactive ? `hamming-${control}-${control === "data" ? dataIndex + 1 : position}` : undefined}
            type={interactive ? "button" : undefined}
            aria-hidden={interactive ? undefined : true}
            aria-pressed={interactive ? (control === "data" ? bit === 1 : errors?.[index] === 1) : undefined}
            aria-label={
              interactive
                ? control === "data"
                  ? `D${dataIndex + 1}, ${levelLabel(position)}, ${bit}`
                  : `${t("theory_hamming_error_position")} ${position}, ${levelLabel(position)}, ${errors?.[index]}`
                : undefined
            }
            onClick={interactive ? () => onToggle?.(control === "data" ? dataIndex : index) : undefined}
            onMouseEnter={interactive ? () => onHover?.(position) : undefined}
            onMouseLeave={interactive ? () => onHover?.(null) : undefined}
            onFocus={interactive ? () => onHover?.(position) : undefined}
            onBlur={interactive ? () => onHover?.(null) : undefined}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: emphasized ? 1 : 0,
              minWidth: 0,
              minHeight: interactive ? 32 : 24,
              padding: "2px 0",
              font: "inherit",
              lineHeight: 1.15,
              cursor: interactive ? "pointer" : undefined,
              border: emphasized ? `1px solid ${emphasisColor}` : bit === null ? `1px dashed ${C.border}` : `1px solid ${C.borderAlt}`,
              borderRadius: 3,
              background: bit === null ? "transparent" : C.bgSurfaceHover,
              color: bit === null ? C.textSubtle : C.textPrimary,
              boxShadow: emphasized ? `inset 0 0 0 1px ${emphasisColor}` : undefined,
              boxSizing: "border-box",
            }}
          >
            {interactive && (
              <small
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  lineHeight: 1,
                  color: C.textMuted,
                  whiteSpace: "nowrap",
                }}
              >
                <span>{control === "data" ? `D${dataIndex + 1}` : position}</span>
                {emphasized && emphasisLabel && (
                  <span style={{ color: emphasisColor, fontSize: 7, fontWeight: FW.bold }}>{emphasisLabel}</span>
                )}
              </small>
            )}
            <span data-bit-value={bit ?? undefined}>{bit ?? "–"}</span>
            {!interactive && emphasized && emphasisLabel && (
              <small style={{ color: emphasisColor, fontFamily: FONT.mono, fontSize: "7px", fontWeight: FW.bold, lineHeight: 1 }}>
                {emphasisLabel}
              </small>
            )}
          </Slot>
        );
      })}
    </div>
  );
}

interface SyndromeDisplayProps {
  syndromeBits: readonly [Bit, Bit, Bit] | null;
  level: string;
  position: number | null;
  positionText: string;
}

function SyndromeDisplay({ syndromeBits, level, position, positionText }: SyndromeDisplayProps) {
  const { t } = useTranslation();
  const syndrome = syndromeBits === null ? undefined : bits(syndromeBits);
  return (
    <div
      data-syndrome-bits={syndrome}
      data-syndrome-position={position ?? undefined}
      aria-label={syndrome === undefined ? t("theory_hamming_pending") : `${syndrome}, j=${position}, ${positionText}`}
      aria-busy={syndrome === undefined}
      style={{ minWidth: 0 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: SP.sm }}>
        {(["sG", "sR", "sB"] as const).map((channel, index) => (
          <span
            key={channel}
            data-syndrome-channel={channel}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}
          >
            <small style={{ color: C.textMuted, fontFamily: FONT.mono, fontSize: 10, lineHeight: 1 }}>{channel}</small>
            <strong
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minHeight: 20,
                border: `1px solid ${C.borderAlt}`,
                borderRadius: 3,
                background: C.bgSurfaceHover,
                color: C.textPrimary,
                boxSizing: "border-box",
              }}
            >
              {syndromeBits?.[index] ?? "–"}
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
          fontSize: 12,
        }}
      >
        <strong style={{ color: C.textPrimary }}>{syndrome === undefined ? "–" : `${syndrome}₂`}</strong>
        <span aria-hidden="true">→</span>
        <strong style={{ color: C.accentBright }}>j={position ?? "–"}</strong>
        <span aria-hidden="true">→</span>
        <span>{positionText}</span>
      </div>
      <div style={{ marginTop: 2, color: C.textDimmer, fontSize: 10, textAlign: "right" }}>
        4×{syndromeBits?.[0] ?? "–"} + 2×{syndromeBits?.[1] ?? "–"} + {syndromeBits?.[2] ?? "–"} = {position ?? "–"} · {level}
      </div>
    </div>
  );
}

function ParityCheckOperation({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="hamming-flow-operation-check"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SP.xs,
        margin: `${SP.xs}px 0`,
        minWidth: 0,
      }}
    >
      <FlowOperation label={t("theory_hamming_operation_check")} testId="hamming-flow-operation-check-input" />
      <div
        data-testid="hamming-syndrome-identity"
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
            fontSize: 12,
          }}
        >
          <span>r = c ⊕ e</span>
          <span aria-hidden="true">→</span>
          <span>Hcᵀ = 000</span>
          <span aria-hidden="true">⇒</span>
          <strong style={{ color: C.accentBright }}>s = Hrᵀ = Heᵀ</strong>
        </div>
        <small style={{ color: C.textDimmer, fontFamily: FONT.sans, fontSize: 11, lineHeight: 1.6, textAlign: "center" }}>
          {t("theory_hamming_syndrome_identity_note")}
        </small>
      </div>
      {children}
      <FlowOperation label={t("theory_hamming_checks_to_syndrome")} testId="hamming-flow-operation-check-output" />
    </div>
  );
}

function BitRailHeader({ label }: { label: string }) {
  return (
    <div
      data-testid="hamming-flow-bit-header"
      className="theory-hamming-header"
      style={{
        display: "grid",
        gridTemplateColumns: FLOW_ROW_COLUMNS,
        alignItems: "end",
        columnGap: SP.md,
        padding: `0 ${SP.lg}px ${SP.sm}px`,
        color: C.textDimmer,
        fontFamily: FONT.mono,
        fontSize: 10,
        boxSizing: "border-box",
      }}
    >
      <span />
      <span>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: SP.xs }}>
        {HAMMING_POSITION_ROLES.map((role, index) => (
          <span
            key={role}
            data-code-position={index + 1}
            data-h-column-bits={HAMMING_COLUMN_BITS[index]}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, lineHeight: 1.15 }}
          >
            <span style={{ whiteSpace: "nowrap" }}>
              <span style={{ color: C.textSubtle }}>{index + 1}</span>{" "}
              <strong style={{ color: C.textMuted, fontSize: "inherit" }}>{role}</strong>
            </span>
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
  pending?: boolean;
}

function StageCard({ number, label, value, note, testId, pending = false }: StageCardProps) {
  return (
    <div
      data-testid={testId}
      aria-busy={pending}
      className="theory-hamming-stage"
      style={{
        display: "grid",
        gridTemplateColumns: FLOW_ROW_COLUMNS,
        alignItems: "center",
        columnGap: SP.md,
        rowGap: 3,
        minWidth: 0,
        minHeight: 34,
        padding: `${SP.sm}px ${SP.lg}px`,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        background: C.bgPanel,
        boxSizing: "border-box",
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
      <div style={{ color: C.textMuted, fontFamily: FONT.mono, fontSize: 12, whiteSpace: "nowrap" }}>{label}</div>
      <div
        data-stage-value=""
        style={{ minWidth: 0, color: C.textPrimary, fontFamily: FONT.mono, fontSize: 14, fontWeight: FW.bold, letterSpacing: 1 }}
      >
        {value}
      </div>
      {note && (
        <div style={{ gridColumn: "1 / -1", color: C.textDimmer, fontFamily: FONT.mono, fontSize: 11, textAlign: "right" }}>{note}</div>
      )}
    </div>
  );
}

interface FlowOperationProps {
  label: string;
  testId: string;
}

function FlowOperation({ label, testId }: FlowOperationProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: SP.md,
        minHeight: 20,
        padding: `0 ${SP.lg}px`,
        color: C.textMuted,
        fontFamily: FONT.mono,
        fontSize: 11,
        boxSizing: "border-box",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          color: C.accentBright,
          fontSize: FS.lg,
          lineHeight: 1,
          textAlign: "center",
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

export const HammingDiagram = React.memo(function HammingDiagram({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const { data, errors, result, toggleData, toggleError } = useHammingSimulation();
  const [selectedParity, setSelectedParity] = useState<number | null>(null);
  const [previewParity, setPreviewParity] = useState<number | null>(null);
  const selectParity = useCallback((parity: number | null) => {
    setSelectedParity(parity);
    setPreviewParity(null);
  }, []);
  usePinReset(selectParity);
  const activeParity = previewParity ?? selectedParity;
  const errorCount = errors.reduce<number>((sum, bit) => sum + bit, 0);
  const outputMatches = result.output?.every((bit, index) => bit === data[index]) ?? false;
  const pending = result.output === null;

  const parityResults = HAMMING_PARITY_GROUPS.map((group) => {
    const failed = result.checkBits[HAMMING_SYNDROME_GROUPS.findIndex((check) => check.parity === group.parity)];
    const generated = result.encoded?.[group.parity - 1] ?? null;
    return { ...group, failed, generated };
  });

  const statusColor = pending || errorCount === 0 ? C.textMuted : errorCount === 1 && outputMatches ? C.success : C.error;
  const statusText =
    result.output === null || result.syndrome === null || result.syndromeBits === null
      ? t("theory_hamming_calculating")
      : errorCount === 0
        ? t("theory_hamming_status_none")
        : errorCount === 1
          ? t("theory_hamming_status_single", `${result.syndrome}`, levelLabel(result.syndrome))
          : result.syndrome === 0
            ? t("theory_hamming_status_undetected", `${errorCount}`)
            : t("theory_hamming_status_multiple", `${errorCount}`, bits(result.syndromeBits), levelLabel(result.syndrome));
  const transmissionOperation =
    errorCount === 0 ? t("theory_hamming_operation_transmit_clean") : t("theory_hamming_operation_transmit_errors", `${errorCount}`);
  const correctionOperation =
    result.corrected === null || result.received === null || result.syndrome === null
      ? t("theory_hamming_operation_correction")
      : errorCount === 0
        ? t("theory_hamming_operation_correction_none")
        : errorCount === 1
          ? t(
              "theory_hamming_operation_correction_single",
              `${result.syndrome}`,
              `${result.syndrome}`,
              `${result.received[result.syndrome - 1]}`,
              `${result.corrected[result.syndrome - 1]}`,
            )
          : result.syndrome === 0
            ? t("theory_hamming_operation_correction_undetected")
            : t("theory_hamming_operation_correction_multiple", `${result.syndrome}`, `${result.syndrome}`);
  const receivedErrorPositions = errors.flatMap((bit, index) => (bit ? [index + 1] : []));
  const correctionPositions = result.corrected === null || result.syndrome === null || result.syndrome === 0 ? [] : [result.syndrome];
  const syndromePositionText =
    result.syndrome === null
      ? t("theory_hamming_pending")
      : result.syndrome === 0
        ? t("theory_hamming_syndrome_no_position")
        : t("theory_hamming_syndrome_points_to", `${result.syndrome}`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SP.xl,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div
        role="group"
        aria-label={t("theory_hamming_flow_aria")}
        aria-busy={pending}
        className="theory-hamming-flow"
        style={{ display: "flex", flexDirection: "column", width: "100%" }}
      >
        <BitRailHeader label={t("theory_hamming_position_legend")} />
        <StageCard
          number={1}
          label={t("theory_hamming_stage_data")}
          value={<BitRail slots={dataCodeSlots(data)} bitString={bits(data)} control="data" onToggle={toggleData} onHover={onHover} />}
          note={t("theory_hamming_data_input_hint")}
          testId="hamming-stage-data"
        />
        <FlowOperation label={t("theory_hamming_operation_encode")} testId="hamming-flow-operation-encode" />
        <div
          className="theory-hamming-generation"
          data-testid="hamming-parity-generation"
          role="group"
          aria-label={t("theory_hamming_generator_title")}
        >
          {parityResults.map((group) => (
            <div key={group.parity} data-testid={`hamming-generator-${group.parity}`} aria-busy={group.generated === null}>
              <span className="theory-hamming-generation-heading">
                {group.data.map((index, termIndex) => (
                  <React.Fragment key={index}>
                    {termIndex > 0 && <span aria-hidden="true"> </span>}
                    <span className="theory-hamming-generation-inputs">D{SUBSCRIPT_DIGITS[index]}</span>
                  </React.Fragment>
                ))}
                <span aria-hidden="true"> </span>
                <span style={{ color: readableLevelColor(group.parity) }}>P{SUBSCRIPT_DIGITS[group.parity]}</span>
              </span>{" "}
              <span className="theory-hamming-generation-formula">
                {group.data.map((index, termIndex) => (
                  <React.Fragment key={index}>
                    {termIndex > 0 && <span>{" ⊕ "}</span>}
                    <span>{group.generated === null ? `D${SUBSCRIPT_DIGITS[index]}` : data[index - 1]}</span>
                  </React.Fragment>
                ))}
                <span>{" = "}</span>
                <strong>{group.generated ?? `P${SUBSCRIPT_DIGITS[group.parity]}`}</strong>
              </span>
            </div>
          ))}
        </div>
        <StageCard
          number={2}
          label={t("theory_hamming_stage_encoded")}
          value={<BitRail slots={result.encoded ?? EMPTY_SLOTS} bitString={result.encoded === null ? undefined : bits(result.encoded)} />}
          testId="hamming-stage-encoded"
          pending={result.encoded === null}
        />
        <FlowOperation label={transmissionOperation} testId="hamming-flow-operation-transmit" />
        <StageCard
          number={3}
          label={t("theory_hamming_stage_received")}
          value={
            <BitRail
              slots={result.received ?? EMPTY_SLOTS}
              bitString={result.received === null ? undefined : bits(result.received)}
              emphasizedPositions={receivedErrorPositions}
              emphasisTone="error"
              emphasisLabel={t("theory_hamming_received_error_marker")}
              control="error"
              errors={errors}
              onToggle={toggleError}
              onHover={onHover}
              checkPositions={parityResults.find((check) => check.parity === activeParity)?.checks}
            />
          }
          testId="hamming-stage-received"
          note={t("theory_hamming_error_input_hint")}
          pending={result.received === null}
        />
        <ParityCheckOperation>
          <HammingParitySets
            received={result.received}
            errors={errors}
            checks={parityResults.map((check) => ({ ...check, color: readableLevelColor(check.parity) }))}
            selectedParity={selectedParity}
            previewParity={previewParity}
            onSelectParity={selectParity}
            onPreviewParity={setPreviewParity}
            hlLevel={hlLevel}
            onHover={onHover}
            onToggleError={toggleError}
          />
        </ParityCheckOperation>
        <StageCard
          number={4}
          label={t("theory_hamming_stage_syndrome")}
          value={
            <SyndromeDisplay
              syndromeBits={result.syndromeBits}
              level={result.syndrome === null ? "–" : levelLabel(result.syndrome)}
              position={result.syndrome}
              positionText={syndromePositionText}
            />
          }
          testId="hamming-stage-syndrome"
          pending={result.syndrome === null}
        />
        <FlowOperation label={correctionOperation} testId="hamming-flow-operation-correction" />
        <StageCard
          number={5}
          label={t("theory_hamming_stage_corrected")}
          value={
            <BitRail
              slots={result.corrected ?? EMPTY_SLOTS}
              bitString={result.corrected === null ? undefined : bits(result.corrected)}
              emphasizedPositions={correctionPositions}
              emphasisTone={errorCount === 1 ? "success" : "warning"}
              emphasisLabel={t(errorCount === 1 ? "theory_hamming_corrected_marker" : "theory_hamming_trial_marker")}
            />
          }
          testId="hamming-stage-corrected"
          pending={result.corrected === null}
        />
        <FlowOperation label={t("theory_hamming_operation_extract")} testId="hamming-flow-operation-extract" />
        <StageCard
          number={6}
          label={t("theory_hamming_stage_output")}
          value={<BitRail slots={dataCodeSlots(result.output)} bitString={result.output === null ? undefined : bits(result.output)} />}
          note={t(pending ? "theory_hamming_pending" : outputMatches ? "theory_hamming_output_match" : "theory_hamming_output_mismatch")}
          testId="hamming-stage-output"
          pending={pending}
        />
      </div>

      <div
        data-testid="hamming-status"
        role="status"
        style={{
          width: "100%",
          padding: `${SP.md}px ${SP.xl}px`,
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
    </div>
  );
});
