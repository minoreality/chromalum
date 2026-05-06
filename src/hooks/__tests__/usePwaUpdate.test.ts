// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PWA_UPDATE_READY_EVENT } from "../../pwa";
import { usePwaUpdate } from "../usePwaUpdate";

function dispatchUpdate(registration: ServiceWorkerRegistration): void {
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT, { detail: { registration } }));
}

function installServiceWorkerMock() {
  const target = new EventTarget();
  const addEventListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      target.addEventListener(type, listener, options);
    },
  );

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { addEventListener },
  });

  return { target, addEventListener };
}

describe("usePwaUpdate", () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("posts SKIP_WAITING and reloads once on controllerchange", () => {
    vi.useFakeTimers();
    const { target, addEventListener } = installServiceWorkerMock();
    const reloadWindow = vi.fn();
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const registration = { waiting } as unknown as ServiceWorkerRegistration;
    const { result } = renderHook(() => usePwaUpdate(reloadWindow));

    act(() => dispatchUpdate(registration));
    expect(result.current.hasUpdate).toBe(true);

    act(() => result.current.reload());

    expect(result.current.reloading).toBe(true);
    expect(addEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function), { once: true });
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });

    act(() => {
      target.dispatchEvent(new Event("controllerchange"));
    });
    expect(reloadWindow).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });

  it("reloads after the timeout when controllerchange does not arrive", () => {
    vi.useFakeTimers();
    installServiceWorkerMock();
    const reloadWindow = vi.fn();
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const registration = { waiting } as unknown as ServiceWorkerRegistration;
    const { result } = renderHook(() => usePwaUpdate(reloadWindow));

    act(() => dispatchUpdate(registration));
    act(() => result.current.reload());

    expect(reloadWindow).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(reloadWindow).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });

  it("falls back to a direct reload when no waiting worker is available", () => {
    const reloadWindow = vi.fn();
    const registration = { waiting: null } as unknown as ServiceWorkerRegistration;
    const { result } = renderHook(() => usePwaUpdate(reloadWindow));

    act(() => dispatchUpdate(registration));
    act(() => result.current.reload());

    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });
});
