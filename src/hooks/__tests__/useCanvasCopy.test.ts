// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useCanvasCopy } from "../useCanvasCopy";
import type { TranslationFn } from "../../i18n";

const t = ((key: string) => key) as TranslationFn;
const showToast = vi.fn();
const write = vi.fn();
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
let finishEncoding: BlobCallback;

function setup() {
  const workspace = document.createElement("div");
  workspace.tabIndex = 0;
  const canvas = document.createElement("canvas");
  workspace.appendChild(canvas);
  document.body.appendChild(workspace);
  const ref = { current: canvas };
  const hook = renderHook(({ canvasRef }) => useCanvasCopy(canvasRef, showToast, t), { initialProps: { canvasRef: ref } });
  workspace.focus();
  return { workspace, canvas, ref, ...hook };
}

function copy(target: Element, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  showToast.mockReset();
  write.mockReset();
  write.mockImplementation(async (items: { data: Record<string, Promise<Blob>> }[]) => {
    await items[0].data["image/png"];
  });
  vi.stubGlobal(
    "ClipboardItem",
    class {
      constructor(public data: Record<string, Promise<Blob>>) {}
    },
  );
  Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => ({ write }) });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    finishEncoding = callback;
  });
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

describe("useCanvasCopy", () => {
  it.each([{ ctrlKey: true }, { ctrlKey: false, metaKey: true }])("starts a PNG write during the %j gesture", async (modifiers) => {
    const { workspace, canvas } = setup();
    expect(copy(workspace, modifiers).defaultPrevented).toBe(true);
    // The write starts before asynchronous PNG encoding finishes (Safari activation).
    expect(write).toHaveBeenCalledTimes(1);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(showToast).not.toHaveBeenCalled();
    finishEncoding(new Blob(["png"], { type: "image/png" }));
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith("toast_image_copied", "success"));
  });

  it("leaves text selection and focused inputs to native copy", () => {
    const { workspace } = setup();
    const paragraph = document.createElement("p");
    paragraph.textContent = "Selected text";
    document.body.appendChild(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    expect(window.getSelection()?.toString()).toBe("Selected text");
    expect(copy(workspace).defaultPrevented).toBe(false);
    window.getSelection()?.removeAllRanges();
    const input = document.createElement("input");
    workspace.appendChild(input);
    input.focus();
    expect(copy(input).defaultPrevented).toBe(false);
    expect(copy(workspace).defaultPrevented).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it("leaves other chords and modal dialogs alone", () => {
    const { workspace } = setup();
    for (const modifiers of [{ ctrlKey: false }, { shiftKey: true }, { altKey: true }, { isComposing: true }]) {
      expect(copy(workspace, modifiers).defaultPrevented).toBe(false);
    }
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    document.body.appendChild(dialog);
    expect(copy(workspace).defaultPrevented).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it("suppresses repeated or overlapping writes and allows a later copy", async () => {
    const { workspace } = setup();
    copy(workspace);
    expect(copy(workspace, { repeat: true }).defaultPrevented).toBe(true);
    expect(copy(workspace).defaultPrevented).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    finishEncoding(new Blob(["png"], { type: "image/png" }));
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith("toast_image_copied", "success"));
    copy(workspace);
    expect(write).toHaveBeenCalledTimes(2);
    finishEncoding(new Blob(["png"], { type: "image/png" }));
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));
  });

  it.each(["null", "throw", "denied"])("reports %s failures without claiming success", async (failure) => {
    const { workspace } = setup();
    if (failure === "throw")
      vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(() => {
        throw new Error("tainted");
      });
    if (failure === "denied") write.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    copy(workspace);
    if (failure !== "throw") finishEncoding(null);
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledExactlyOnceWith("toast_copy_failed", "error"));
  });

  it("reports an unsupported browser without encoding an image", () => {
    const { workspace, canvas } = setup();
    vi.stubGlobal("ClipboardItem", undefined);
    copy(workspace);
    expect(showToast).toHaveBeenCalledWith("toast_copy_unsupported", "error");
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });

  it("removes the old canvas handlers on tab change and unmount", () => {
    const { workspace, ref, rerender, unmount } = setup();
    const nextWorkspace = document.createElement("div");
    nextWorkspace.tabIndex = 0;
    const nextCanvas = document.createElement("canvas");
    nextWorkspace.appendChild(nextCanvas);
    document.body.appendChild(nextWorkspace);
    rerender({ canvasRef: { ...ref, current: nextCanvas } });
    expect(copy(workspace).defaultPrevented).toBe(false);
    unmount();
    nextWorkspace.focus();
    expect(copy(nextWorkspace).defaultPrevented).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});
