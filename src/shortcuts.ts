import type { TranslationKey } from "./i18n/types";
import type { MainTabId } from "./tabs";

/** One row of the Shortcuts panel: a key chord (literal or translated) and its description. */
export type ShortcutEntry = { readonly label: TranslationKey } & ({ readonly key: string } | { readonly keyCopy: TranslationKey });

/** Tabs whose canvas owns the drawing shortcuts (tools, levels, pan, zoom, history). */
const DRAWING_TAB_IDS: ReadonlySet<MainTabId> = new Set<MainTabId>(["source", "color", "glaze"]);

export function hasDrawingShortcuts(tab: MainTabId): boolean {
  return DRAWING_TAB_IDS.has(tab);
}

const TEXT_ENTRY_SELECTOR = [
  "textarea",
  "select",
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"])',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="textbox"]',
  '[role="menu"]',
  '[role="menuitem"]',
].join(",");
const SLIDER_SELECTOR = 'input[type="range"], [role="slider"], [role="spinbutton"]';
const SLIDER_KEYS: ReadonlySet<string> = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);
const PRESS_SELECTOR = [
  "button",
  "summary",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
].join(",");

/**
 * Whether the focused control uses this key itself, so a page shortcut must
 * leave it alone: text entry takes every key, sliders their arrow and edge keys,
 * buttons Space and Enter, links Enter. Everything else stays a shortcut, so a
 * tool button that keeps focus after a click does not silence the keyboard.
 */
export function controlOwnsKey(target: EventTarget | null, event: Pick<KeyboardEvent, "key" | "code">): boolean {
  if (!(target instanceof Element)) return false;
  const editable = target.closest("[contenteditable]");
  if (editable !== null && editable.getAttribute("contenteditable")?.toLowerCase() !== "false") return true;
  if (target.closest(TEXT_ENTRY_SELECTOR) !== null) return true;
  if (target.closest(SLIDER_SELECTOR) !== null) return SLIDER_KEYS.has(event.key);
  if (target.closest(PRESS_SELECTOR) !== null) return event.key === "Enter" || event.key === " " || event.code === "Space";
  if (target.closest("a[href]") !== null) return event.key === "Enter";
  return false;
}

const CANVAS_COPY_SHORTCUT: ShortcutEntry = { key: "Ctrl+C / ⌘C", label: "help_copy_canvas" };

const DRAWING_SHORTCUTS: readonly ShortcutEntry[] = [
  // Tool keys (B E F L R O) are printed on the tool buttons themselves.
  // Drawing parameters
  { key: "0-7", label: "help_level" },
  { key: "[ / ]", label: "help_brush_size" },
  { keyCopy: "help_eyedropper_key", label: "help_eyedropper" },
  { keyCopy: "help_dblclick_level_key", label: "help_dblclick_level" },
  // Navigation
  { keyCopy: "help_pan_combined_key", label: "help_pan" },
  { keyCopy: "help_arrow_pan_key", label: "help_arrow_pan" },
  { keyCopy: "help_zoom_key", label: "help_zoom" },
  { keyCopy: "help_middle_reset_key", label: "help_middle_reset" },
  { keyCopy: "help_zoom_pixel_key", label: "help_zoom_pixel" },
  // File operations
  CANVAS_COPY_SHORTCUT,
  { key: "Ctrl+N", label: "help_new_canvas" },
  { key: "Ctrl+V", label: "help_paste" },
  { keyCopy: "help_drop_image_key", label: "help_drop_image" },
  // Edit
  { key: "Ctrl+Z", label: "help_undo" },
  { key: "Ctrl+Y / ⌘⇧Z", label: "help_redo" },
];

const SOURCE_SHORTCUTS: readonly ShortcutEntry[] = [...DRAWING_SHORTCUTS, { key: "Ctrl+S", label: "help_save_color" }];

const HEX_SHORTCUTS: readonly ShortcutEntry[] = [
  CANVAS_COPY_SHORTCUT,
  { key: "2-5", label: "help_hex_cycle" },
  // The gold ring is the pin's whole report, and neither gesture is printed
  // anywhere on the figure, so the panel is the only place it can be found.
  { keyCopy: "help_hex_pin_key", label: "help_hex_pin" },
];

const MUSIC_SHORTCUTS: readonly ShortcutEntry[] = [
  { key: "1-6", label: "help_music_play" },
  { key: "Esc", label: "help_music_stop_all" },
  { key: "M", label: "help_music_mute" },
];

const THEORY_SHORTCUTS: readonly ShortcutEntry[] = [
  { key: "Enter / Space", label: "help_theory_pin" },
  { key: "Esc", label: "help_theory_clear" },
  { keyCopy: "help_theory_navigate_key", label: "help_theory_navigate" },
];

/** Available on every tab, listed last. */
const COMMON_SHORTCUTS: readonly ShortcutEntry[] = [
  { key: "Alt+1-8", label: "help_switch_tab" },
  { key: "Alt+L", label: "help_switch_language" },
  { key: "?/F1", label: "help_this_help" },
  { key: "Esc", label: "help_close" },
];

export function shortcutsForTab(tab: MainTabId): readonly ShortcutEntry[] {
  const own: readonly ShortcutEntry[] =
    tab === "source"
      ? SOURCE_SHORTCUTS
      : hasDrawingShortcuts(tab)
        ? DRAWING_SHORTCUTS
        : tab === "hex"
          ? HEX_SHORTCUTS
          : tab === "music"
            ? MUSIC_SHORTCUTS
            : tab === "map"
              ? [CANVAS_COPY_SHORTCUT]
              : tab === "gallery"
                ? [{ key: "Ctrl+C / ⌘C", label: "help_copy_gallery_preview" }]
                : tab === "theory"
                  ? THEORY_SHORTCUTS
                  : [];
  return [...own, ...COMMON_SHORTCUTS];
}
