// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { drawPlane } from "../render";
import { getPlaneGeometry } from "../geometry";

it("renders a rectangular plane as opaque exact GRB pixels", () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const put = vi.spyOn(ctx, "putImageData");
  drawPlane(ctx, Uint8Array.from([0, 1, 2, 3, 4, 7]), getPlaneGeometry(3, 1, { width: 3, height: 2 }), { x: 1, y: 1 });
  expect([canvas.width, canvas.height]).toEqual([3, 2]);
  expect(put).toHaveBeenCalled();
  expect(Array.from(put.mock.calls[0][0].data)).toEqual([
    0, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 255, 0, 255, 255, 0, 255, 0, 255, 255, 255, 255, 255,
  ]);
});
