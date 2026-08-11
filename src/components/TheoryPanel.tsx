// Theory tab: dual-licensed. Implementation MIT; authored prose/labels and
// rendered diagrams (when reused as content) CC BY 4.0 (Doctor Chromaticus).
// See docs/LICENSE.md.
import React, { useCallback, useState } from "react";
import { C, SP, FS, FW, FONT } from "../styles/tokens";
import { S_PANEL_SUBTITLE } from "../styles/shared";
import { useTranslation } from "../i18n";
import { PinResetContext } from "./theory/pin-reset";
import { VennDiagram } from "./theory/VennDiagram";
import { BinaryTable } from "./theory/BinaryTable";
import { ColorDice, HueOrderNet } from "./theory/ColorDice";
import { FanoPlane } from "./theory/FanoPlane";
import { ColorCube } from "./theory/ColorCube";
import { GrayCodeHex } from "./theory/GrayCodeHex";
import { HammingDiagram } from "./theory/HammingDiagram";
import { PrimaryGeneration } from "./theory/PrimaryGeneration";
import { ToggleActionTable } from "./theory/ToggleActionTable";
import { TogglePatternBridge } from "./theory/TogglePatternBridge";
import { StellaOctangula } from "./theory/StellaOctangula";
import { ToneZigzag } from "./theory/ToneZigzag";
import { OctahedronDual } from "./theory/OctahedronDual";
import { ConnectionsSummary, ScopeSummary } from "./theory/ConnectionsSummary";
import { DerivationMap, EmpiricalResonance, ValuationSummary } from "./theory/DerivationMap";

const S_SECTION: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: SP.lg,
  width: "100%",
};

const S_SUBHEADING: React.CSSProperties = {
  fontSize: 14,
  fontWeight: FW.bold,
  fontFamily: FONT.mono,
  color: C.accent,
  textAlign: "center",
  margin: 0,
  marginTop: SP.md,
};

const S_DIVIDER: React.CSSProperties = {
  width: 60,
  height: 1,
  background: C.border,
  border: "none",
  margin: `${SP.xs}px 0`,
};

const S_DETAILS: React.CSSProperties = {
  width: "100%",
  maxWidth: 680,
  boxSizing: "border-box",
};

interface SectionProps {
  id: string;
  title: string;
  desc: string | string[];
  children: React.ReactNode;
}

function splitParagraphs(desc: string): string[] {
  return desc.split(/\n\s*\n/).filter(Boolean);
}

function Section({ id, title, desc, children }: SectionProps) {
  const descs = Array.isArray(desc) ? desc : splitParagraphs(desc);
  return (
    <section id={id} style={S_SECTION}>
      <h3 className="theory-heading">{title}</h3>
      {descs.map((paragraph, index) => (
        <p key={index} className="theory-desc">
          {paragraph}
        </p>
      ))}
      {children}
    </section>
  );
}

function Subsection({ title, desc, children }: { title: string; desc?: string | string[]; children: React.ReactNode }) {
  const paragraphs = desc === undefined ? [] : Array.isArray(desc) ? desc : splitParagraphs(desc);
  return (
    <>
      <h4 style={S_SUBHEADING}>{title}</h4>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="theory-desc">
          {paragraph}
        </p>
      ))}
      {children}
    </>
  );
}

export const TheoryPanel = React.memo(function TheoryPanel() {
  const { t } = useTranslation();
  const [hlLevel, setHlLevel] = useState<number | null>(null);
  const onHover = useCallback((level: number | null) => setHlLevel(level), []);
  const [pinReset, setPinReset] = useState(0);

  const onBgClick = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("svg, button")) return;
    setHlLevel(null);
    setPinReset((count) => count + 1);
  }, []);

  return (
    <PinResetContext.Provider value={pinReset}>
      <div className="theory-reset-surface" onClick={onBgClick}>
        <div className="theory-container">
          <div style={S_PANEL_SUBTITLE}>{t("label_theory")}</div>

          <div style={{ textAlign: "center" }}>
            <h2 className="theory-title">{t("theory_title")}</h2>
            {splitParagraphs(t("theory_intro")).map((paragraph, index) => (
              <p key={index} className="theory-desc theory-intro" style={{ marginTop: index === 0 ? SP.xl : SP.md }}>
                {paragraph}
              </p>
            ))}
          </div>

          <p className="theory-hint">{t("theory_pin_hint")}</p>

          {/* Chapter 1 — the named Boolean algebra and primary generation */}
          <Section id="theory-algebra" title={t("theory_generation_title")} desc={t("theory_generation_desc")}>
            <Subsection title={t("theory_venn_title")} desc={t("theory_venn_desc")}>
              <VennDiagram hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <PrimaryGeneration mode="generation" hlLevel={hlLevel} onHover={onHover} />
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 2 — independent mathematical and color-order paths */}
          <Section id="theory-rank" title={t("theory_empirical_title")} desc={t("theory_empirical_desc")}>
            <DerivationMap />
            <EmpiricalResonance />
            <Subsection title={t("theory_binary_title")} desc={t("theory_binary_desc")}>
              <BinaryTable hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 3 — valuation and complement */}
          <Section id="theory-valuation" title={t("theory_valuation_title")} desc={t("theory_valuation_desc")}>
            <ValuationSummary />
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 4 — toggle action, Hamming cube, and chromatic six-cycle */}
          <Section id="theory-cube-cycle" title={t("theory_action_title")} desc={t("theory_action_desc")}>
            <PrimaryGeneration mode="toggle" hlLevel={hlLevel} onHover={onHover} />
            <Subsection title={t("theory_cube_title")} desc={[t("theory_cube_desc"), t("theory_cube_desc2"), t("theory_cube_mix_desc")]}>
              <ColorCube hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection title={t("theory_gray_title")} desc={t("theory_gray_desc")}>
              <GrayCodeHex hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 5 — seven nonzero vectors, projective geometry, and coding */}
          <Section id="theory-fano-hamming" title={t("theory_structures_title")} desc={t("theory_structures_desc")}>
            <Subsection title={t("theory_toggle_patterns_title")} desc={t("theory_toggle_patterns_desc")}>
              <TogglePatternBridge hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection title={t("theory_fano_title")} desc={[t("theory_fano_desc"), t("theory_fano_desc2")]}>
              <FanoPlane hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection
              title={t("theory_hamming_title")}
              desc={[t("theory_hamming_bridge"), t("theory_hamming_desc"), t("theory_hamming_desc2")]}
            >
              <HammingDiagram hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 6 — K8 partitioned by Hamming distance */}
          <Section id="theory-k8" title={t("theory_k8_title")} desc={t("theory_k8_desc")}>
            <Subsection title={t("theory_stella_title")} desc={t("theory_stella_desc")}>
              <StellaOctangula hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 7 — geometric readings of already-defined relations */}
          <Section id="theory-geometry" title={t("theory_geometry_title")} desc={t("theory_geometry_desc")}>
            <Subsection title={t("theory_zigzag_title")} desc={t("theory_zigzag_desc")}>
              <ToneZigzag hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection title={t("theory_dice_net_title")} desc={t("theory_dice_net_desc")}>
              <HueOrderNet hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection title={t("theory_dice_title")} desc={[t("theory_dice_desc"), t("theory_dice_desc2"), t("theory_dice_views_desc")]}>
              <ColorDice hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection title={t("theory_octa_dual_title")} desc={t("theory_octa_dual_desc")}>
              <OctahedronDual hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 8 — synthesis, exact scope, and an advanced reference table */}
          <Section id="theory-scope" title={t("theory_connections_title")} desc={t("theory_connections_desc")}>
            <ConnectionsSummary />
            <Subsection title={t("theory_conn_boundary_title")}>
              <ScopeSummary />
            </Subsection>
            <details style={S_DETAILS}>
              <summary
                style={{
                  cursor: "pointer",
                  color: C.accentBright,
                  fontFamily: FONT.mono,
                  fontSize: FS.sm,
                  fontWeight: FW.bold,
                }}
              >
                {t("theory_toggle_table_title")}
              </summary>
              <p className="theory-desc">{t("theory_toggle_table_desc")}</p>
              <ToggleActionTable hlLevel={hlLevel} onHover={onHover} />
            </details>
          </Section>
        </div>
      </div>
    </PinResetContext.Provider>
  );
});
