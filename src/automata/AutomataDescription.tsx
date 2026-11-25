import { memo, useMemo } from "react";
import { useTranslation, type TranslationFn } from "../i18n";
import { getAutomataViewingNote } from "../i18n/automata-viewing-notes";
import type { TranslationKey } from "../i18n/types";
import { CA_RULES, lifeLikeNotation, type AutomataRule } from "./model";
import { AUTOMATA_PRESETS, type AutomataPreset } from "./presets";

const RULE_HINT_KEYS: Record<AutomataRule, TranslationKey> = {
  4: "automata_rule_hint_xor",
  5: "automata_rule_hint_xor",
  diagonal: "automata_rule_hint_xor",
  "diagonal-center": "automata_rule_hint_xor",
  8: "automata_rule_hint_8",
  9: "automata_rule_hint_9",
  or: "automata_rule_hint_or",
  and: "automata_rule_hint_and",
  majority: "automata_rule_hint_majority",
  hamming: "automata_rule_hint_hamming",
  life: "automata_rule_hint_life",
  rug: "automata_rule_hint_rug",
  seeds: "automata_rule_hint_seeds",
  "day-night": "automata_rule_hint_day_night",
};

function ruleHint(rule: AutomataRule, t: TranslationFn) {
  const [hint, afterNotation] = t(RULE_HINT_KEYS[rule]).split("{0}");
  const notation = lifeLikeNotation(rule);
  return (
    <>
      {hint}
      {notation && <code>{notation}</code>}
      {afterNotation}
    </>
  );
}

export const AutomataDescription = memo(function AutomataDescription({
  id,
  preset,
  rule,
}: {
  id: string;
  preset: AutomataPreset | null;
  rule: AutomataRule;
}) {
  const { t, lang } = useTranslation();
  // Reserve the tallest wrapped note and rule in this language, including while the seed is edited.
  const reserve = useMemo(() => {
    const notes = new Set(AUTOMATA_PRESETS.flatMap((p) => CA_RULES.map((r) => getAutomataViewingNote(p, r, lang))));
    return (
      <div className="automata-description-reserve automata-reserved" aria-hidden="true">
        <div>
          {Array.from(notes, (text) => (
            <span key={text}>{text}</span>
          ))}
        </div>
        <div>
          {CA_RULES.map((r) => (
            <span key={r}>{ruleHint(r, t)}</span>
          ))}
        </div>
      </div>
    );
  }, [lang, t]);

  return (
    <div className="automata-description">
      {reserve}
      <div id={id} className="automata-description-text">
        {preset && (
          <p className="automata-viewing-note" id={id + "-note"}>
            {getAutomataViewingNote(preset, rule, lang)}
          </p>
        )}
        <p className="automata-rule-hint">{ruleHint(rule, t)}</p>
      </div>
    </div>
  );
});
