// @vitest-environment jsdom
import { ComponentProps, ReactNode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LEVEL_CANDIDATES } from "../../color-engine";
import { LanguageProvider } from "../../i18n";
import { GlazeCandidateGrid, type GlazeLevelPreview } from "../GlazeCandidateGrid";

type GridProps = ComponentProps<typeof GlazeCandidateGrid>;

function renderWithLanguage(node: ReactNode) {
  localStorage.setItem("chromalum_lang", "en");
  return render(<LanguageProvider>{node}</LanguageProvider>);
}

function makeLevelPreview(levelIndex: number): GlazeLevelPreview {
  const candidate = LEVEL_CANDIDATES[levelIndex][0];
  return {
    levelIndex,
    name: `L${levelIndex}`,
    rgb: candidate.rgb,
    hex: `rgb(${candidate.rgb.join(",")})`,
  };
}

function makeProps(overrides: Partial<GridProps> = {}): GridProps {
  return {
    levelPreview: [makeLevelPreview(2)],
    hueAngleDeg: 0,
    candidateOverridesByLevel: new Map(),
    selectedLevels: new Set(),
    hoveredCandidate: null,
    onCandidateOverridesByLevelChange: vi.fn(),
    onSelectedLevelsChange: vi.fn(),
    onHoveredCandidateChange: vi.fn(),
    ...overrides,
  };
}

describe("GlazeCandidateGrid", () => {
  it("routes candidate swatch click and keyboard selection", () => {
    const props = makeProps();
    renderWithLanguage(<GlazeCandidateGrid {...props} />);

    const swatches = screen.getAllByRole("button", { name: /Level 2/ });
    fireEvent.click(swatches[0]);
    expect(props.onCandidateOverridesByLevelChange).toHaveBeenCalledTimes(1);
    expect(props.onSelectedLevelsChange).toHaveBeenCalledTimes(1);
    expect(props.onHoveredCandidateChange).toHaveBeenCalledWith(null);

    fireEvent.keyDown(swatches[2], { key: "Enter" });
    expect(props.onCandidateOverridesByLevelChange).toHaveBeenCalledTimes(2);
    expect(props.onSelectedLevelsChange).toHaveBeenCalledTimes(2);
  });

  it("toggles the main swatch selected state", () => {
    const props = makeProps({
      candidateOverridesByLevel: new Map([[2, 0]]),
      selectedLevels: new Set([2]),
    });
    renderWithLanguage(<GlazeCandidateGrid {...props} />);

    const selected = screen.getByRole("button", { name: /Level 2/, pressed: true });
    fireEvent.click(selected);

    expect(props.onSelectedLevelsChange).toHaveBeenCalledTimes(1);
    expect(props.onCandidateOverridesByLevelChange).toHaveBeenCalledTimes(1);
  });

  it("cycles candidates with wheel input while preventing page scrolling", () => {
    const props = makeProps();
    renderWithLanguage(<GlazeCandidateGrid {...props} />);

    const mainSwatch = screen.getAllByRole("button", { name: /Level 2/ })[1];
    const event = new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true });
    fireEvent(mainSwatch, event);

    expect(event.defaultPrevented).toBe(true);
    expect(props.onCandidateOverridesByLevelChange).toHaveBeenCalledTimes(1);
    expect(props.onHoveredCandidateChange).toHaveBeenCalledWith({ levelIndex: 2, candidateIndex: expect.any(Number) });
  });

  it("leaves wheel scrolling available on levels without alternative candidates", () => {
    const props = makeProps({ levelPreview: [makeLevelPreview(0)] });
    const { container } = renderWithLanguage(<GlazeCandidateGrid {...props} />);
    const event = new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true });
    fireEvent(container.querySelector('[style*="touch-action"]')!, event);

    expect(event.defaultPrevented).toBe(false);
    expect(props.onCandidateOverridesByLevelChange).not.toHaveBeenCalled();
  });

  it("advances from the latest candidate on consecutive wheel events", () => {
    const props = makeProps();
    function ControlledGrid() {
      const [overrides, setOverrides] = useState(new Map([[2, 0]]));
      return (
        <>
          <GlazeCandidateGrid {...props} candidateOverridesByLevel={overrides} onCandidateOverridesByLevelChange={setOverrides} />
          <output aria-label="Selected candidate">{overrides.get(2)}</output>
        </>
      );
    }
    renderWithLanguage(<ControlledGrid />);
    const swatch = screen.getAllByRole("button", { name: /Level 2/ })[1];
    const selected = screen.getByLabelText("Selected candidate");

    fireEvent.wheel(swatch, { deltaY: 1 });
    expect(selected.textContent).toBe("1");
    fireEvent.wheel(swatch, { deltaY: 1 });
    expect(selected.textContent).toBe("2");
    fireEvent.wheel(swatch, { deltaY: -1 });
    expect(selected.textContent).toBe("1");
  });
});
