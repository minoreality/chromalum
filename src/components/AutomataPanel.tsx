import { useEffect, useId, useMemo, useRef } from "react";
import { useTranslation, type TranslationFn } from "../i18n";
import type { TranslationKey } from "../i18n/types";
import { CA_RULES, MAX_TIME, PLANE_SIZE, evolvePlane, type AutomataRule, type CAColor } from "../automata/model";
import { AUTOMATA_PRESETS, type AutomataPreset } from "../automata/presets";
import { useAutomataState } from "../automata/useAutomataState";
import { AutomataCanvas } from "../automata/AutomataCanvas";
import { AutomataPalette, getColorLabel } from "../automata/AutomataPalette";
import { getCanvasPanelClassName, getCanvasPanelStyle, getPanelLayoutClassName } from "../utils/panel-layout";

const RULE_KEYS: Record<AutomataRule, TranslationKey> = {
  4: "automata_rule_4",
  5: "automata_rule_5",
  diagonal: "automata_rule_diagonal",
  "diagonal-center": "automata_rule_diagonal_center",
  8: "automata_rule_8",
  9: "automata_rule_9",
  life: "automata_rule_life",
  rug: "automata_rule_rug",
};
const PRESET_KEYS: Record<AutomataPreset, TranslationKey> = {
  rosette: "automata_preset_rosette",
  diamond: "automata_preset_diamond",
  corolla: "automata_preset_corolla",
  luminous: "automata_preset_luminous",
  clock: "automata_preset_clock",
  "phase-clock": "automata_preset_phase_clock",
  pulse: "automata_preset_pulse",
  fireworks: "automata_preset_fireworks",
  weave: "automata_preset_weave",
  rgb: "automata_preset_rgb",
  white: "automata_preset_white",
  black: "automata_preset_black",
};
function readCell(t: TranslationFn, x: number, y: number, initial: CAColor, time: number, current: CAColor): string {
  return t("automata_selected", x, y, getColorLabel(initial, t), time, getColorLabel(current, t));
}

function makeRoomForPicker(select: HTMLSelectElement): void {
  if (!window.CSS?.supports?.("appearance", "base-select")) return;
  const bounds = select.getBoundingClientRect();
  const space = Math.min(window.innerHeight / 2, bounds.height * 4);
  if (window.innerHeight - bounds.bottom < space) select.scrollIntoView({ block: "center", behavior: "instant" });
}

export function AutomataPanel({
  active,
  displayWidth,
  displayHeight,
}: {
  active: boolean;
  displayWidth: number;
  displayHeight: number;
}): React.JSX.Element {
  const { t } = useTranslation(),
    id = useId();
  const controller = useAutomataState();
  const { state, dispatch } = controller;
  const board = useMemo(() => evolvePlane(state.seed, PLANE_SIZE, state.time, state.rule), [state.seed, state.time, state.rule]);
  const index = state.y * PLANE_SIZE + state.x;
  const readout = readCell(t, state.x, state.y, state.seed[index] as CAColor, state.time, board[index] as CAColor);
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!controller.interacting && liveRef.current) liveRef.current.textContent = readout;
  }, [controller.interacting, readout]);
  return (
    <section className="automata-panel" aria-labelledby={id + "-title"} data-mode={state.time === 0 ? "edit" : "read"}>
      <header className="automata-heading">
        <h2 id={id + "-title"}>{t("automata_subtitle")}</h2>
      </header>
      <div className={`${getPanelLayoutClassName(displayWidth, displayHeight)} automata-content`}>
        <div className={getCanvasPanelClassName(displayWidth, displayHeight)} style={getCanvasPanelStyle(displayWidth, displayHeight)}>
          <AutomataCanvas
            active={active}
            controller={controller}
            board={board}
            label={t("automata_canvas_label")}
            description={t("automata_keyboard_hint")}
          />
        </div>
        <div className="panel-sidebar automata-sidebar">
          <div className="automata-tools">
            <AutomataPalette color={state.color} onSelect={(color) => dispatch({ type: "set-color", color })} />
            <div className="automata-controls" data-testid="automata-controls">
              <label className="automata-control">
                <span>{t("automata_rule")}</span>
                <select
                  value={state.rule}
                  onPointerDown={(event) => makeRoomForPicker(event.currentTarget)}
                  onKeyDown={(event) => {
                    if (["ArrowUp", "ArrowDown", " ", "Enter"].includes(event.key)) makeRoomForPicker(event.currentTarget);
                  }}
                  onChange={(event) => {
                    const value = CA_RULES.find((rule) => String(rule) === event.target.value);
                    if (value !== undefined) dispatch({ type: "set-rule", rule: value });
                  }}
                >
                  <button type="button">
                    <span>{t(RULE_KEYS[state.rule])}</span>
                  </button>
                  {CA_RULES.map((rule) => (
                    <option key={rule} value={rule}>
                      {t(RULE_KEYS[rule])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="automata-control">
                <span>{t("automata_preset")}</span>
                <select
                  value={state.preset}
                  onPointerDown={(event) => makeRoomForPicker(event.currentTarget)}
                  onKeyDown={(event) => {
                    if (["ArrowUp", "ArrowDown", " ", "Enter"].includes(event.key)) makeRoomForPicker(event.currentTarget);
                  }}
                  onChange={(event) => {
                    const value = AUTOMATA_PRESETS.find((preset) => preset === event.target.value);
                    if (value !== undefined) dispatch({ type: "set-preset", preset: value });
                  }}
                >
                  <button type="button">
                    <span>{t(PRESET_KEYS[state.preset])}</span>
                  </button>
                  {AUTOMATA_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {t(PRESET_KEYS[preset])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="automata-time">
                <span>{t("automata_time", state.time)}</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_TIME}
                  step={1}
                  value={state.time}
                  onChange={(event) => dispatch({ type: "set-time", time: Number(event.target.value) })}
                />
              </label>
              <div className="automata-actions">
                <button
                  type="button"
                  disabled={state.time === MAX_TIME}
                  onClick={() => dispatch({ type: "set-time", time: Math.min(MAX_TIME, state.time + 1) })}
                >
                  {t("automata_step")}
                </button>
                <button type="button" disabled={state.time === 0} onClick={() => dispatch({ type: "set-time", time: 0 })}>
                  {t("automata_return")}
                </button>
              </div>
            </div>
            <div className="automata-notice-space">
              <p
                className={controller.persistenceUnavailable ? "automata-notice" : "automata-notice automata-reserved"}
                aria-hidden={!controller.persistenceUnavailable}
                role={controller.persistenceUnavailable ? "status" : undefined}
              >
                {t("automata_storage_unavailable")}
              </p>
            </div>
            <div ref={liveRef} className="automata-sr-only" data-testid="automata-live" aria-live="polite" aria-atomic="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
