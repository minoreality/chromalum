import React from "react";
import { useTranslation } from "../../i18n";
import { C, FONT, FS, FW, R, SP } from "../../styles/tokens";

const S_CARD: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: R.lg,
  background: C.bgSurface,
  padding: `${SP.md}px ${SP.lg}px`,
  boxSizing: "border-box",
  textAlign: "center",
  minWidth: 0,
};

const S_FORMULA: React.CSSProperties = {
  display: "block",
  marginTop: SP.xs,
  color: C.textPrimary,
  fontFamily: FONT.mono,
  fontSize: FS.sm,
  lineHeight: 1.6,
  overflowWrap: "anywhere",
};

interface DerivationCardProps {
  title: string;
  formula: string;
  body?: string;
  accent?: boolean;
}

function DerivationCard({ title, formula, body, accent = false }: DerivationCardProps) {
  return (
    <div style={{ ...S_CARD, borderColor: accent ? C.accent : C.border }}>
      <div style={{ color: accent ? C.accentBright : C.textMuted, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
        {title}
      </div>
      <code style={S_FORMULA}>{formula}</code>
      {body && <div style={{ marginTop: SP.xs, color: C.textDimmer, fontSize: FS.xs, lineHeight: 1.55 }}>{body}</div>}
    </div>
  );
}

const Arrow = () => (
  <div aria-hidden="true" style={{ color: C.textSubtle, fontFamily: FONT.mono, fontSize: FS.lg, lineHeight: 1 }}>
    ↓
  </div>
);

export const DerivationMap = React.memo(function DerivationMap() {
  const { t } = useTranslation();
  const outcomes = [
    ["theory_derivation_outcome_algebra", "Boolean · XOR · Q₃ · Fano · Hamming · K₈"],
    ["theory_derivation_outcome_palette", "16 candidates · 81 sections · 9 κ-sections"],
    ["theory_derivation_outcome_geometry", "15° grid · equitone geometry · complement center"],
    ["theory_derivation_outcome_music", "p=θ/π mod 2 · f(θ̃)=f₀·2^(θ̃/π) · π/12 ↔ semitone"],
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("theory_derivation_aria")}
      style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <DerivationCard
          title={t("theory_derivation_root")}
          formula="A = 𝒫({G,R,B}) ≅ GF(2)³"
          body={t("theory_derivation_root_note")}
          accent
        />
      </div>
      <Arrow />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <DerivationCard
          title={t("theory_derivation_cycle")}
          formula="A ∖ {K,W} = C₆   ·   Δ = G,R,B,G,R,B"
          body={t("theory_derivation_cycle_note")}
        />
      </div>
      <Arrow />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <DerivationCard
          title={t("theory_derivation_valuation")}
          formula="{1,2,4} ⇒ [G,R,B]=[4,2,1] ⇒ L=4G+2R+B"
          body={t("theory_derivation_valuation_note")}
          accent
        />
      </div>
      <Arrow />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <DerivationCard
          title={t("theory_derivation_completion")}
          formula="cᵢ(t)=(1−t)vᵢ+t·vᵢ₊₁   ·   ⋃[vᵢ,vᵢ₊₁]=H≅S¹"
          body={t("theory_derivation_completion_note")}
        />
      </div>
      <Arrow />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <DerivationCard
          title={t("theory_derivation_extension")}
          formula="λ=L|H   ·   ΔL=(+4,−2,+1,−4,+2,−1)   ·   Σ|ΔL|=14"
          body={t("theory_derivation_extension_note")}
        />
      </div>
      <Arrow />
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: SP.md }}>
        {outcomes.map(([key, formula]) => (
          <DerivationCard key={key} title={t(key)} formula={formula} />
        ))}
      </div>
    </div>
  );
});

export const ContinuousBridge = React.memo(function ContinuousBridge() {
  const { t } = useTranslation();
  const stages = [
    ["theory_continuous_vertices", "Y=R∨G=R⊕G ↦ eR+eG   ·   C=eG+eB   ·   M=eB+eR", "theory_continuous_vertices_note"],
    ["theory_continuous_edges", "R→Y: c(t)=(t,1,0), L=2+4t   ·   Y→G: c(t)=(1,1−t,0), L=6−2t", "theory_continuous_edges_note"],
    ["theory_continuous_circle", "θ(cᵢ(t))=(π/3)(i+t)   ·   H≅ℝ/2πℤ≅S¹   ·   κ:θ↦θ+π", "theory_continuous_circle_note"],
    ["theory_continuous_music", "p=θ/π mod 2   ·   f(θ̃)=f₀·2^(θ̃/π)   ·   π/12↔1 semitone", "theory_continuous_music_note"],
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("theory_continuous_title")}
      style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", alignItems: "stretch", gap: SP.md }}
    >
      {stages.map(([titleKey, formula, noteKey], index) => (
        <React.Fragment key={titleKey}>
          {index > 0 && <Arrow />}
          <DerivationCard title={t(titleKey)} formula={formula} body={t(noteKey)} accent={index === 2} />
        </React.Fragment>
      ))}
    </div>
  );
});

export const EmpiricalResonance = React.memo(function EmpiricalResonance() {
  const { t } = useTranslation();
  return (
    <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "stretch", gap: SP.md }}>
      <DerivationCard title={t("theory_empirical_condition")} formula="wG > wR + wB   ·   wR > wB > 0" />
      <DerivationCard title={t("theory_empirical_order")} formula="K < B < R < M < G < C < Y < W" accent />
      <p style={{ margin: 0, color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.sm, lineHeight: 1.65, textAlign: "center" }}>
        {t("theory_empirical_note")}
      </p>
    </div>
  );
});
