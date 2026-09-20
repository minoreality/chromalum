// Theory tab: dual-licensed. Implementation MIT; authored prose/labels and
// rendered diagrams (when reused as content) CC BY 4.0 (Doctor Chromaticus).
// See docs/LICENSE.md.
import React, { useCallback, useEffect, useState } from "react";
import { C, SP, FW, FONT } from "../styles/tokens";
import { S_PANEL_SUBTITLE } from "../styles/shared";
import { useTranslation } from "../i18n";
import { PinResetContext } from "./theory/pin-reset";
import { VennDiagram } from "./theory/VennDiagram";
import { BinaryTable } from "./theory/BinaryTable";
import { ColorDice } from "./theory/ColorDice";
import { FanoPlane } from "./theory/FanoPlane";
import { ColorCube } from "./theory/ColorCube";
import { ColorMixing } from "./theory/ColorMixing";
import { HammingDiagram } from "./theory/HammingDiagram";
import { PrimaryGeneration } from "./theory/PrimaryGeneration";
import { StellaOctangula } from "./theory/StellaOctangula";
import { HueTraversal } from "./theory/HueTraversal";
import { ChromaticOctahedron } from "./theory/ChromaticOctahedron";
import { ConnectionsSummary, ScopeSummary } from "./theory/ConnectionsSummary";
import { DerivationMap } from "./theory/DerivationMap";
import { ValuationDiagram } from "./theory/ValuationDiagram";

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

interface SectionProps {
  id: string;
  title: string;
  desc?: string | string[];
  children: React.ReactNode;
}

function splitParagraphs(desc: string): string[] {
  return desc.split(/\n\s*\n/).filter(Boolean);
}

function Paragraphs({ text }: { text: string | string[] | undefined }) {
  const paragraphs = text === undefined ? [] : (Array.isArray(text) ? text : [text]).flatMap(splitParagraphs);
  return paragraphs.map((paragraph, index) => (
    <p key={index} className="theory-desc">
      {paragraph}
    </p>
  ));
}

function Section({ id, title, desc, children }: SectionProps) {
  return (
    <section id={id} className="theory-chapter" aria-labelledby={`${id}-heading`} style={S_SECTION}>
      <h3 id={`${id}-heading`} className="theory-heading">
        {title}
      </h3>
      <Paragraphs text={desc} />
      {children}
    </section>
  );
}

function Subsection({ id, title, desc, children }: SectionProps) {
  return (
    <section id={id} className="theory-subsection" aria-labelledby={`${id}-heading`} style={S_SECTION}>
      <h4 id={`${id}-heading`} style={S_SUBHEADING}>
        {title}
      </h4>
      <Paragraphs text={desc} />
      {children}
    </section>
  );
}

function Figure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="theory-figure">
      <figcaption>{title}</figcaption>
      {children}
    </figure>
  );
}

export const TheoryPanel = React.memo(function TheoryPanel({ active = true }: { active?: boolean }) {
  const { t } = useTranslation();
  const [hlLevel, setHlLevel] = useState<number | null>(null);
  const onHover = useCallback((level: number | null) => setHlLevel(level), []);
  const [pinReset, setPinReset] = useState(0);

  const onBgClick = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("svg, button, select, label, details")) return;
    setHlLevel(null);
    setPinReset((count) => count + 1);
  }, []);

  // Esc clears every figure's pinned selection from any focus, the same
  // path as a background click. The panel stays mounted while hidden, so
  // listen only while its tab is active.
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
      setHlLevel(null);
      setPinReset((count) => count + 1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active]);

  return (
    <PinResetContext.Provider value={pinReset}>
      <div className="theory-reset-surface" onClick={onBgClick}>
        <div className="theory-container">
          <div style={S_PANEL_SUBTITLE}>{t("label_theory")}</div>

          <div style={{ width: "100%", textAlign: "center" }}>
            <h2 className="theory-title">{t("theory_title")}</h2>
            {splitParagraphs(t("theory_intro")).map((paragraph, index) => (
              <p key={index} className="theory-desc theory-intro" style={{ marginTop: index === 0 ? SP.xl : SP.md }}>
                {paragraph}
              </p>
            ))}
          </div>

          <p className="theory-hint">{t("theory_pin_hint")}</p>

          {/* Chapter 1 — the named Boolean algebra and primary generation */}
          <Section id="theory-algebra" title={t("theory_generation_title")} desc={t("theory_algebra_definition")}>
            <Subsection
              id="theory-state-generation"
              title={t("theory_state_generation_title")}
              desc={[t("theory_venn_desc"), t("theory_generation_desc")]}
            >
              <PrimaryGeneration
                mode="generation"
                hlLevel={hlLevel}
                onHover={onHover}
                diagram={({ selectedLevel, onSelect }) => (
                  <Figure title={t("theory_venn_title")}>
                    <VennDiagram hlLevel={hlLevel} onHover={onHover} selectedLevel={selectedLevel} onSelect={onSelect} />
                  </Figure>
                )}
              />
            </Subsection>
            <Subsection
              id="theory-boolean-operations"
              title={t("theory_boolean_operations_title")}
              desc={[t("theory_algebra_structures"), t("theory_mixing_desc")]}
            >
              <Figure title={t("theory_mixing_title")}>
                <ColorMixing />
              </Figure>
              <Paragraphs text={t("theory_mixing_operations_desc")} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 2 — independent mathematical and color-order paths */}
          <Section id="theory-rank" title={t("theory_empirical_title")}>
            <Subsection id="theory-rank-derivation" title={t("theory_rank_characterization_title")} desc={t("theory_empirical_desc")}>
              <DerivationMap />
            </Subsection>
            <Subsection id="theory-rank-operations" title={t("theory_rank_operations_title")} desc={t("theory_binary_desc")}>
              <Figure title={t("theory_binary_title")}>
                <BinaryTable hlLevel={hlLevel} onHover={onHover} />
              </Figure>
              <ValuationDiagram />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 3 — toggle action, cube, and the distance partition on the same vertices */}
          <Section id="theory-cube-cycle" title={t("theory_action_title")} desc={t("theory_action_desc")}>
            <Paragraphs text={t("theory_action_distance_desc")} />
            <Subsection
              id="theory-cube"
              title={t("theory_cube_cycle_title")}
              desc={[t("theory_cube_desc"), t("theory_cube_faces_desc"), t("theory_cube_desc2"), t("theory_gray_desc")]}
            >
              <ColorCube hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection
              id="theory-k8"
              title={t("theory_k8_title")}
              desc={[t("theory_k8_desc"), t("theory_stella_desc"), t("theory_stella_toggle_desc")]}
            >
              <StellaOctangula hlLevel={hlLevel} onHover={onHover} />
              <Paragraphs text={t("theory_stella_faces_desc")} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 4 — seven nonzero vectors, projective geometry, and coding */}
          <Section
            id="theory-fano-hamming"
            title={t("theory_structures_title")}
            desc={[t("theory_structures_desc"), t("theory_toggle_patterns_desc")]}
          >
            <Subsection id="theory-fano" title={t("theory_fano_title")} desc={[t("theory_fano_desc"), t("theory_fano_desc2")]}>
              <FanoPlane hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
            <Subsection
              id="theory-hamming"
              title={t("theory_hamming_title")}
              desc={[t("theory_hamming_bridge"), t("theory_hamming_desc"), t("theory_hamming_desc2"), t("theory_hamming_faces_desc")]}
            >
              <HammingDiagram hlLevel={hlLevel} onHover={onHover} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 5 — finite face arrangements and their polyhedral duality */}
          <Section id="theory-polyhedra" title={t("theory_geometry_title")} desc={t("theory_geometry_desc")}>
            <Subsection id="theory-color-die" title={t("theory_dice_section_title")} desc={t("theory_dice_net_desc")}>
              <figure className="theory-figure">
                <ColorDice hlLevel={hlLevel} onHover={onHover} />
              </figure>
              <Paragraphs text={[t("theory_dice_desc"), t("theory_dice_desc2")]} />
            </Subsection>
            <Subsection id="theory-octahedron" title={t("theory_octahedron_section_title")} desc={t("theory_chromatic_octa_desc")}>
              <Figure title={t("theory_chromatic_octa_title")}>
                <ChromaticOctahedron />
              </Figure>
              <p id="theory-octa-face-algebra" className="theory-desc">
                {t("theory_octa_fano_note")}
              </p>
              <Paragraphs text={[t("theory_octa_duality_note"), t("theory_octa_geometry_note")]} />
            </Subsection>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 6 — extend the already-defined chromatic cycle continuously */}
          <Section
            id="theory-geometry"
            title={t("theory_hue_extension_title")}
            desc={[t("theory_hue_extension_desc"), t("theory_zigzag_desc")]}
          >
            <Figure title={t("theory_zigzag_title")}>
              <HueTraversal hlLevel={hlLevel} onHover={onHover} />
            </Figure>
          </Section>

          <hr style={S_DIVIDER} />

          {/* Chapter 7 — conclusion and the boundaries of the constructions */}
          <Section id="theory-scope" title={t("theory_connections_title")} desc={t("theory_connections_desc")}>
            <ConnectionsSummary />
            <ScopeSummary />
          </Section>
        </div>
      </div>
    </PinResetContext.Provider>
  );
});
