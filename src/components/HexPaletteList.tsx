import React from "react";
import { CANONICAL_VERTEX_HUE_BY_LEVEL } from "../chromalum-color-model";
import { LEVEL_INFO, LEVEL_CANDIDATES, hue2rgb } from "../color-engine";
import { rgbStr, hexStr } from "../utils";
import { useTranslation } from "../i18n";
import { useColorPin } from "../hooks/useColorPin";
import { C } from "../styles/tokens";
import type { ColorAction } from "../state/color-reducer";

interface Props {
  candidateIndexByLevel: readonly number[];
  dispatch: React.Dispatch<ColorAction>;
  levelHistogram: readonly number[];
  lockedLevels: readonly boolean[];
  onSetLock: (level: number, locked: boolean) => void;
  active: boolean;
}

// The archived ColorMappingList is the source for this alternate Hex view.
export function HexPaletteList(props: Props) {
  const { candidateIndexByLevel, dispatch, lockedLevels } = props;
  const { t } = useTranslation();
  const candidateProps = useColorPin(props);
  return (
    <div role="list" aria-label={t("hex_list_label")} className="hex-palette-list">
      {LEVEL_INFO.map((info, level) => {
        const candidates = LEVEL_CANDIDATES[level];
        const selected = candidateIndexByLevel[level] % candidates.length;
        const current = candidates[selected];
        const multiple = candidates.length > 1;
        const canonical = CANONICAL_VERTEX_HUE_BY_LEVEL[level];
        let delta = current.hueAngleDeg - canonical;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        delta = Math.round(delta);
        return (
          <div
            role="listitem"
            aria-label={`L${level}`}
            key={level}
            className="hex-list-row"
            data-multiple={multiple}
            data-chromatic={canonical >= 0}
            data-locked={lockedLevels[level]}
          >
            <span className="hex-list-level">
              <span className="hex-list-gray" style={{ background: `rgb(${info.gray8},${info.gray8},${info.gray8})` }} />
              <span>L{level}</span>
            </span>
            <span className="hex-list-current">
              {multiple && (
                <button
                  className="hex-list-arrow"
                  disabled={lockedLevels[level]}
                  aria-label={t("aria_prev_color", level, info.name)}
                  onClick={() => dispatch({ type: "cycle_color", levelIndex: level, direction: -1 })}
                >
                  ◀
                </button>
              )}
              <span className="hex-list-current-swatch" style={{ background: rgbStr(current.rgb) }} />
              {multiple && (
                <button
                  className="hex-list-arrow"
                  disabled={lockedLevels[level]}
                  aria-label={t("aria_next_color", level, info.name)}
                  onClick={() => dispatch({ type: "cycle_color", levelIndex: level, direction: 1 })}
                >
                  ▶
                </button>
              )}
            </span>
            <span className="hex-list-equation">
              {canonical < 0 ? (
                "—"
              ) : (
                <>
                  <span data-a11y-color-contrast-exception="intentional-color-sample" style={{ color: rgbStr(hue2rgb(canonical)) }}>
                    ⬡{canonical}°
                  </span>
                  <span>{delta >= 0 ? "+" : "−"}</span>
                  <span style={{ color: delta === 0 ? C.textDim : C.textPrimary }}>Δ{Math.abs(delta)}°</span>
                  <span>=</span>
                  <span
                    data-a11y-color-contrast-exception="intentional-color-sample"
                    style={{ color: rgbStr(hue2rgb(current.hueAngleDeg)) }}
                  >
                    {current.hueAngleDeg}°
                  </span>
                </>
              )}
            </span>
            <span className="hex-list-candidates">
              {multiple &&
                candidates.map((candidate, index) => (
                  <button
                    key={index}
                    className="hex-list-candidate"
                    {...candidateProps(level, index)}
                    data-locked={lockedLevels[level]}
                    aria-disabled={lockedLevels[level] && selected !== index}
                    aria-label={t("aria_color_candidate", level, hexStr(candidate.rgb), candidate.hueLabel)}
                    title={`${hexStr(candidate.rgb)} ${candidate.hueLabel}`}
                    style={{ background: rgbStr(candidate.rgb) }}
                  />
                ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
