import { useEffect, useRef } from "react";
import type { TranslationFn } from "../i18n";
import { controlOwnsKey } from "../shortcuts";

/** Copy only the active artwork canvas, never its cursor/highlight overlays. */
export function useCanvasCopy(
  canvasRef: React.RefObject<HTMLCanvasElement | null> | null,
  showToast: ((message: string, type: "error" | "success" | "info") => void) | undefined,
  t: TranslationFn,
  getCopyCanvas?: () => HTMLCanvasElement,
) {
  const pending = useRef(false);

  useEffect(() => {
    const canvas = canvasRef?.current;
    const workspace = canvas?.parentElement;
    if (!canvas || !workspace) return;

    const focusCanvas = (event: PointerEvent) => {
      // Drawing prevents the pointer's default focus, so focus before its handler.
      if (event.target === canvas || event.target === workspace) workspace.focus({ preventScroll: true });
    };

    const copyImage = async () => {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        showToast?.(t("toast_copy_unsupported"), "error");
        return;
      }
      pending.current = true;
      try {
        const png = new Promise<Blob>((resolve, reject) => {
          const source = getCopyCanvas?.() ?? canvas;
          source.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("PNG encoding failed"));
          }, "image/png");
        });
        // Permission/constructor failures may happen before the API consumes png.
        void png.catch(() => {});
        // Start the write in the key gesture, before encoding completes, to retain
        // user activation in Safari. toBlob snapshots the intrinsic canvas pixels.
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        showToast?.(t("toast_image_copied"), "success");
      } catch {
        showToast?.(t("toast_copy_failed"), "error");
      } finally {
        pending.current = false;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !(event.ctrlKey || event.metaKey) ||
        event.shiftKey ||
        event.altKey ||
        event.key.toLowerCase() !== "c" ||
        controlOwnsKey(event.target, event) ||
        controlOwnsKey(document.activeElement, event) ||
        window.getSelection()?.toString()
      )
        return;

      // Resolve hover at key time so scrolling, tab changes, and modal overlays
      // cannot leave a stale hovered canvas. Touch-only devices keep focus copy.
      const hovered = window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches
        ? document.querySelector(".canvas-workspace:hover")
        : null;
      const focused = document.activeElement === workspace || document.activeElement === canvas;
      if (hovered ? hovered !== workspace : !focused) return;
      // A preview can own copy inside its dialog; other dialogs block it.
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (Array.from(dialogs).some((dialog) => !dialog.contains(workspace))) return;

      event.preventDefault();
      if (!event.repeat && !pending.current) void copyImage();
    };

    workspace.addEventListener("pointerdown", focusCanvas, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      workspace.removeEventListener("pointerdown", focusCanvas, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [canvasRef, showToast, t, getCopyCanvas]);
}
