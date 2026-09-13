// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { LanguageProvider } from "../i18n";

vi.mock("../utils/idb-persistence", () => ({
  SAVED_STATE_VERSION: 1,
  loadState: vi.fn(() => Promise.resolve(null)),
  loadStateWithStatus: vi.fn(() => Promise.resolve({ status: "empty", state: null })),
  saveState: vi.fn(() => Promise.resolve(1)),
  requestPersistentStorage: vi.fn(() => Promise.resolve({ supported: true, persisted: true, requested: true })),
}));

function renderApp() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  );
}

describe("App", () => {
  it("renders primary tabs and switches from Source to Theory", async () => {
    renderApp();

    expect(await screen.findByRole("tab", { name: "Source" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Gallery" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Music" })).toBeTruthy();
    expect(screen.getByRole("application", { name: "Drawing canvas (grayscale)" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Discrete Algebraic Color Theory" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Theory" }));

    expect(await screen.findByRole("heading", { name: "Discrete Algebraic Color Theory" }, { timeout: 15000 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Color Order and Binary Rank" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Rank and Boolean Operations" })).toBeTruthy();
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
