import React, { useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { targetMask, targetState, type K8Selection, type K8Target } from "./k8-selection";

export function toggleFactorLabel(mask: number): string {
  return mask === 0
    ? "id"
    : ["G", "R", "B"]
        .filter((_, index) => THEORY_LEVELS[mask].bits[index] === 1)
        .map((channel) => `τ${channel}`)
        .join("");
}

function matchesCell(target: K8Target | null, state: number, mask: number) {
  if (target?.kind === "mask") return target.mask === mask;
  return target?.kind === "transition" && target.mask === mask && (target.state === state || (target.state ^ mask) === state);
}

export const CayleyTable = React.memo(function CayleyTable({ link, hlLevel }: { link: K8Selection; hlLevel: number | null }) {
  const { t } = useTranslation();
  const [tabCell, setTabCell] = useState({ row: 0, mask: 0 });
  const activeRow = targetState(link.readout);
  const activeMask = targetMask(link.readout);
  const activeResult = link.readout?.kind === "transition" ? link.readout.state ^ link.readout.mask : null;
  const selectedRow = targetState(link.selection);
  const enabledMasks = THEORY_LEVELS.map((info) => info.lv).filter(link.canSelectMask);
  const tabMask = enabledMasks.includes(tabCell.mask) ? tabCell.mask : enabledMasks[0];

  const previewHandlers = (target: K8Target) => ({
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") link.onPreview(target, "table", "hover");
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") link.onPreview(null, "table", "hover");
    },
    onFocus: () => link.onPreview(target, "table", "focus"),
    onBlur: () => link.onPreview(null, "table", "focus"),
  });

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, row: number, mask: number) => {
    let nextRow = row;
    let nextMask = mask;
    const index = enabledMasks.indexOf(mask);
    switch (event.key) {
      case "ArrowUp":
        nextRow = Math.max(0, row - 1);
        break;
      case "ArrowDown":
        nextRow = Math.min(7, row + 1);
        break;
      case "ArrowLeft":
        nextMask = enabledMasks[Math.max(0, index - 1)];
        break;
      case "ArrowRight":
        nextMask = enabledMasks[Math.min(enabledMasks.length - 1, index + 1)];
        break;
      case "Home":
        nextMask = enabledMasks[0];
        if (event.ctrlKey) nextRow = 0;
        break;
      case "End":
        nextMask = enabledMasks[enabledMasks.length - 1];
        if (event.ctrlKey) nextRow = 7;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.currentTarget.closest("table")?.querySelector<HTMLButtonElement>(`[data-row="${nextRow}"][data-mask="${nextMask}"]`)?.focus();
  };

  return (
    <div className="theory-cayley">
      <div className="theory-cayley-axes">
        <span>{t("theory_toggle_table_state_axis")} ↓</span>
        <span>{t("theory_toggle_table_mask_axis")} →</span>
      </div>
      <table id="theory-cayley-table" className="theory-cayley-table" aria-label={t("theory_toggle_table_aria")}>
        <thead>
          <tr>
            <th scope="col" className="theory-cayley-corner">
              ⊕
            </th>
            {THEORY_LEVELS.map((info) => {
              const enabled = link.canSelectMask(info.lv);
              return (
                <th
                  key={info.lv}
                  scope="col"
                  data-column-mask={info.lv}
                  data-active={activeMask === info.lv}
                  data-enabled={enabled}
                  style={{ "--theory-mask-color": info.lv === 0 ? "#a3aec5" : info.color } as React.CSSProperties}
                  aria-label={t("theory_toggle_table_mask_aria", info.bits.join(""), toggleFactorLabel(info.lv))}
                >
                  <button
                    type="button"
                    data-toggle-mask={info.lv}
                    data-active={activeMask === info.lv}
                    aria-label={t("theory_toggle_table_mask_aria", info.bits.join(""), toggleFactorLabel(info.lv))}
                    aria-pressed={link.selection?.kind === "mask" && link.selection.mask === info.lv}
                    aria-disabled={!enabled || undefined}
                    tabIndex={enabled ? 0 : -1}
                    title={`${info.bits.join("")} · ${toggleFactorLabel(info.lv)}`}
                    {...previewHandlers({ kind: "mask", mask: info.lv })}
                    onClick={() => link.select({ kind: "mask", mask: info.lv })}
                  >
                    <span>{info.bits.join("")}</span>
                    <i style={{ background: info.lv === 0 ? "#78819b" : info.color }} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {THEORY_LEVELS.map((rowInfo) => (
            <tr key={rowInfo.lv} data-row-state={rowInfo.lv}>
              <th scope="row">
                <button
                  type="button"
                  data-toggle-state={rowInfo.lv}
                  data-active={activeRow === rowInfo.lv || activeResult === rowInfo.lv}
                  aria-pressed={selectedRow === rowInfo.lv}
                  aria-disabled={enabledMasks.length === 0 || undefined}
                  tabIndex={enabledMasks.length ? 0 : -1}
                  aria-label={t("theory_toggle_table_state_aria", rowInfo.short, rowInfo.bits.join(""), rowInfo.lv)}
                  {...previewHandlers({ kind: "state", state: rowInfo.lv })}
                  onClick={() => link.select({ kind: "state", state: rowInfo.lv })}
                >
                  <span>{rowInfo.bits.join("")}</span>
                  <small>
                    <i style={{ background: rowInfo.color }} aria-hidden="true" />
                    {rowInfo.short}
                    <sub>{rowInfo.lv}</sub>
                  </small>
                </button>
              </th>
              {THEORY_LEVELS.map((maskInfo) => {
                const row = rowInfo.lv;
                const mask = maskInfo.lv;
                const result = row ^ mask;
                const info = THEORY_LEVELS[result];
                const enabled = link.canSelectMask(mask);
                const active = matchesCell(link.readout, row, mask);
                const selected = link.selection?.kind === "transition" && link.selection.state === row && link.selection.mask === mask;
                const onAxis = enabled && (activeRow === row || activeResult === row || activeMask === mask);
                const dim = !enabled || (link.readout !== null ? !onAxis : hlLevel !== null && result !== hlLevel);
                return (
                  <td key={mask} style={{ "--theory-mask-color": mask === 0 ? "#a3aec5" : maskInfo.color } as React.CSSProperties}>
                    <button
                      type="button"
                      data-row={row}
                      data-mask={mask}
                      data-result={result}
                      data-active={active}
                      data-axis={onAxis}
                      data-preview={enabled && !active && matchesCell(link.preview, row, mask)}
                      data-dimmed={dim}
                      aria-pressed={selected}
                      aria-disabled={!enabled || undefined}
                      aria-label={t(
                        "theory_toggle_table_cell",
                        rowInfo.name,
                        rowInfo.bits.join(""),
                        maskInfo.bits.join(""),
                        toggleFactorLabel(mask),
                        info.name,
                        info.bits.join(""),
                      )}
                      tabIndex={tabCell.row === row && tabMask === mask ? 0 : -1}
                      {...previewHandlers({ kind: "transition", state: row, mask })}
                      onFocus={() => {
                        setTabCell({ row, mask });
                        link.onPreview({ kind: "transition", state: row, mask }, "table", "focus");
                      }}
                      onClick={() => link.select({ kind: "transition", state: row, mask })}
                      onKeyDown={(event) => moveFocus(event, row, mask)}
                    >
                      <span>{info.bits.join("")}</span>
                      <i style={{ background: info.color }} aria-hidden="true" />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
