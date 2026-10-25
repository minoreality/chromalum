// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { LanguageProvider } from "../../i18n/LanguageContext";

describe("LanguageSwitcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the switch button", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
  });

  it("button click toggles language", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>,
    );
    const btn = screen.getByRole("button");
    const initialText = btn.textContent;
    fireEvent.click(btn);
    const newText = btn.textContent;
    expect(newText).not.toBe(initialText);
  });

  it.each([
    ["en", "JA"],
    ["ja", "EN"],
  ])("includes the visible language code in its accessible name in %s", (language, code) => {
    localStorage.setItem("chromalum_lang", language);
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button", { name: new RegExp(`\\b${code}\\b`) }).textContent).toBe(code);
  });

  it("toggles language even when localStorage access is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    const btn = screen.getByRole("button");
    const initialText = btn.textContent;
    fireEvent.click(btn);

    expect(btn.textContent).not.toBe(initialText);
  });
});
