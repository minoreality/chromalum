const UPDATE_CHECK_INTERVAL = 5 * 60_000;

export function registerServiceWorker(onUpdate: (worker: ServiceWorker | null) => void, signal: AbortSignal): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const register = async () => {
    try {
      const workers = navigator.serviceWorker;
      let pageController = workers.controller;
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
      const registration = await workers.register(new URL("sw.js", baseUrl), { updateViaCache: "none" });
      if (signal.aborted) return;

      const sync = () => {
        const controller = workers.controller;
        // The first installation claims its own page. A later change means
        // another tab may already have activated an update for this page.
        pageController ??= controller;
        onUpdate(controller ? (registration.waiting ?? (controller !== pageController ? controller : null)) : null);
      };
      const watchInstalling = () => {
        registration.installing?.addEventListener("statechange", sync, { signal });
        sync();
      };
      registration.addEventListener("updatefound", watchInstalling, { signal });
      workers.addEventListener("controllerchange", sync, { signal });
      watchInstalling();
      workers.controller?.postMessage({ type: "RELEASE_UNUSED_CACHES" });

      const check = () => {
        if (navigator.onLine && !registration.installing) {
          // A failed network check leaves the current version available offline.
          void registration.update().catch(() => {});
        }
      };
      const checkWhenVisible = () => {
        if (document.visibilityState === "visible") check();
      };
      window.addEventListener("online", check, { signal });
      document.addEventListener("visibilitychange", checkWhenVisible, { signal });
      const timer = window.setInterval(checkWhenVisible, UPDATE_CHECK_INTERVAL);
      signal.addEventListener("abort", () => window.clearInterval(timer), { once: true });
      if (registration.active) checkWhenVisible();
    } catch (err) {
      console.warn("CHROMALUM: service worker registration failed", err);
      if (!signal.aborted) window.addEventListener("online", register, { once: true, signal });
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", register, { once: true, signal });
}

export async function activateUpdate(worker: ServiceWorker): Promise<void> {
  const workers = navigator.serviceWorker;
  if (workers.controller === worker) return;

  const listeners = new AbortController();
  let timer: number | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (workers.controller === worker) resolve();
        else if (worker.state === "redundant") reject(new Error("The update was superseded"));
      };
      workers.addEventListener("controllerchange", check, { signal: listeners.signal });
      worker.addEventListener("statechange", check, { signal: listeners.signal });
      timer = window.setTimeout(() => reject(new Error("The update did not activate")), 15_000);
      check();
      worker.postMessage({ type: "SKIP_WAITING" });
    });
  } finally {
    listeners.abort();
    window.clearTimeout(timer);
  }
}
