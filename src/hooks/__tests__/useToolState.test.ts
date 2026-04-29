// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToolState } from "../useToolState";

describe("useToolState", () => {
  it("exposes the default drawing tools", () => {
    const { result } = renderHook(() => useToolState());

    expect(result.current).toMatchObject({
      tool: "brush",
      brushLevel: 7,
      brushSize: 12,
      glazeTool: "glaze_brush",
    });
  });

  it("updates the selected tool state through React setters", () => {
    const { result } = renderHook(() => useToolState());
    act(() => {
      result.current.setTool("eraser");
      result.current.setBrushLevel(3);
      result.current.setBrushSize(24);
      result.current.setGlazeTool("glaze_fill");
    });

    expect(result.current.tool).toBe("eraser");
    expect(result.current.brushLevel).toBe(3);
    expect(result.current.brushSize).toBe(24);
    expect(result.current.glazeTool).toBe("glaze_fill");
  });
});
