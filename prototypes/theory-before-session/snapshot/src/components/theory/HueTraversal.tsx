import React, { useState } from "react";
import { GRAY_PATH, GRAY_TOGGLES, THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { GrayCodeHex } from "./GrayCodeHex";
import { ToneZigzag } from "./ToneZigzag";

interface Props {
  hlLevel: number | null;
  onHover: (level: number | null) => void;
}

export const HueTraversal = React.memo(function HueTraversal({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [{ currentIndex, selectedEdge, direction }, setTraversal] = useState<{
    currentIndex: number | null;
    selectedEdge: number | null;
    direction: 1 | -1;
  }>({
    currentIndex: null,
    selectedEdge: null,
    direction: 1,
  });

  const selectStart = (level: number) => {
    const index = GRAY_PATH.indexOf(level);
    if (index < 0) return;
    setTraversal((current) => (current.currentIndex === null ? { ...current, currentIndex: index } : current));
    onHover(null);
  };
  const step = (nextDirection: 1 | -1) => {
    setTraversal((current) => {
      if (current.currentIndex === null) return current;
      const nextIndex = (current.currentIndex + nextDirection + GRAY_PATH.length) % GRAY_PATH.length;
      return {
        currentIndex: nextIndex,
        selectedEdge: nextDirection === 1 ? current.currentIndex : nextIndex,
        direction: nextDirection,
      };
    });
    onHover(null);
  };
  const currentLevel = currentIndex === null ? null : GRAY_PATH[currentIndex];
  const transition =
    selectedEdge === null
      ? null
      : {
          from: GRAY_PATH[direction === 1 ? selectedEdge : (selectedEdge + 1) % GRAY_PATH.length],
          to: GRAY_PATH[direction === 1 ? (selectedEdge + 1) % GRAY_PATH.length : selectedEdge],
          channel: GRAY_TOGGLES[selectedEdge],
        };
  const caption = transition
    ? t(
        transition.to > transition.from ? "theory_gray_add_sentence" : "theory_gray_remove_sentence",
        t(`theory_gray_channel_${transition.channel}`),
        THEORY_LEVELS[transition.from].name.toLowerCase(),
        THEORY_LEVELS[transition.to].name.toLowerCase(),
      )
    : currentLevel === null
      ? t("theory_hue_start_prompt")
      : t("theory_hue_start_selected", THEORY_LEVELS[currentLevel].name.toLowerCase());

  return (
    <ToneZigzag
      hlLevel={hlLevel}
      onHover={onHover}
      selectedEdge={selectedEdge}
      currentLevel={currentLevel}
      direction={direction}
      companion={
        <div className="theory-hue-cycle-panel">
          <GrayCodeHex
            hlLevel={hlLevel}
            onHover={onHover}
            selectedEdge={selectedEdge}
            currentLevel={currentLevel}
            onSelectStart={currentLevel === null ? selectStart : null}
            direction={direction}
            controls={
              <div className="theory-hue-controls">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={currentLevel === null}
                  aria-label={t("theory_hue_counterclockwise")}
                  title={t("theory_hue_counterclockwise")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 10a9 9 0 1 1 2.64 8.36M3 4v6h6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={currentLevel === null}
                  aria-label={t("theory_hue_clockwise")}
                  title={t("theory_hue_clockwise")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 10a9 9 0 1 1 2.64 8.36M3 4v6h6" transform="translate(24 0) scale(-1 1)" />
                  </svg>
                </button>
              </div>
            }
          />
        </div>
      }
      overviewCaption={
        <p className="theory-hue-caption" lang="en">
          {caption}
        </p>
      }
      status={
        <p
          className="theory-hue-status"
          role="status"
          aria-live="polite"
          lang={transition ? undefined : "en"}
          data-hue-transition={transition ? `${transition.from}-${transition.to}` : undefined}
        >
          {transition
            ? t(
                "theory_hue_transition",
                `${THEORY_LEVELS[transition.from].short} ${THEORY_LEVELS[transition.from].bits.join("")}`,
                `${THEORY_LEVELS[transition.to].short} ${THEORY_LEVELS[transition.to].bits.join("")}`,
                transition.channel,
                transition.to > transition.from ? `+${transition.to - transition.from}` : `−${transition.from - transition.to}`,
              )
            : caption}
        </p>
      }
    />
  );
});
