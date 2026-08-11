import React from "react";
import { LEVEL_CANDIDATES } from "../../color-engine";
import { useTranslation } from "../../i18n";
import { resolveMusicCandidateIndices, withMusicComplementCandidate } from "../../music/music-candidate-pairs";
import { C, R, SHADOW, SP } from "../../styles/tokens";
import type { MusicCandidateHover, MusicLevelPreview } from "../../music/types";

interface MusicLevelCandidateGridProps {
  levelPreview: MusicLevelPreview[];
  hueAngleDeg: number;
  candidateOverridesByLevel: Map<number, number>;
  selectedLevels: Set<number>;
  burstHighlight: Set<number>;
  hoveredCandidate: MusicCandidateHover;
  onCandidateOverridesByLevelChange: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  onSelectedLevelsChange: React.Dispatch<React.SetStateAction<Set<number>>>;
  onHoveredCandidateChange: (candidate: MusicCandidateHover) => void;
  onBlockClick: (levelIndex: number, hueAngleDeg: number) => void;
}

interface MusicLevelCandidateColumnProps extends Omit<MusicLevelCandidateGridProps, "levelPreview"> {
  level: MusicLevelPreview;
}

function candidateHex(rgb: readonly number[]) {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const MusicLevelCandidateColumn = React.memo(function MusicLevelCandidateColumn({
  level,
  hueAngleDeg,
  candidateOverridesByLevel,
  selectedLevels,
  burstHighlight,
  hoveredCandidate,
  onCandidateOverridesByLevelChange,
  onSelectedLevelsChange,
  onHoveredCandidateChange,
  onBlockClick,
}: MusicLevelCandidateColumnProps) {
  const { t } = useTranslation();
  const cands = LEVEL_CANDIDATES[level.levelIndex];
  const hasCands = cands.length > 1;
  const isDirect = candidateOverridesByLevel.has(level.levelIndex);
  const currentCandidateIndex = resolveMusicCandidateIndices(candidateOverridesByLevel, hueAngleDeg).get(level.levelIndex) ?? 0;
  const previousCandidateIndex = hasCands ? (currentCandidateIndex - 1 + cands.length) % cands.length : -1;
  const nextCandidateIndex = hasCands ? (currentCandidateIndex + 1) % cands.length : -1;
  const selectCandidate = (candidateIndex: number, clearSelected: boolean) => {
    onCandidateOverridesByLevelChange((prev) => {
      return withMusicComplementCandidate(prev, level.levelIndex, candidateIndex);
    });
    if (clearSelected) {
      onSelectedLevelsChange((prev) => {
        const next = new Set(prev);
        next.delete(level.levelIndex);
        return next;
      });
    }
    onHoveredCandidateChange(null);
  };

  const makeSwatch = (candidateIndex: number, size: number) => {
    const cand = cands[candidateIndex];
    const candHex = candidateHex(cand.rgb);
    const isSwatchHovered =
      hoveredCandidate !== null && hoveredCandidate.levelIndex === level.levelIndex && hoveredCandidate.candidateIndex === candidateIndex;
    const swatchClick = () => {
      selectCandidate(candidateIndex, true);
      onBlockClick(level.levelIndex, cand.hueAngleDeg);
    };
    return (
      <button
        key={candidateIndex}
        type="button"
        aria-label={t("aria_color_candidate", level.levelIndex, candHex, `${Math.round(cand.hueAngleDeg)}°`)}
        onClick={swatchClick}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onHoveredCandidateChange({ levelIndex: level.levelIndex, candidateIndex });
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") onHoveredCandidateChange(null);
        }}
        title={`${candHex} ${Math.round(cand.hueAngleDeg)}\u00B0`}
        style={{
          width: size,
          height: size,
          padding: 0,
          appearance: "none",
          display: "block",
          flexShrink: 0,
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

  const mainCandidateIndex = currentCandidateIndex;
  const mainCand = cands[mainCandidateIndex];
  const mainHex = mainCand ? candidateHex(mainCand.rgb) : "";
  const isMainHovered =
    hoveredCandidate !== null && hoveredCandidate.levelIndex === level.levelIndex && hoveredCandidate.candidateIndex === mainCandidateIndex;
  const isSelected = selectedLevels.has(level.levelIndex);
  const isBurst = burstHighlight.has(level.levelIndex);

  const mainClick = () => {
    if (!mainCand) return;
    onSelectedLevelsChange((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(level.levelIndex);
      else next.add(level.levelIndex);
      return next;
    });
    onBlockClick(level.levelIndex, mainCand.hueAngleDeg);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      {hasCands ? makeSwatch(previousCandidateIndex, 23) : <div style={{ height: 23 }} />}
      <button
        type="button"
        aria-label={mainCand ? t("aria_color_candidate", level.levelIndex, mainHex, `${Math.round(mainCand.hueAngleDeg)}°`) : undefined}
        aria-pressed={isSelected}
        onClick={mainClick}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            onHoveredCandidateChange({ levelIndex: level.levelIndex, candidateIndex: mainCandidateIndex });
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") onHoveredCandidateChange(null);
        }}
        title={mainCand ? `${mainHex} ${Math.round(mainCand.hueAngleDeg)}\u00B0` : undefined}
        style={{
          width: 30,
          height: 30,
          padding: 0,
          appearance: "none",
          display: "block",
          flexShrink: 0,
          borderRadius: R.md,
          background: isDirect ? `rgb(${cands[currentCandidateIndex]?.rgb.join(",")})` : level.hex,
          border: `2px solid ${isBurst ? "#ffffff" : isMainHovered || isSelected ? C.accent : C.border}`,
          boxSizing: "border-box" as const,
          cursor: "pointer",
          boxShadow: isBurst ? SHADOW.glow("#ffffff") : isMainHovered ? SHADOW.glow(C.accent) : "none",
          transition: isBurst ? "none" : "background 0.4s, box-shadow 0.5s, border-color 0.5s",
        }}
      />
      {hasCands ? makeSwatch(nextCandidateIndex, 23) : <div style={{ height: 23 }} />}
    </div>
  );
});

export const MusicLevelCandidateGrid = React.memo(function MusicLevelCandidateGrid({
  levelPreview,
  ...columnProps
}: MusicLevelCandidateGridProps) {
  return (
    <div
      className="music-candidate-grid"
      style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "center", marginTop: SP.lg }}
    >
      {levelPreview.map((level) => (
        <MusicLevelCandidateColumn key={level.levelIndex} {...columnProps} level={level} />
      ))}
    </div>
  );
});
