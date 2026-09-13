export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const register = async () => {
    try {
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
      const swUrl = new URL("sw.js", baseUrl);
      // Let updates activate naturally after all existing app clients close.
      await navigator.serviceWorker.register(swUrl);
    } catch (err) {
      console.warn("CHROMALUM: service worker registration failed", err);
    }
  };

  if (document.readyState === "complete") {
    void register();
  } else {
    window.addEventListener("load", () => void register(), { once: true });
  }
}
