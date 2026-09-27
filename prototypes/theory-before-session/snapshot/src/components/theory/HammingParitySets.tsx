import React, { useId, useLayoutEffect, useRef } from "react";
import { THEORY_LEVELS, SUBSCRIPT_DIGITS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C } from "../../styles/tokens";
import type { Bit, HammingWord } from "../../data/hamming-data";
import { levelLabelColor } from "../../color-engine";

const CIRCLES = [
  { parity: 2, cx: 170, cy: 94, labelX: 170, labelY: -4 },
  { parity: 4, cx: 220, cy: 156, labelX: 286, labelY: 253 },
  { parity: 1, cx: 120, cy: 156, labelX: 54, labelY: 253 },
] as const;
const POSITIONS = [
  { position: 1, x: 76, y: 194 },
  { position: 2, x: 170, y: 39 },
  { position: 3, x: 125, y: 101 },
  { position: 4, x: 264, y: 194 },
  { position: 5, x: 170, y: 215 },
  { position: 6, x: 215, y: 101 },
  { position: 7, x: 170, y: 153 },
] as const;
function HammingLegend() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const row = rowRef.current;
    if (!container || !row) return;
    let mounted = true;
    const fit = () => {
      if (!mounted) return;
      // Measure at the normal size so widening the figure restores the text too.
      row.style.removeProperty("--hamming-legend-scale");
      const available = container.getBoundingClientRect().width;
      const natural = row.getBoundingClientRect().width;
      if (available > 0 && natural > available) {
        row.style.setProperty("--hamming-legend-scale", String((available - 1) / natural));
      }
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(container);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      mounted = false;
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [t]);

  return (
    <figcaption className="theory-hamming-sets-legend" ref={containerRef}>
      <span className="theory-hamming-sets-legend-row" ref={rowRef}>
        <span>
          <b>0 / 1</b> {t("theory_hamming_venn_bit_legend")}
        </span>
        <span>
          <b className="theory-hamming-error-legend">!</b> {t("theory_hamming_venn_error_legend")}
        </span>
        <span>
          <i className="theory-hamming-dashed-legend" aria-hidden="true" /> {t("theory_hamming_venn_failed_legend")}
        </span>
      </span>
    </figcaption>
  );
}

interface Check {
  readonly parity: number;
  readonly channel: string;
  readonly checks: readonly number[];
  readonly failed: Bit | null;
  readonly color: string;
}

interface Props {
  received: HammingWord | null;
  errors: HammingWord;
  checks: readonly Check[];
  hlLevel: number | null;
  onHover: (level: number | null) => void;
  onToggleError: (index: number) => void;
  selectedParity: number | null;
  previewParity: number | null;
  onSelectParity: (parity: number | null) => void;
  onPreviewParity: (parity: number | null) => void;
}

export const HammingParitySets = React.memo(function HammingParitySets({
  received,
  errors,
  checks,
  hlLevel,
  onHover,
  onToggleError,
  selectedParity,
  previewParity,
  onSelectParity,
  onPreviewParity,
}: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const helpId = useId();
  const activeParity = previewParity ?? selectedParity;
  const activeCheck = checks.find((check) => check.parity === activeParity);
  const orderedChecks = [...checks].sort((a, b) => b.parity - a.parity);
  const checkState = (failed: Bit | null) =>
    t(failed === null ? "theory_hamming_pending" : failed ? "theory_hamming_check_fail" : "theory_hamming_check_pass");

  return (
    <section className="theory-hamming-sets" data-testid="hamming-parity-sets" aria-labelledby={titleId}>
      <header className="theory-hamming-sets-heading">
        <div id={titleId} className="theory-diagram-label">
          {t("theory_hamming_venn_title")}
        </div>
        <p id={helpId}>{t("theory_hamming_venn_help")}</p>
      </header>
      <div className="theory-hamming-sets-layout">
        <figure className="theory-hamming-sets-figure">
          <svg
            viewBox="22 -20 296 296"
            role="group"
            aria-label={t("theory_hamming_venn_aria")}
            aria-describedby={helpId}
            onClick={(event) => {
              if (!(event.target as Element).closest('[role="button"]')) onSelectParity(null);
            }}
          >
            {CIRCLES.map(({ parity, cx, cy, labelX, labelY }) => {
              const check = checks.find((entry) => entry.parity === parity)!;
              const active = activeParity === parity;
              const muted = activeParity !== null && !active;
              return (
                <g
                  key={parity}
                  data-testid={`hamming-parity-set-${parity}`}
                  data-selected={selectedParity === parity}
                  data-active={active}
                  data-check-result={check.failed ?? undefined}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r="86"
                    fill={check.color}
                    fillOpacity={active ? 0.075 : 0.02}
                    stroke={check.color}
                    strokeWidth={active ? 2.4 : 1.4}
                    strokeOpacity={muted ? 0.24 : 0.8}
                    strokeDasharray={check.failed === 1 ? "6 4" : undefined}
                  />
                  <rect x={labelX - 30} y={labelY - 10} width="60" height="20" rx="5" fill={C.bgRoot} />
                  <text
                    x={labelX}
                    y={labelY}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill={check.color}
                    className="theory-hamming-set-label"
                  >
                    {t("theory_hamming_venn_check_label", check.channel)}
                  </text>
                </g>
              );
            })}
            {POSITIONS.map(({ position, x, y }) => {
              const info = THEORY_LEVELS[position];
              const bit = received?.[position - 1] ?? null;
              const injected = errors[position - 1] === 1;
              const member = activeCheck?.checks.includes(position) ?? true;
              const highlighted = hlLevel === position;
              const nodeLabel = t(
                "theory_hamming_venn_node_aria",
                `${position}`,
                info.hamming,
                `${bit ?? "–"}`,
                t(injected ? "theory_hamming_venn_remove_error" : "theory_hamming_venn_add_error"),
              );
              return (
                <g
                  key={position}
                  data-testid={`hamming-venn-position-${position}`}
                  data-check-member={member}
                  data-received-bit={bit ?? undefined}
                  data-error-injected={injected}
                  className="theory-hamming-set-node"
                  role="button"
                  tabIndex={0}
                  aria-label={nodeLabel}
                  aria-pressed={injected}
                  onClick={() => onToggleError(position - 1)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!event.repeat) onToggleError(position - 1);
                    }
                  }}
                  onMouseEnter={() => onHover(position)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(position)}
                  onBlur={() => onHover(null)}
                >
                  <circle cx={x} cy={y} r="14" fill={info.color} stroke={C.textWhite} strokeWidth="0.8" />
                  <circle
                    className="theory-hamming-node-focus"
                    cx={x}
                    cy={y}
                    r="20"
                    fill="none"
                    stroke={highlighted ? C.textWhite : "transparent"}
                    strokeWidth="1.6"
                  />
                  {injected && (
                    <g aria-hidden="true">
                      <circle cx={x} cy={y} r="17.5" fill="none" stroke={C.error} strokeWidth="2" />
                      <circle cx={x + 14} cy={y - 14} r="7" fill={C.error} />
                      <text
                        x={x + 14}
                        y={y - 14}
                        dominantBaseline="central"
                        textAnchor="middle"
                        fill="#fff"
                        className="theory-hamming-error-symbol"
                      >
                        !
                      </text>
                    </g>
                  )}
                  <text
                    x={x}
                    y={y}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill={levelLabelColor(position)}
                    className="theory-hamming-received-bit"
                    aria-hidden="true"
                  >
                    {bit ?? "–"}
                  </text>
                  <rect x={x - 31} y={y + 18} width="62" height="17" rx="3" fill={C.bgRoot} aria-hidden="true" />
                  <text
                    x={x}
                    y={y + 29}
                    textAnchor="middle"
                    fill={C.textPrimary}
                    className="theory-hamming-position-label"
                    aria-hidden="true"
                  >
                    {info.short}
                    {SUBSCRIPT_DIGITS[position]} · {info.hamming}
                  </text>
                  <circle cx={x} cy={y} r="30" fill="transparent" className="theory-hamming-node-target" />
                </g>
              );
            })}
          </svg>
          <HammingLegend />
        </figure>
        <div className="theory-hamming-sets-inspector">
          <div
            className="theory-hamming-check-choices"
            data-testid="hamming-parity-check-card"
            role="group"
            aria-label={t("theory_hamming_venn_select_check")}
          >
            {orderedChecks.map((check) => {
              const pending = check.failed === null || received === null;
              const terms = check.checks
                .map((position) => (pending ? `r${SUBSCRIPT_DIGITS[position]}` : received[position - 1]))
                .join(" ⊕ ");
              const formula = pending ? terms : `${terms} = ${check.failed}`;
              const ones = pending ? null : check.checks.reduce((total, position) => total + received[position - 1], 0);
              const reason =
                ones === null
                  ? "—"
                  : t(
                      ones === 1
                        ? "theory_hamming_venn_one_count"
                        : check.failed
                          ? "theory_hamming_venn_odd_count"
                          : "theory_hamming_venn_even_count",
                      String(ones),
                    );
              return (
                <button
                  key={check.parity}
                  type="button"
                  className="theory-hamming-check-choice"
                  data-testid={`hamming-venn-check-${check.parity}`}
                  data-parity-check-channel={`s${check.channel}`}
                  data-parity-check-result={check.failed ?? undefined}
                  aria-busy={check.failed === null}
                  aria-pressed={selectedParity === check.parity}
                  aria-label={`${t("theory_hamming_venn_check_label", check.channel)} P${check.parity}, ${checkState(check.failed)}, ${t("theory_hamming_venn_positions")} ${check.checks.join(" · ")}, s${check.channel} = ${formula}`}
                  aria-description={
                    pending
                      ? t("theory_hamming_venn_check_pending")
                      : `${reason} ${t(check.failed ? "theory_hamming_venn_odd" : "theory_hamming_venn_even")}`
                  }
                  onClick={() => onSelectParity(selectedParity === check.parity ? null : check.parity)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch") onPreviewParity(check.parity);
                  }}
                  onPointerLeave={() => onPreviewParity(null)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) onPreviewParity(check.parity);
                  }}
                  onBlur={() => onPreviewParity(null)}
                >
                  <span className="theory-hamming-check-heading">
                    <span className="theory-hamming-check-identity">
                      <strong style={{ color: check.color }}>{t("theory_hamming_venn_check_label", check.channel)}</strong>
                      <small>P{check.parity}</small>
                      <span className="theory-hamming-check-positions">{check.checks.join("·")}</span>
                    </span>
                    <span className="theory-hamming-check-state" data-failed={check.failed === 1}>
                      {check.failed === null ? "–" : check.failed ? "×" : "✓"}
                      <span className="theory-hamming-check-state-label"> {checkState(check.failed)}</span>
                    </span>
                  </span>
                  <span
                    className="theory-hamming-check-formula"
                    data-check-value={check.failed ?? undefined}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {check.checks.map((position, index) => (
                      <React.Fragment key={position}>
                        {index > 0 && <span className="theory-hamming-check-operator">{" ⊕ "}</span>}
                        <span className="theory-hamming-check-term">
                          {pending ? `r${SUBSCRIPT_DIGITS[position]}` : received[position - 1]}
                        </span>
                      </React.Fragment>
                    ))}
                    <span className="theory-hamming-check-operator">{pending ? null : " = "}</span>
                    <span className="theory-hamming-check-result">{pending ? null : check.failed}</span>
                  </span>
                  <span className="theory-hamming-check-reason">{reason}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});
