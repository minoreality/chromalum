// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MAX_FILE_BYTES } from "../../constants";
import { useFileDrop } from "../useFileDrop";
import type { CanvasAction } from "../../types";

const t = ((key: string, ...params: (string | number)[]) =>
  params.length ? `${key}:${params.join(",")}` : key) as import("../../i18n").TranslationFn;

function makeFile(type: string, size = 4, name = "image.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeLargeImageFile(): File {
  return new File([new Uint8Array(MAX_FILE_BYTES + 1)], "huge.png", { type: "image/png" });
}

function installImageBitmap(width = 3, height = 2) {
  const close = vi.fn();
  const bitmap = { width, height, close } as unknown as ImageBitmap;
  const createImageBitmap = vi.fn().mockResolvedValue(bitmap);
  Object.defineProperty(window, "createImageBitmap", { value: createImageBitmap, configurable: true, writable: true });
  return { bitmap, close, createImageBitmap };
}

class AutoLoadImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 3;
  height = 2;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function setup(onCropRequest?: (img: HTMLImageElement, w: number, h: number) => void) {
  const dispatch = vi.fn<React.Dispatch<CanvasAction>>();
  const setZoom = vi.fn<React.Dispatch<React.SetStateAction<number>>>();
  const setPan = vi.fn<React.Dispatch<React.SetStateAction<{ x: number; y: number }>>>();
  const showToast = vi.fn<(message: string, type: "error" | "success" | "info") => void>();
  const announce = vi.fn<(msg: string) => void>();
  const hook = renderHook(() => useFileDrop(dispatch, setZoom, setPan, showToast, announce, t, onCropRequest));
  return { ...hook, dispatch, setZoom, setPan, showToast, announce };
}

describe("useFileDrop", () => {
  const originalImage = window.Image;

  beforeEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "createImageBitmap");
  });

  afterEach(() => {
    window.Image = originalImage;
  });

  it("ignores unsupported image types without user-visible side effects", async () => {
    const { result, dispatch, setZoom, setPan, showToast } = setup();

    await act(async () => {
      await result.current.loadImg(makeFile("text/plain", 8, "note.txt"));
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(setZoom).not.toHaveBeenCalled();
    expect(setPan).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("rejects files above the size limit before decoding", async () => {
    const { result, dispatch, showToast } = setup();

    await act(async () => {
      await result.current.loadImg(makeLargeImageFile());
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("toast_image_too_large", "error");
  });

  it("loads a supported image into canvas state and resets pan/zoom", async () => {
    const { close, createImageBitmap } = installImageBitmap(3, 2);
    const { result, dispatch, setZoom, setPan, showToast } = setup();

    await act(async () => {
      await result.current.loadImg(makeFile("image/png"));
    });

    expect(createImageBitmap).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0] as CanvasAction;
    expect(action.type).toBe("load_image");
    if (action.type === "load_image") {
      expect(action.w).toBe(3);
      expect(action.h).toBe(2);
      expect(action.data).toBeInstanceOf(Uint8Array);
      expect(action.data).toHaveLength(6);
    }
    expect(setZoom).toHaveBeenCalledWith(1);
    expect(setPan).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("routes decoded images to crop request without dispatching a canvas load", async () => {
    installImageBitmap(4, 3);
    window.Image = AutoLoadImage as unknown as typeof Image;
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,ok");
    const onCropRequest = vi.fn<(img: HTMLImageElement, w: number, h: number) => void>();
    const { result, dispatch, setZoom, setPan } = setup(onCropRequest);

    await act(async () => {
      await result.current.loadImg(makeFile("image/png"));
    });

    expect(onCropRequest).toHaveBeenCalledTimes(1);
    expect(onCropRequest.mock.calls[0][1]).toBe(4);
    expect(onCropRequest.mock.calls[0][2]).toBe(3);
    expect(dispatch).not.toHaveBeenCalled();
    expect(setZoom).not.toHaveBeenCalled();
    expect(setPan).not.toHaveBeenCalled();
  });

  it("reports processing failure when the canvas context cannot be created", async () => {
    installImageBitmap(3, 2);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { result, dispatch, showToast } = setup();

    await act(async () => {
      await result.current.loadImg(makeFile("image/png"));
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("toast_image_process_failed", "error");
  });
});
