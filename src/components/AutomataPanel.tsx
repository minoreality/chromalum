import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation, type TranslationFn } from "../i18n";
import type { TranslationKey } from "../i18n/types";
import { CA_RULES, MAX_TIME, PLANE_SIZE, createVisibleEvolution, type AutomataRule, type CAColor } from "../automata/model";
import { AUTOMATA_PRESETS, makePlaneSeed, type AutomataPreset } from "../automata/presets";
import { useAutomataState } from "../automata/useAutomataState";
import { useGenerationSound } from "../automata/useGenerationSound";
import { useStrokePreview } from "../automata/useStrokePreview";
import { FLOW_SOUND_KEY } from "../shortcuts";
import { AutomataCanvas } from "../automata/AutomataCanvas";
import { AutomataDescription } from "../automata/AutomataDescription";
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
  seeds: "automata_rule_seeds",
  "day-night": "automata_rule_day_night",
  or: "automata_rule_or",
  and: "automata_rule_and",
  majority: "automata_rule_majority",
  hamming: "automata_rule_hamming",
};
const RULE_GROUPS: readonly { label: TranslationKey; rules: readonly AutomataRule[] }[] = [
  { label: "automata_rules_xor", rules: [4, 5, "diagonal", "diagonal-center", 8, 9] },
  { label: "automata_rules_or_and", rules: ["or", "and"] },
  { label: "automata_rules_majority_toggle", rules: ["majority", "hamming"] },
  { label: "automata_rules_life", rules: ["life", "rug", "seeds", "day-night"] },
];
const PRESET_KEYS: Record<AutomataPreset, TranslationKey> = {
  "overlapping-squares": "automata_preset_overlapping_squares",
  rosette: "automata_preset_rosette",
  corolla: "automata_preset_corolla",
  luminous: "automata_preset_luminous",
  weave: "automata_preset_weave",
  glider: "automata_preset_glider",
  pulse: "automata_preset_pulse",
  "phase-clock": "automata_preset_phase_clock",
  fireworks: "automata_preset_fireworks",
  "all-white": "automata_preset_all_white",
  black: "automata_preset_black",
};
function readCell(t: TranslationFn, x: number, y: number, initial: CAColor, time: number, current: CAColor): string {
  return t("automata_selected", x, y, getColorLabel(initial, t), time, getColorLabel(current, t));
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
  const layoutRef = useRef<HTMLDivElement>(null);
  const [comparison, setComparison] = useState(false);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!active || !layout) return;
    // CSS owns the container breakpoint; DOM order follows it for keyboard navigation.
    const measure = () => setComparison(getComputedStyle(layout).getPropertyValue("--automata-comparison").trim() === "1");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout.parentElement!);
    return () => observer.disconnect();
  }, [active]);
  const controller = useAutomataState();
  const { state, dispatch } = controller;
  const editing = !comparison && state.time === 0;
  const presetSeed = useMemo(() => makePlaneSeed(state.preset), [state.preset]);
  const editedPreset = useMemo(() => state.seed.some((color, index) => color !== presetSeed[index]), [state.seed, presetSeed]);
  // The main-thread timeline stays cached while the worker previews the changing seed.
  const resultSeed = state.time === 0 ? state.seed : controller.settledSeed;
  const evolution = useMemo(() => createVisibleEvolution(resultSeed, state.rule), [resultSeed, state.rule]);
  const preview = useStrokePreview(active && comparison, state.seed, resultSeed, state.rule, state.time);
  const board = useMemo(() => preview?.board ?? evolution.at(state.time), [preview, evolution, state.time]);
  const sound = useGenerationSound(active, state.time, evolution, board, controller.drawingLine && state.time > 0);
  const index = state.y * PLANE_SIZE + state.x;
  const readout = readCell(t, state.x, state.y, state.seed[index] as CAColor, state.time, board[index] as CAColor);
  const liveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!controller.interacting && liveRef.current) liveRef.current.textContent = readout;
  }, [controller.interacting, readout]);
  const palette = <AutomataPalette color={state.color} onSelect={(color) => dispatch({ type: "set-color", color })} />;
  const descriptionId = id + "-description";
  const description = <AutomataDescription id={descriptionId} preset={editedPreset ? null : state.preset} rule={state.rule} />;
  const patternControls = (
    <div className="automata-controls" data-testid="automata-controls">
      <label className="automata-control">
        <span>{t("automata_preset")}</span>
        <select
          value={editedPreset ? "edited" : state.preset}
          aria-describedby={editedPreset ? undefined : descriptionId + "-note"}
          onChange={(event) => {
            const value = AUTOMATA_PRESETS.find((preset) => preset === event.target.value);
            if (value !== undefined) dispatch({ type: "set-preset", preset: value, preserveTime: comparison });
          }}
        >
          <button type="button">
            <span>{t(editedPreset ? "automata_preset_edited" : PRESET_KEYS[state.preset])}</span>
          </button>
          {AUTOMATA_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {t(PRESET_KEYS[preset])}
            </option>
          ))}
          {editedPreset && (
            <option value="edited" disabled>
              {t("automata_preset_edited")}
            </option>
          )}
        </select>
      </label>
      <label className="automata-control">
        <span>{t("automata_rule")}</span>
        <select
          value={state.rule}
          aria-describedby={descriptionId}
          onChange={(event) => {
            const value = CA_RULES.find((rule) => String(rule) === event.target.value);
            if (value !== undefined) dispatch({ type: "set-rule", rule: value });
          }}
        >
          <button type="button">
            <span>{t(RULE_KEYS[state.rule])}</span>
          </button>
          {RULE_GROUPS.map((group) => (
            <optgroup key={group.label} label={t(group.label)}>
              {group.rules.map((rule) => (
                <option key={rule} value={rule}>
                  {t(RULE_KEYS[rule])}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
  const generationControls = (
    <div className="automata-generation-controls">
      <div className="automata-time-heading">
        <div className="automata-time-summary">
          <label className="automata-generation-label" htmlFor={id + "-time"}>
            <span>{t("automata_time", state.time, MAX_TIME)}</span>
            <span className="automata-reserved" aria-hidden="true">
              {t("automata_time", MAX_TIME, MAX_TIME)}
            </span>
          </label>
          {!comparison && (
            <span className={editing ? "automata-mode" : "automata-mode automata-reserved"} id={id + "-mode"} aria-hidden={!editing}>
              {t("automata_edit_mode")}
            </span>
          )}
        </div>
        <label className="automata-generation-sound">
          <input
            type="checkbox"
            aria-keyshortcuts={FLOW_SOUND_KEY}
            checked={sound.enabled}
            disabled={typeof AudioContext === "undefined"}
            onChange={(event) => sound.toggle(event.target.checked)}
          />
          {t("automata_generation_sound")}
        </label>
      </div>
      <input
        className="automata-slider"
        id={id + "-time"}
        type="range"
        aria-describedby={editing ? id + "-mode" : undefined}
        min={0}
        max={MAX_TIME}
        step={1}
        value={state.time}
        {...sound.sliderEvents}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
        }}
        onChange={(event) => dispatch({ type: "set-time", time: Number(event.target.value) })}
      />
      <div className="automata-actions">
        <button
          className="automata-return"
          type="button"
          disabled={state.time === 0}
          onClick={() => dispatch({ type: "set-time", time: 0 })}
        >
          {t("automata_return")}
        </button>
        <button type="button" disabled={state.time === 0} onClick={() => dispatch({ type: "set-time", time: Math.max(0, state.time - 1) })}>
          {t("automata_back")}
        </button>
        <button
          type="button"
          disabled={state.time === MAX_TIME}
          onClick={() => dispatch({ type: "set-time", time: Math.min(MAX_TIME, state.time + 1) })}
        >
          {t("automata_step")}
        </button>
      </div>
    </div>
  );
  const storageNotice = (
    <div className="automata-notice-space">
      <p
        className={controller.persistenceUnavailable ? "automata-notice" : "automata-notice automata-reserved"}
        aria-hidden={!controller.persistenceUnavailable}
        role={controller.persistenceUnavailable ? "status" : undefined}
      >
        {t("automata_storage_unavailable")}
      </p>
    </div>
  );
  return (
    <section
      className="automata-panel"
      aria-labelledby={id + "-title"}
      data-mode={state.time === 0 ? "edit" : "read"}
      data-layout={comparison ? "comparison" : "single"}
    >
      <header className="automata-heading">
        <h2 id={id + "-title"}>{t("automata_subtitle")}</h2>
      </header>
      <div
        ref={layoutRef}
        className={
          comparison ? "automata-content automata-comparison" : getPanelLayoutClassName(displayWidth, displayHeight) + " automata-content"
        }
        style={comparison ? getCanvasPanelStyle(displayWidth, displayHeight) : undefined}
      >
        {comparison ? (
          <>
            <div className="automata-pane">
              <h3 className="automata-pane-title">{t("automata_preset")}</h3>
              <AutomataCanvas
                active={active}
                controller={controller}
                board={state.seed}
                editable={true}
                onPaintChanges={sound.onPaintChanges}
                testId="automata-initial-board"
                label={t("automata_initial_canvas_label")}
                description={t("automata_initial_keyboard_hint")}
              />
              <div className="automata-sidebar automata-tools automata-initial-tools">
                {palette}
                {patternControls}
              </div>
            </div>
            <div className="automata-pane">
              <h3 className="automata-pane-title">{t("automata_result_heading")}</h3>
              <AutomataCanvas
                active={active}
                controller={controller}
                board={board}
                editable={false}
                busy={state.seed !== (preview?.seed ?? resultSeed)}
                label={t("automata_result_canvas_label")}
                description={t("automata_result_keyboard_hint")}
              />
              <div className="automata-sidebar automata-tools automata-result-tools">{generationControls}</div>
            </div>
            {description}
            {storageNotice}
          </>
        ) : (
          <>
            <div className={getCanvasPanelClassName(displayWidth, displayHeight)} style={getCanvasPanelStyle(displayWidth, displayHeight)}>
              <AutomataCanvas
                active={active}
                controller={controller}
                board={board}
                label={t("automata_canvas_label")}
                onPaintChanges={sound.onPaintChanges}
                description={t("automata_keyboard_hint")}
              />
            </div>
            <div className="panel-sidebar automata-sidebar">
              <div className="automata-tools">
                {palette}
                {generationControls}
                {patternControls}
                {description}
                {storageNotice}
              </div>
            </div>
          </>
        )}
      </div>
      <div ref={liveRef} className="automata-sr-only" data-testid="automata-live" aria-live="polite" aria-atomic="true" />
    </section>
  );
}
