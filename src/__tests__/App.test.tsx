// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { LanguageProvider } from "../i18n";
import { loadStateWithStatus, recoverInvalidState } from "../utils/idb-persistence";

vi.mock("../utils/idb-persistence", () => ({
  SAVED_STATE_VERSION: 1,
  loadState: vi.fn(() => Promise.resolve(null)),
  loadStateWithStatus: vi.fn(() => Promise.resolve({ status: "empty", state: null })),
  saveState: vi.fn(() => Promise.resolve(1)),
  recoverInvalidState: vi.fn(() => Promise.resolve(8)),
  requestPersistentStorage: vi.fn(() => Promise.resolve({ supported: true, persisted: true, requested: true })),
}));

function renderApp(lang: "en" | "ja" = "en") {
  localStorage.setItem("chromalum_lang", lang);
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  );
}

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    { lang: "en" as const, title: "Auto-save off", unsaved: "Edits are unsaved." },
    { lang: "ja" as const, title: "自動保存停止", unsaved: "変更は未保存です。" },
  ])("keeps $lang autosave status and recovery available after the toast expires", async ({ lang, title, unsaved }) => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(loadStateWithStatus).mockResolvedValueOnce({ status: "invalid", state: null, reason: "unsupported version" });
    renderApp(lang);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const notice = screen.getByRole("alert", { name: new RegExp(`^${title}`) });
    expect(notice.textContent).toContain(unsaved);
    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    expect(screen.getByRole("alert", { name: new RegExp(`^${title}`) })).toBe(notice);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Source" }));
    const status = screen.getByRole("button", { name: title });
    status.focus();
    fireEvent.click(status);
    const dialog = screen.getByRole("dialog", { name: title });
    expect(dialog.textContent).toContain(unsaved);
    expect(
      screen.getByRole("button", { name: lang === "en" ? "Archive original and resume saving" : "元データを退避して保存を再開" }),
    ).toBeTruthy();
    expect(recoverInvalidState).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: title })).toBeNull();
    expect(document.activeElement).toBe(status);
    expect(screen.queryByText(/Auto-save on|自動保存オン/)).toBeNull();
  });

  it("only recovers saved data after the recovery action is chosen", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(loadStateWithStatus).mockResolvedValueOnce({ status: "invalid", state: null });
    renderApp();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Auto-save off" }));
    expect(screen.getByRole("dialog", { name: "Auto-save off" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Archive original and resume saving" }));
    });
    expect(screen.queryByRole("dialog", { name: "Auto-save off" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Auto-save off" })).toBeNull();
    expect(screen.getByRole("alert", { name: /Auto-save resumed/ })).toBeTruthy();
  });

  it("renders primary tabs and switches from Source to Theory", async () => {
    renderApp();

    expect(await screen.findByRole("tab", { name: "Source" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Gallery" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Music" })).toBeTruthy();
    expect(screen.getByRole("application", { name: "Drawing canvas (grayscale)" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Discrete Algebraic Color Theory" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Theory" }));

    expect(await screen.findByRole("heading", { name: "Discrete Algebraic Color Theory" }, { timeout: 15000 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Total Order and Binary Weights" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Duality of Mixing and Complement" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Geometry and Codes of Nonzero Vectors" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Eight-State Correspondence Table" })).toBeTruthy();
    expect(window.location.hash).toBe("#theory");

    fireEvent.click(screen.getByRole("tab", { name: "Source" }));
    expect(screen.queryByRole("heading", { name: "Discrete Algebraic Color Theory" })).toBeNull();
  });

  it("opens Theory directly from the URL hash", async () => {
    window.history.replaceState(null, "", "/#theory");

    renderApp();

    expect(await screen.findByRole("heading", { name: "Discrete Algebraic Color Theory" }, { timeout: 15000 })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Theory" }).getAttribute("aria-selected")).toBe("true");
  });

  it("updates the document title and names tab panels from their tabs", async () => {
    renderApp();

    expect(await screen.findByRole("tabpanel", { name: "Source" })).toBeTruthy();
    expect(document.title).toBe("CHROMALUM - Source");

    fireEvent.click(screen.getByRole("tab", { name: "Theory" }));

    expect(await screen.findByRole("tabpanel", { name: "Theory" })).toBeTruthy();
    expect(document.title).toBe("CHROMALUM - Theory");
  });

  it("opens About and Shortcuts from the header", async () => {
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "About" }));
    expect(screen.getByRole("dialog", { name: "Overview" })).toBeTruthy();
    expect(screen.getByText(/three primary colors of light/)).toBeTruthy();
    expect(screen.getByText(/algebraic structure connecting the eight colors/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Overview" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeTruthy();
  }, 15000);

  it("requests the color save from Ctrl+S on the Source tab", async () => {
    renderApp();
    fireEvent.click(await screen.findByRole("tab", { name: "Source" }));
    await screen.findByTitle(/Save color PNG/);

    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByText("Save color image?")).toBeTruthy();
  }, 15000);

  it("leaves Ctrl+S alone while another dialog owns the keyboard", async () => {
    renderApp();
    fireEvent.click(await screen.findByRole("tab", { name: "Source" }));
    await screen.findByTitle(/Save color PNG/);

    const open = new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(open);
    expect(await screen.findByRole("dialog", { name: "New Canvas" })).toBeTruthy();

    const save = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(save);

    expect(save.defaultPrevented).toBe(false);
    expect(screen.queryByText("Save color image?")).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  }, 15000);

  it("clears a restored canvas whose only content is glaze overrides", async () => {
    // What a canvas saved before glaze stopped marking K, B, Y and W looks like:
    // every level zero, overrides on top of them. The reducer treats either map
    // being non-blank as something to clear, and App must not decide otherwise.
    const pixelCandidateOverrideMap = new Uint8Array(320 * 320);
    pixelCandidateOverrideMap.fill(1, 0, 2154);
    vi.mocked(loadStateWithStatus).mockResolvedValueOnce({
      status: "loaded",
      state: {
        width: 320,
        height: 320,
        levelData: new Uint8Array(320 * 320),
        pixelCandidateOverrideMap,
        candidateIndexByLevel: [0, 0, 0, 0, 0, 0, 0, 0],
        version: 1,
        revision: 1,
      },
    });

    renderApp();
    fireEvent.click(await screen.findByRole("tab", { name: "Source" }));
    const undo = await screen.findByRole("button", { name: "↩Undo" });
    await screen.findByTitle("Clear canvas");
    expect(undo.hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByTitle("Clear canvas"));

    expect(screen.getByRole("button", { name: "↩Undo" }).hasAttribute("disabled")).toBe(false);
  }, 15000);

  it("does not interrupt the app with legacy service worker update notifications", async () => {
    renderApp();

    expect(await screen.findByRole("tab", { name: "Source" })).toBeTruthy();

    fireEvent(
      window,
      new CustomEvent("chromalum:pwa-update-ready", {
        detail: { registration: { waiting: null } as unknown as ServiceWorkerRegistration },
      }),
    );

    expect(screen.queryByText("A new version is available")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reload" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Source" }).getAttribute("aria-selected")).toBe("true");
  });
});
