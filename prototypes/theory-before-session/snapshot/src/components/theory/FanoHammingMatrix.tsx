import React from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";

const POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const;
const CHANNELS = ["G", "R", "B"] as const;
// All three notes share one grid cell so the row keeps the tallest note's
// height in every font, and selecting a point never shifts the explorer.
const SYNDROME_NOTES = ["theory_fano_matrix_codeword", "theory_fano_matrix_single_error", "theory_fano_matrix_choose"] as const;

interface Props {
  activePoints: readonly number[];
  selectedPoints: readonly number[];
  onPointEnter: (level: number) => void;
  onPointLeave: () => void;
  onPointSelect: (level: number, fromPointer: boolean) => void;
  onPointFocus: (level: number) => void;
  onPointBlur: () => void;
}

export const FanoHammingMatrix = React.memo(function FanoHammingMatrix({
  activePoints,
  selectedPoints,
  onPointEnter,
  onPointLeave,
  onPointSelect,
  onPointFocus,
  onPointBlur,
}: Props) {
  const { t } = useTranslation();
  const hasSelection = activePoints.length > 0;
  const word = POSITIONS.map((position) => (activePoints.includes(position) ? 1 : 0));
  const syndrome = activePoints.reduce((sum, point) => sum ^ point, 0);
  const syndromeBits = THEORY_LEVELS[syndrome].bits.join("");

  return (
    <div className="theory-fano-matrix" data-testid="fano-hamming-matrix" role="group" aria-label={t("theory_fano_matrix_title")}>
      <div className="theory-fano-matrix-heading">
        <span>{t("theory_fano_matrix_title")}</span>
        <small>3 × 7</small>
      </div>
      <div className="theory-fano-matrix-grid" data-testid="hamming-fano-columns">
        <div className="theory-fano-matrix-axis" aria-hidden="true">
          <span>H</span>
          {CHANNELS.map((channel) => (
            <span key={channel} data-channel={channel}>
              {channel}
            </span>
          ))}
        </div>
        {POSITIONS.map((position) => {
          const info = THEORY_LEVELS[position];
          return (
            <button
              key={position}
              type="button"
              className="theory-fano-matrix-column"
              data-h-column={position}
              data-h-column-bits={info.bits.join("")}
              data-active={activePoints.includes(position)}
              aria-pressed={selectedPoints.includes(position)}
              aria-label={t("theory_fano_matrix_column", position, info.short, info.bits.join(""))}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") onPointEnter(position);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") onPointLeave();
              }}
              onFocus={() => onPointFocus(position)}
              onBlur={onPointBlur}
              onClick={(event) => onPointSelect(position, event.detail > 0)}
            >
              <span className="theory-fano-column-name">
                <i style={{ background: info.color }} aria-hidden="true" />
                {info.short}
                <sub>{position}</sub>
              </span>
              {info.bits.map((bit, index) => (
                <span key={CHANNELS[index]} data-bit={bit}>
                  {bit}
                </span>
              ))}
            </button>
          );
        })}
        <span className="theory-fano-word-axis" aria-hidden="true">
          x
        </span>
        {POSITIONS.map((position, index) => (
          <span key={`word-${position}`} className="theory-fano-word-bit" data-active={hasSelection && word[index] === 1}>
            {hasSelection ? word[index] : "–"}
          </span>
        ))}
      </div>
      <p className="theory-fano-word-caption">{t("theory_fano_matrix_word")}</p>

      <div
        className="theory-fano-checks"
        data-testid="fano-hamming-checks"
        data-word={hasSelection ? word.join("") : ""}
        data-syndrome={hasSelection ? syndromeBits : ""}
        data-weight={hasSelection ? activePoints.length : ""}
      >
        <div className="theory-fano-checks-heading">
          <span>
            {t(
              activePoints.length === 3
                ? "theory_fano_matrix_line"
                : hasSelection
                  ? "theory_fano_matrix_point"
                  : "theory_fano_matrix_empty",
            )}
          </span>
          <code>wt(x) = {hasSelection ? activePoints.length : "–"}</code>
        </div>
        <div className="theory-fano-check-rows">
          {CHANNELS.map((channel, index) => {
            const bits = activePoints.map((point) => THEORY_LEVELS[point].bits[index]);
            return (
              <div key={channel} className="theory-fano-check" data-channel={channel}>
                <span>{channel}</span>
                <code>{hasSelection ? `${bits.join("⊕")} = ${THEORY_LEVELS[syndrome].bits[index]}` : "–"}</code>
              </div>
            );
          })}
        </div>
        <div className="theory-fano-syndrome">
          <code>
            Hxᵀ = <strong>{hasSelection ? syndromeBits : "– – –"}</strong>
          </code>
          <span>
            {SYNDROME_NOTES.map((key) => (
              <span
                key={key}
                data-active={
                  (key === "theory_fano_matrix_codeword"
                    ? activePoints.length === 3
                    : key === "theory_fano_matrix_single_error"
                      ? hasSelection && activePoints.length !== 3
                      : !hasSelection) || undefined
                }
              >
                {t(key)}
              </span>
            ))}
          </span>
        </div>
      </div>
      <div className="theory-fano-matrix-footer">
        <code>ker H = Hamming [7,4,3]</code>
      </div>
    </div>
  );
});
