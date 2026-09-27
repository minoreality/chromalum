import React, { useId, useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";

// Bit masks encode channel membership here; no rank is displayed or assumed.
const CHANNELS = [
  { name: "G", mask: 4 },
  { name: "R", mask: 2 },
  { name: "B", mask: 1 },
] as const;
const SUBSETS = THEORY_LEVELS.map((_, state) => {
  const members = CHANNELS.filter(({ mask }) => (state & mask) !== 0).map(({ name }) => name);
  return members.length ? `{${members.join(",")}}` : "∅";
});

function StateLabel({ state }: { state: number }) {
  const info = THEORY_LEVELS[state];
  return (
    <div className="theory-set-state">
      <span className="theory-set-color">
        <i style={{ background: info.color }} aria-hidden="true" />
        <strong>{info.short}</strong>
        <code data-bits>{info.bits.join("")}</code>
      </span>
      <span className="theory-set-subset">
        {/* Reserve every possible label's geometry, including with wide fallback fonts. */}
        {SUBSETS.map((subset, index) => (
          <code
            key={index}
            aria-hidden={index !== state}
            data-subset={index === state ? "" : undefined}
            style={{ visibility: index === state ? "visible" : "hidden" }}
          >
            {subset}
          </code>
        ))}
      </span>
    </div>
  );
}

export const SetOperations = React.memo(function SetOperations() {
  const { t } = useTranslation();
  const [s, setS] = useState(6);
  const [u, setT] = useState(3);
  const resultId = useId();
  return (
    <div className="theory-set-operations">
      <p className="theory-set-hint">{t("theory_set_inputs_hint")}</p>
      <div className="theory-set-pair">
        {(
          [
            { name: "S", state: s, update: setS },
            { name: "T", state: u, update: setT },
          ] as const
        ).map(({ name, state, update }) => (
          <div key={name} role="group" aria-label={t("theory_set_input", name)} className="theory-set-input" data-set-input={name}>
            <p className="theory-set-label">{t("theory_set_input", name)}</p>
            <div className="theory-set-channels">
              {CHANNELS.map(({ name: channel, mask }) => (
                <button
                  key={channel}
                  type="button"
                  aria-label={channel}
                  aria-pressed={(state & mask) !== 0}
                  aria-controls={resultId}
                  onClick={() => update((value) => value ^ mask)}
                >
                  <i aria-hidden="true" style={{ background: THEORY_LEVELS[mask].color }} />
                  {channel}
                  <span aria-hidden="true">{(state & mask) !== 0 ? "1" : "0"}</span>
                </button>
              ))}
            </div>
            <StateLabel state={state} />
          </div>
        ))}
      </div>
      <div id={resultId} className="theory-set-pair theory-set-results" role="status" aria-live="polite" aria-atomic="true">
        <div data-set-operation="union">
          <p className="theory-set-label">
            S ∨ T = S ∪ T <span>OR</span>
          </p>
          <p className="theory-set-rule">{t("theory_set_union_rule")}</p>
          <StateLabel state={s | u} />
        </div>
        <div data-set-operation="intersection">
          <p className="theory-set-label">
            S ∧ T = S ∩ T <span>AND</span>
          </p>
          <p className="theory-set-rule">{t("theory_set_intersection_rule")}</p>
          <StateLabel state={s & u} />
        </div>
      </div>
    </div>
  );
});
