// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { controlOwnsKey } from "../shortcuts";

function element(html: string): Element {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild!;
}

const key = (key: string, code = key) => ({ key, code });

describe("controlOwnsKey", () => {
  it("lets text entry keep every key", () => {
    for (const html of [
      "<input>",
      '<input type="number">',
      "<textarea></textarea>",
      "<select></select>",
      '<div contenteditable="true"></div>',
      '<div role="combobox"></div>',
    ]) {
      for (const k of ["b", "3", "Escape", "ArrowUp", " "]) expect(controlOwnsKey(element(html), key(k)), `${html} ${k}`).toBe(true);
    }
  });

  it("lets buttons keep only Space and Enter", () => {
    for (const html of ["<button></button>", '<div role="button"></div>', '<input type="checkbox">', "<summary></summary>"]) {
      expect(controlOwnsKey(element(html), key(" ", "Space"))).toBe(true);
      expect(controlOwnsKey(element(html), key("Enter"))).toBe(true);
      for (const k of ["b", "3", "Escape", "?", "ArrowUp"]) expect(controlOwnsKey(element(html), key(k)), `${html} ${k}`).toBe(false);
    }
  });

  it("lets sliders keep their arrow and edge keys only", () => {
    for (const html of ['<input type="range">', '<div role="slider"></div>']) {
      for (const k of ["ArrowUp", "ArrowLeft", "Home", "End", "PageDown"]) expect(controlOwnsKey(element(html), key(k))).toBe(true);
      for (const k of ["b", "3", " ", "Escape"]) expect(controlOwnsKey(element(html), key(k)), `${html} ${k}`).toBe(false);
    }
  });

  it("lets links keep Enter and applies to nested targets and plain elements", () => {
    expect(controlOwnsKey(element('<a href="#x"></a>'), key("Enter"))).toBe(true);
    expect(controlOwnsKey(element('<a href="#x"></a>'), key("b"))).toBe(false);
    const nested = element("<button><span>x</span></button>").firstElementChild!;
    expect(controlOwnsKey(nested, key(" ", "Space"))).toBe(true);
    expect(controlOwnsKey(nested, key("b"))).toBe(false);
    expect(controlOwnsKey(element('<div contenteditable="false"></div>'), key("b"))).toBe(false);
    expect(controlOwnsKey(element("<p></p>"), key("b"))).toBe(false);
    expect(controlOwnsKey(null, key("b"))).toBe(false);
  });
});
