// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAutomataBoard } from "../useAutomataBoard";

afterEach(() => vi.unstubAllGlobals());

it("ignores an obsolete calculation when returning to the editable image", () => {
  const replies: Array<(event: MessageEvent<Uint8Array>) => void> = [];
  vi.stubGlobal(
    "Worker",
    class {
      onmessage: ((event: MessageEvent<Uint8Array>) => void) | null = null;
      postMessage() {
        replies.push(this.onmessage!);
      }
      terminate() {}
    },
  );
  const seed = new Uint8Array(320 * 180);
  const { result, rerender } = renderHook(({ time }) => useAutomataBoard(seed, 320, 180, time, 4, true), { initialProps: { time: 1 } });
  expect(result.current.pending).toBe(true);
  rerender({ time: 0 });
  expect(result.current.board).toBe(seed);
  act(() => replies[0](new MessageEvent("message", { data: new Uint8Array(seed.length).fill(7) })));
  expect(result.current.board).toBe(seed);
  expect(result.current.pending).toBe(false);
});
