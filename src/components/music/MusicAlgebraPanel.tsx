import React from "react";
import { useTranslation } from "../../i18n";
import { C, FS, FONT, SP } from "../../styles/tokens";
import { S_BTN_SM, S_BTN_SM_ACTIVE } from "../../styles/shared";
import type { MusicEngineReturn } from "../../hooks/useMusicEngine";
import { AndTriads } from "./AndTriads";
import { CayleyGrid } from "./CayleyGrid";
import { ComplementPairsCard } from "./ComplementPairsCard";
import { DistributiveFlow } from "./DistributiveFlow";
import { ErrorCorrectionCard } from "./ErrorCorrectionCard";
import { GL32Arrows } from "./GL32Arrows";
import { GrayCube } from "./GrayCube";
import { K8Explorer } from "./K8Explorer";
import { OctahedronMix } from "./OctahedronMix";
import { ParityChordCard } from "./ParityChordCard";
import { TetraSplitCard } from "./TetraSplitCard";
import { WeightHistogram } from "./WeightHistogram";
import { ZigzagCard } from "./ZigzagCard";
import type { ActiveMusicLevel, DecoderPhase } from "./types";
import {
  S_CARD_ALGEBRA,
  S_CARD_CODE,
  S_CARD_CUBE,
  S_CARD_LUMA,
  S_CARD_POLY,
  S_CARD_SYM,
  S_LABEL,
  S_ROW,
  S_SELECT,
  S_SECTION,
} from "./music-panel-styles";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type WeightStep = { positions: number[]; weight: number; index: number } | null;
type AndStep = { pairIndex: number; phase: "operands" | "result" } | null;
type DistPhase = "bxc" | "left" | "ab" | "ac" | "right" | "equal" | null;
type OctaPhase = "pair" | "result" | null;

interface MusicAlgebraPanelProps {
  engine: MusicEngineReturn;
  activeLevels: ActiveMusicLevel[];
  stopSignal: number;
  resetSignal: number;
  cayleyRow: number;
  onCayleyRowChange: StateSetter<number>;
  cayleyCol: number;
  onCayleyColChange: StateSetter<number>;
  distA: number;
  onDistAChange: StateSetter<number>;
  distB: number;
  onDistBChange: StateSetter<number>;
  distC: number;
  onDistCChange: StateSetter<number>;
  distPhase: DistPhase;
  onDistPhaseChange: StateSetter<DistPhase>;
  andStep: AndStep;
  onAndStepChange: StateSetter<AndStep>;
  errorPos: number;
  errorPhase: DecoderPhase;
  onErrorPosChange: StateSetter<number>;
  onErrorPhaseChange: StateSetter<DecoderPhase>;
  hammingMode: "743" | "844";
  onHammingModeChange: StateSetter<"743" | "844">;
  weightPlaying: boolean;
  onWeightPlayingChange: StateSetter<boolean>;
  weightStep: WeightStep;
  onWeightStepChange: StateSetter<WeightStep>;
  onHoveredFanoLineChange: StateSetter<number | null>;
  octaA: number;
  onOctaAChange: StateSetter<number>;
  octaB: number;
  onOctaBChange: StateSetter<number>;
  octaPhase: OctaPhase;
  onOctaPhaseChange: StateSetter<OctaPhase>;
  gray3Playing: boolean;
  onGray3PlayingChange: StateSetter<boolean>;
  gray3Code: number | null;
  onGray3CodeChange: StateSetter<number | null>;
  k8Layer: 1 | 2 | 3 | null;
  onK8LayerChange: StateSetter<1 | 2 | 3 | null>;
  tetraPhase: "t0" | "t1" | null;
  onTetraPhaseChange: StateSetter<"t0" | "t1" | null>;
  gl32Perm: number[];
  onGl32PermChange: StateSetter<number[]>;
  gl32Flash: boolean;
  onGl32FlashChange: StateSetter<boolean>;
}

const GF8_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];
const CHROMA_LEVELS = [1, 2, 3, 4, 5, 6];

export const MusicAlgebraPanel = React.memo(function MusicAlgebraPanel({
  engine,
  activeLevels,
  stopSignal,
  resetSignal,
  cayleyRow,
  onCayleyRowChange,
  cayleyCol,
  onCayleyColChange,
  distA,
  onDistAChange,
  distB,
  onDistBChange,
  distC,
  onDistCChange,
  distPhase,
  onDistPhaseChange,
  andStep,
  onAndStepChange,
  errorPos,
  errorPhase,
  onErrorPosChange,
  onErrorPhaseChange,
  hammingMode,
  onHammingModeChange,
  weightPlaying,
  onWeightPlayingChange,
  weightStep,
  onWeightStepChange,
  onHoveredFanoLineChange,
  octaA,
  onOctaAChange,
  octaB,
  onOctaBChange,
  octaPhase,
  onOctaPhaseChange,
  gray3Playing,
  onGray3PlayingChange,
  gray3Code,
  onGray3CodeChange,
  k8Layer,
  onK8LayerChange,
  tetraPhase,
  onTetraPhaseChange,
  gl32Perm,
  onGl32PermChange,
  gl32Flash,
  onGl32FlashChange,
}: MusicAlgebraPanelProps) {
  const { t } = useTranslation();
  const octaResult = octaA ^ octaB;
  const octaPlayable = octaA !== octaB && octaResult >= 1 && octaResult <= 6;

  const handleHammingModeChange = (mode: "743" | "844") => {
    if (weightPlaying) {
      engine.stopAlgebra?.();
      onWeightPlayingChange(false);
      onWeightStepChange(null);
    }
    onHammingModeChange(mode);
  };

  const handleWeightToggle = () => {
    if (weightPlaying) {
      engine.stopAlgebra?.();
      onWeightPlayingChange(false);
      onWeightStepChange(null);
      onHoveredFanoLineChange(null);
      return;
    }

    engine.initAudio();
    const playFn = hammingMode === "743" ? engine.playWeightSpectrum : engine.playExtendedHamming;
    playFn?.((positions: number[], weight: number, index: number) => {
      onWeightStepChange({ positions, weight, index });
      const isFanoLine = (hammingMode === "743" && weight === 3) || (hammingMode === "844" && index >= 1 && index <= 7);
      onHoveredFanoLineChange(isFanoLine && index >= 1 && index <= 7 ? index - 1 : null);
      if (positions.length === 0 && weight === -1) {
        onWeightPlayingChange(false);
        onWeightStepChange(null);
        onHoveredFanoLineChange(null);
      }
    });
    onWeightPlayingChange(true);
  };

  const handleGL32Transform = (generator: "A" | "B" | "C") => {
    engine.initAudio();
    engine.applyGL32Transform?.(generator, (perm) => {
      onGl32PermChange(perm);
      onGl32FlashChange(true);
      setTimeout(() => onGl32FlashChange(false), 500);
    });
  };

  return (
    <div className="music-algebra-wrapper" style={{ display: "flex", flexDirection: "column", gap: SP.md, width: "100%" }}>
      <div style={{ ...S_SECTION, marginTop: SP.sm }} role="heading" aria-level={3}>
        {t("music_section_algebra")}
      </div>
      <div id="music-algebra-panel" role="region" aria-label={t("music_section_algebra")} className="music-algebra-scroll">
        <div style={S_CARD_ALGEBRA}>
          <div style={S_ROW}>
            <span style={S_LABEL}>{t("music_cayley_title")}</span>
            <select
              value={cayleyRow}
              onChange={(e) => onCayleyRowChange(Number(e.target.value))}
              aria-label={t("music_cayley_row_select")}
              style={S_SELECT}
            >
              {GF8_LEVELS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={cayleyCol >= 0 ? S_BTN_SM_ACTIVE : S_BTN_SM}
              onClick={() => {
                if (cayleyCol >= 0) {
                  engine.stopAlgebra?.();
                  onCayleyColChange(-1);
                } else {
                  engine.initAudio();
                  engine.playCayleyRow?.(cayleyRow, (col, _val) => onCayleyColChange(col));
                }
              }}
            >
              {cayleyCol >= 0 ? t("music_cayley_stop") : t("music_cayley_play")}
            </button>
          </div>
          <CayleyGrid row={cayleyRow} activeCol={cayleyCol} activeLevels={activeLevels} />
        </div>

        <div style={S_CARD_ALGEBRA}>
          <div style={S_ROW}>
            <span style={S_LABEL}>{t("music_distrib_title")}</span>
            <select
              value={distA}
              onChange={(e) => onDistAChange(Number(e.target.value))}
              aria-label={t("music_distrib_a_select")}
              style={S_SELECT}
            >
              {GF8_LEVELS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <select
              value={distB}
              onChange={(e) => onDistBChange(Number(e.target.value))}
              aria-label={t("music_distrib_b_select")}
              style={S_SELECT}
            >
              {GF8_LEVELS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <select
              value={distC}
              onChange={(e) => onDistCChange(Number(e.target.value))}
              aria-label={t("music_distrib_c_select")}
              style={S_SELECT}
            >
              {GF8_LEVELS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={distPhase !== null ? S_BTN_SM_ACTIVE : S_BTN_SM}
              onClick={() => {
                engine.initAudio();
                engine.playDistributiveLaw?.(distA, distB, distC, (phase) => {
                  onDistPhaseChange(phase);
                });
              }}
            >
              {t("music_distrib_play")}
            </button>
          </div>
          <DistributiveFlow a={distA} b={distB} c={distC} phase={distPhase} activeLevels={activeLevels} />
          {(() => {
            const bxc = distB ^ distC;
            const left = distA & bxc;
            const ab = distA & distB;
            const ac = distA & distC;
            const right = ab ^ ac;
            const ok = left === right;
            return (
              <div style={{ fontSize: FS.xs, fontFamily: FONT.mono, color: C.textDim, textAlign: "center", lineHeight: 1.5 }}>
                <div>{`${distA} \u2227 (${distB}\u2295${distC}) = ${distA}\u2227${bxc} = ${left}`}</div>
                <div>
                  {`(${distA}\u2227${distB}) \u2295 (${distA}\u2227${distC}) = ${ab}\u2295${ac} = ${right}`}
                  <span style={{ color: ok ? C.accent : C.error, marginLeft: 4 }}>{ok ? "\u2713" : "\u2717"}</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div style={S_CARD_ALGEBRA}>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" }}>
            <span style={S_LABEL}>{t("music_and_title")}</span>
            <button
              type="button"
              style={andStep !== null ? S_BTN_SM_ACTIVE : S_BTN_SM}
              onClick={() => {
                if (andStep !== null) {
                  engine.stopAlgebra?.();
                  onAndStepChange(null);
                } else {
                  engine.initAudio();
                  onAndStepChange(null);
                  engine.playAndTriads?.((step) => onAndStepChange(step));
                }
              }}
            >
              {t("music_and_play")}
            </button>
          </div>
          <AndTriads activeStep={andStep} activeLevels={activeLevels} />
        </div>

        <div style={S_CARD_CODE}>
          <ParityChordCard
            engine={engine}
            activeLevels={activeLevels}
            stopSignal={stopSignal}
            errorPos={errorPos}
            errorPhase={errorPhase}
          />
        </div>

        <div style={S_CARD_CODE}>
          <ErrorCorrectionCard
            engine={engine}
            activeLevels={activeLevels}
            stopSignal={stopSignal}
            errorPos={errorPos}
            errorPhase={errorPhase}
            onErrorPosChange={onErrorPosChange}
            onErrorPhaseChange={onErrorPhaseChange}
          />
        </div>

        <div style={S_CARD_CODE}>
          <span style={S_LABEL}>{t("music_weight_title")}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" }}>
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center" }}>
              <button
                type="button"
                style={hammingMode === "743" ? S_BTN_SM_ACTIVE : S_BTN_SM}
                onClick={() => handleHammingModeChange("743")}
              >
                [7,4,3]
              </button>
              <button
                type="button"
                style={hammingMode === "844" ? S_BTN_SM_ACTIVE : S_BTN_SM}
                onClick={() => handleHammingModeChange("844")}
              >
                [8,4,4]
              </button>
            </div>
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center" }}>
              <button type="button" style={weightPlaying ? S_BTN_SM_ACTIVE : S_BTN_SM} onClick={handleWeightToggle}>
                {weightPlaying ? t("music_weight_stop") : t("music_weight_play")}
              </button>
              {weightStep && weightStep.weight >= 0 && (
                <span style={{ fontSize: FS.md, color: C.accent, fontFamily: FONT.mono }}>
                  {`w=${weightStep.weight} \u00b7 {${weightStep.positions.join(",")}}`}
                </span>
              )}
            </div>
          </div>
          <WeightHistogram
            mode={hammingMode}
            currentWeight={weightStep?.weight ?? -1}
            currentIndex={weightStep?.index ?? -1}
            activeLevels={activeLevels}
          />
        </div>

        <div style={S_CARD_POLY}>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" }}>
            <span style={S_LABEL}>{t("music_octa_title")}</span>
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <select
                value={octaA}
                onChange={(e) => onOctaAChange(Number(e.target.value))}
                aria-label={t("music_octa_first_select")}
                style={S_SELECT}
              >
                {CHROMA_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
              <select
                value={octaB}
                onChange={(e) => onOctaBChange(Number(e.target.value))}
                aria-label={t("music_octa_second_select")}
                style={S_SELECT}
              >
                {CHROMA_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={octaPhase !== null ? S_BTN_SM_ACTIVE : S_BTN_SM}
                onClick={() => {
                  if (octaPhase !== null) {
                    engine.stopAlgebra?.();
                    onOctaPhaseChange(null);
                  } else {
                    engine.initAudio();
                    onOctaPhaseChange(null);
                    engine.playOctahedronMix?.(octaA, octaB, (phase) => onOctaPhaseChange(phase));
                  }
                }}
                disabled={!octaPlayable}
              >
                {t("music_octa_play")}
              </button>
            </div>
          </div>
          <OctahedronMix lvA={octaA} lvB={octaB} phase={octaPhase} activeLevels={activeLevels} />
        </div>

        <div style={S_CARD_CUBE}>
          <div style={{ display: "flex", gap: SP.sm, alignItems: "center", justifyContent: "center" }}>
            <span style={S_LABEL}>{t("music_gray3v_title")}</span>
            <button
              type="button"
              style={{ ...(gray3Playing ? S_BTN_SM_ACTIVE : S_BTN_SM) }}
              onClick={() => {
                if (gray3Playing) {
                  engine.stopAlgebra?.();
                  onGray3PlayingChange(false);
                  onGray3CodeChange(null);
                } else {
                  engine.initAudio();
                  engine.playGray3Voice?.((lv: number | null) => {
                    onGray3CodeChange(lv);
                  });
                  onGray3PlayingChange(true);
                }
              }}
            >
              {gray3Playing ? t("music_gray3v_stop") : t("music_gray3v_play")}
            </button>
          </div>
          <GrayCube currentCode={gray3Code} activeLevels={activeLevels} />
        </div>

        <div style={S_CARD_CUBE}>
          <K8Explorer
            engine={engine}
            activeLevels={activeLevels}
            stopSignal={stopSignal}
            resetSignal={resetSignal}
            tetraPhase={tetraPhase}
            onLayerChange={onK8LayerChange}
          />
        </div>

        <div style={S_CARD_CUBE}>
          <TetraSplitCard
            engine={engine}
            activeLevels={activeLevels}
            stopSignal={stopSignal}
            highlighted={k8Layer === 2}
            onPhaseChange={onTetraPhaseChange}
          />
        </div>

        <div style={S_CARD_LUMA}>
          <ComplementPairsCard engine={engine} stopSignal={stopSignal} />
        </div>

        <div style={S_CARD_LUMA}>
          <ZigzagCard engine={engine} stopSignal={stopSignal} />
        </div>

        <div style={S_CARD_SYM}>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" }}>
            <span style={S_LABEL}>{t("music_gl32_title")}</span>
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center" }}>
              <button type="button" style={{ ...S_BTN_SM }} onClick={() => handleGL32Transform("A")}>
                {t("music_gl32_a")}
              </button>
              <button type="button" style={{ ...S_BTN_SM }} onClick={() => handleGL32Transform("B")}>
                {t("music_gl32_b")}
              </button>
              <button type="button" style={{ ...S_BTN_SM }} onClick={() => handleGL32Transform("C")}>
                {t("music_gl32_c")}
              </button>
            </div>
          </div>
          <GL32Arrows perm={gl32Perm} activeLevels={activeLevels} flash={gl32Flash} />
          <div style={{ fontSize: FS.sm, color: C.textDim, textAlign: "center" }}>{t("music_gl32_note")}</div>
        </div>
      </div>
    </div>
  );
});
