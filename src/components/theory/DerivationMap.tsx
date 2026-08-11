import React from "react";
import { useTranslation } from "../../i18n";
import { C, FONT, FS, FW, R, SP } from "../../styles/tokens";

const S_FORMULA: React.CSSProperties = {
  display: "block",
  color: C.textPrimary,
  fontFamily: FONT.mono,
  fontSize: FS.sm,
  lineHeight: 1.65,
  overflowWrap: "anywhere",
};

const S_NOTE: React.CSSProperties = {
  margin: 0,
  color: C.textDimmer,
  fontSize: FS.sm,
  lineHeight: 1.65,
};

const S_THEOREM: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  border: `1px solid ${C.border}`,
  borderRadius: R.xl,
  background: C.bgSurface,
  padding: SP.xl,
  boxSizing: "border-box",
};

function DerivationStep({ number, title, formula, body }: { number: string; title: string; formula: string; body: string }) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr)",
        gap: SP.md,
        alignItems: "start",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${C.accent}`,
          borderRadius: "50%",
          color: C.accentBright,
          fontFamily: FONT.mono,
          fontSize: FS.xs,
          fontWeight: FW.bold,
        }}
      >
        {number}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>{title}</div>
        <code style={{ ...S_FORMULA, marginTop: SP.xs }}>{formula}</code>
        <p style={{ ...S_NOTE, marginTop: SP.xs }}>{body}</p>
      </div>
    </li>
  );
}

export const DerivationMap = React.memo(function DerivationMap() {
  const { t } = useTranslation();

  return (
    <ol
      aria-label={t("theory_derivation_aria")}
      style={{
        width: "100%",
        maxWidth: 640,
        display: "flex",
        flexDirection: "column",
        gap: SP.xl,
        margin: 0,
        padding: 0,
        listStyle: "none",
      }}
    >
      <DerivationStep
        number="1"
        title={t("theory_derivation_root")}
        formula="A=𝒫(E), E={G,R,B}   ·   Γ(S)=∨_{c∈S}e_c   ·   (A,⊕)≅(𝔽₂³,+)"
        body={t("theory_derivation_root_note")}
      />
      <DerivationStep
        number="2"
        title={t("theory_derivation_two_paths")}
        formula="{1,2,4} (unnamed)   ∥   s(G)>s(M)=s(R)+s(B), s(R)>s(B)"
        body={t("theory_derivation_two_paths_note")}
      />
      <DerivationStep
        number="3"
        title={t("theory_derivation_convergence")}
        formula="L(g,r,b)=4g+2r+b   ·   T=L/7"
        body={t("theory_derivation_convergence_note")}
      />
      <DerivationStep
        number="4"
        title={t("theory_derivation_consequences")}
        formula="valuation · complement · Q₃/C₆ · Fano/Hamming · K₈"
        body={t("theory_derivation_consequences_note")}
      />
    </ol>
  );
});

export const EmpiricalResonance = React.memo(function EmpiricalResonance() {
  const { t } = useTranslation();

  return (
    <div style={S_THEOREM}>
      <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
        {t("theory_empirical_condition")}
      </div>
      <code style={{ ...S_FORMULA, marginTop: SP.md }}>w_B&gt;0 · w_R&gt;w_B · w_G&gt;w_R+w_B</code>
      <code style={{ ...S_FORMULA, marginTop: SP.xs }}>K&lt;B&lt;R&lt;M&lt;G&lt;C&lt;Y&lt;W</code>
      <code style={{ ...S_FORMULA, marginTop: SP.xs }}>rank(g,r,b)=4g+2r+b</code>
      <p style={{ ...S_NOTE, marginTop: SP.md }}>{t("theory_empirical_note")}</p>
    </div>
  );
});

export const ValuationSummary = React.memo(function ValuationSummary() {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t("theory_valuation_title")} style={S_THEOREM}>
      <code style={S_FORMULA}>L(a∨b)+L(a∧b)=L(a)+L(b)</code>
      <p style={{ ...S_NOTE, marginTop: SP.sm }}>{t("theory_valuation_modular_note")}</p>

      <code style={{ ...S_FORMULA, marginTop: SP.xl }}>L(a⊕b)=L(a)+L(b)−2L(a∧b)</code>
      <p style={{ ...S_NOTE, marginTop: SP.sm }}>{t("theory_valuation_xor_note")}</p>

      <code style={{ ...S_FORMULA, marginTop: SP.xl }}>κ(a)=¬a=a⊕W · L(κ(a))=7−L(a) · T(a)+T(κ(a))=1</code>
      <p style={{ ...S_NOTE, marginTop: SP.sm }}>{t("theory_valuation_complement_note")}</p>
    </div>
  );
});
