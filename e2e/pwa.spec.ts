import { readFile, readdir } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

interface AppManifestResponse {
  errors?: unknown[];
  manifest?: {
    id?: string;
  };
}

interface InstallabilityErrorsResponse {
  installabilityErrors?: unknown[];
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
});

test.describe("lazy chunk recovery", () => {
  test.use({ serviceWorkers: "block" });

  for (const panel of ["Music", "Theory"]) {
    test(`reloads the ${panel} chunk after a failed load`, async ({ page }) => {
      let failLoad = true;
      let chunkRequests = 0;
      await page.route(new RegExp(`/assets/${panel}Panel-[^/]+\\.js$`), async (route) => {
        chunkRequests++;
        if (failLoad) await route.abort("failed");
        else await route.continue();
      });

      await page.goto(`./#${panel.toLowerCase()}`);
      const errorHeading = page.getByRole("heading", { name: "An error occurred" });
      await expect(errorHeading).toBeVisible();
      expect(chunkRequests).toBe(1);
      const reload = page.getByRole("button", { name: "Reload page", exact: true });
      await expect(reload).toBeVisible({ timeout: 3000 });

      failLoad = false;
      await reload.click();
      await expect(
        page.getByRole("heading", { name: panel === "Music" ? "CHROMATIC MUSIC" : "Discrete Algebraic Color Theory", exact: true }),
      ).toBeVisible();
      await expect(errorHeading).toHaveCount(0);
      expect(chunkRequests).toBe(2);
    });
  }
});

test("pre-caches the production app shell and works offline", async ({ page, context }) => {
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBe("/chromalum/manifest.webmanifest");

  const manifestUrl = new URL(manifestHref!, page.url()).toString();
  const manifestResponse = await page.request.get(manifestUrl);
  expect(manifestResponse.status()).toBe(200);

  const manifest = (await manifestResponse.json()) as {
    id: string;
    orientation: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };
  expect(manifest.id).toBe("chromalum/");
  expect(manifest.orientation).toBe("portrait-primary");

  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(new URL(icon.src, manifestUrl).toString());
    expect(iconResponse.status(), `${icon.src} should be served`).toBe(200);
    expect(iconResponse.headers()["content-type"], `${icon.src} content type`).toContain(icon.type);
  }
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "icon-192.png", sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ src: "icon-512.png", sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ src: "icon-maskable-512.png", sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(
    async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const cacheKeys = await caches.keys();
      return registrations.length > 0 && cacheKeys.some((key) => key.startsWith("chromalum-precache-"));
    },
    null,
    { timeout: 10_000 },
  );

  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: "networkidle" });
  }

  const swInfo = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheKeys = await caches.keys();
    const precacheKey = cacheKeys.find((key) => key.startsWith("chromalum-precache-"));
    const cachedPaths = precacheKey
      ? await caches
          .open(precacheKey)
          .then((cache) => cache.keys())
          .then((requests) => requests.map((request) => new URL(request.url).pathname))
      : [];

    return {
      controlled: !!navigator.serviceWorker.controller,
      registrationScopes: registrations.map((registration) => registration.scope),
      cacheKeys,
      cachedPaths,
    };
  });

  expect(swInfo.controlled).toBe(true);
  expect(swInfo.registrationScopes).toContain("http://127.0.0.1:4174/chromalum/");
  expect(swInfo.cacheKeys.some((key) => key.startsWith("chromalum-precache-"))).toBe(true);
  expect(swInfo.cachedPaths).toEqual(
    expect.arrayContaining([
      "/chromalum/",
      "/chromalum/index.html",
      "/chromalum/manifest.webmanifest",
      "/chromalum/icon-192.png",
      "/chromalum/icon-512.png",
      "/chromalum/icon-maskable-512.png",
    ]),
  );
  // The social card is fetched from its absolute og:image URL by crawlers that
  // never run a service worker, so precaching it would cost every install and
  // every update 171 KB for nothing the app can use.
  expect(swInfo.cachedPaths.some((path) => path.endsWith("/og-image.png"))).toBe(false);
  expect(swInfo.cachedPaths.some((path) => /\/assets\/MusicPanel-.+\.js$/.test(path))).toBe(true);
  expect(swInfo.cachedPaths.some((path) => /\/assets\/TheoryPanel-.+\.js$/.test(path))).toBe(true);
  expect(swInfo.cachedPaths.some((path) => /\/assets\/flood-fill\.worker-.+\.js$/.test(path))).toBe(true);
  expect(swInfo.cachedPaths.some((path) => /\/assets\/pixel-analysis\.worker-.+\.js$/.test(path))).toBe(true);

  const cdp = await context.newCDPSession(page);
  const appManifest = (await cdp.send("Page.getAppManifest")) as AppManifestResponse;
  const installability = (await cdp.send("Page.getInstallabilityErrors")) as InstallabilityErrorsResponse;
  expect(appManifest.errors ?? []).toHaveLength(0);
  expect(appManifest.manifest?.id).toBe("http://127.0.0.1:4174/chromalum/");
  expect(installability.installabilityErrors ?? []).toHaveLength(0);

  await context.setOffline(true);
  const offlineReloadResponse = await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
  expect(offlineReloadResponse?.status()).toBe(200);

  await page.getByRole("tab", { name: "Theory" }).click();
  await expect(page.getByRole("heading", { name: "Discrete Algebraic Color Theory" })).toBeVisible();

  await page.getByRole("tab", { name: "Music" }).click();
  await expect(page.getByRole("heading", { name: "CHROMATIC MUSIC" })).toBeVisible();
});

type UpdateMode = "complete" | "failed" | "held";

async function readBuildFiles(dir: URL, prefix = ""): Promise<Array<[string, Buffer]>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<Array<[string, Buffer]>> => {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) return readBuildFiles(new URL(`${entry.name}/`, dir), `${name}/`);
      return [[name, await readFile(new URL(entry.name, dir))]];
    }),
  );
  return files.flat();
}

async function startUpdateServer() {
  const files = await readBuildFiles(new URL("../dist/", import.meta.url));
  const builds = new Map<string, Map<string, Buffer>>();
  // Exercise the generated worker unchanged, with two disjoint sets of asset
  // URLs. Changing only the HTML would let v2 reuse v1's lazy chunks and hide
  // the update bug. No extra production build or checked-in hashes are needed.
  for (const version of ["v1", "v2"]) {
    const assetNames = files
      .filter(([name]) => name.startsWith("assets/"))
      .map(([name]) => {
        const oldName = name.slice("assets/".length);
        const extension = extname(oldName);
        return [oldName, `${oldName.slice(0, -extension.length)}-${version}${extension}`] as const;
      });
    const build = new Map<string, Buffer>();
    for (const [name, bytes] of files) {
      let path = name;
      let body = bytes;
      if ([".js", ".css", ".html", ".json", ".webmanifest", ".svg"].includes(extname(name))) {
        let source = bytes.toString("utf8");
        for (const [oldName, newName] of assetNames) source = source.replaceAll(oldName, newName);
        if (name === "sw.js") {
          source = source.replace(/(\$\{CACHE_PREFIX\}-(?:precache|runtime)-)[^`]+/g, `$1fixture-${version}`);
        }
        if (name === "index.html") source = source.replace("<html", `<html data-build-version="${version}"`);
        body = Buffer.from(source);
      }
      for (const [oldName, newName] of assetNames) path = path.replaceAll(oldName, newName);
      build.set(`/chromalum/${path}`, body);
    }
    build.set("/chromalum/", build.get("/chromalum/index.html")!);
    builds.set(version, build);
  }

  let version = "v1";
  let mode: UpdateMode = "complete";
  let offline = false;
  const heldResponses = new Set<ServerResponse>();
  const contentTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
  };
  const server = createServer((request, response) => {
    if (offline) {
      request.socket.destroy();
      return;
    }
    const pathname = new URL(request.url!, "http://localhost").pathname;
    response.setHeader("Cache-Control", "no-store");
    if (pathname === "/observer.html") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<!doctype html><title>Outside the app scope</title>");
      return;
    }
    if (version === "v2" && /\/MusicPanel-.*-v2\.js$/.test(pathname)) {
      if (mode === "failed") {
        response.writeHead(503);
        response.end("Interrupted update");
        return;
      }
      if (mode === "held") {
        heldResponses.add(response);
        response.on("close", () => heldResponses.delete(response));
        return;
      }
    }
    const body = builds.get(version)!.get(pathname);
    response.writeHead(body ? 200 : 404, {
      "Content-Type": contentTypes[extname(pathname) || ".html"] ?? "application/octet-stream",
    });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral HTTP port");
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    url: `${origin}/chromalum/`,
    publishUpdate(nextMode: UpdateMode) {
      version = "v2";
      mode = nextMode;
    },
    heldRequestCount: () => heldResponses.size,
    setOffline(value: boolean) {
      offline = value;
      if (value) for (const response of heldResponses) response.destroy();
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

async function openControlledBuild(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!navigator.serviceWorker.controller && registration?.active?.state === "activated";
  });
  await expect(page.locator("html")).toHaveAttribute("data-build-version", "v1");
}

async function requestUpdate(page: Page, expectedState: ServiceWorkerState) {
  await page.evaluate(async (state) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("The initial build must be registered");
    const reachedState = new Promise<void>((resolve) => {
      registration.addEventListener(
        "updatefound",
        () => {
          const worker = registration.installing!;
          const check = () => {
            if (worker.state === state) resolve();
          };
          worker.addEventListener("statechange", check);
          check();
        },
        { once: true },
      );
    });
    await registration.update();
    await reachedState;
  }, expectedState);
}

async function expectMusicNotLoaded(page: Page) {
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some((entry) => /\/MusicPanel-/.test(entry.name)))).toBe(false);
}

for (const mode of ["failed", "held"] as const) {
  test(`keeps the active app usable offline when the next precache is ${mode}`, async ({ page, context }) => {
    const server = await startUpdateServer();
    try {
      await openControlledBuild(page, server.url);
      await expectMusicNotLoaded(page);
      server.publishUpdate(mode);
      await requestUpdate(page, mode === "failed" ? "redundant" : "installing");
      if (mode === "held") await expect.poll(server.heldRequestCount).toBeGreaterThan(0);

      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-build-version", "v1");
      await expectMusicNotLoaded(page);
      server.setOffline(true);
      await context.setOffline(true);
      await page.getByRole("tab", { name: "Music", exact: true }).click();
      await expect(page.getByRole("heading", { name: "CHROMATIC MUSIC" })).toBeVisible();

      // An uncached navigation with a query string must use the same shell,
      // including when no network fallback is possible.
      const response = await page.goto(`${server.url}offline-route?update=interrupted`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("data-build-version", "v1");
      await page.getByRole("tab", { name: "Music", exact: true }).click();
      await expect(page.getByRole("heading", { name: "CHROMATIC MUSIC" })).toBeVisible();
    } finally {
      await server.close();
    }
  });
}

test("uses a completed update only after every previous app client closes", async ({ page, context }) => {
  const server = await startUpdateServer();
  try {
    await openControlledBuild(page, server.url);
    const otherClient = await context.newPage();
    await openControlledBuild(otherClient, server.url);
    server.publishUpdate("complete");
    await requestUpdate(page, "installed");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-build-version", "v1");
    await expectMusicNotLoaded(page);

    server.setOffline(true);
    await context.setOffline(true);
    await page.getByRole("tab", { name: "Music", exact: true }).click();
    await expect(page.getByRole("heading", { name: "CHROMATIC MUSIC" })).toBeVisible();

    server.setOffline(false);
    await context.setOffline(false);
    const observer = await context.newPage();
    await observer.goto(`${server.origin}/observer.html`);
    await page.close();
    expect(await observer.evaluate(async () => (await navigator.serviceWorker.getRegistration("/chromalum/"))?.waiting?.state)).toBe(
      "installed",
    );
    await otherClient.close();
    await observer.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/chromalum/");
      return registration?.active?.state === "activated" && !registration.waiting;
    });

    const nextVisit = await context.newPage();
    await nextVisit.goto(`${server.url}#source`);
    await expect(nextVisit.locator("html")).toHaveAttribute("data-build-version", "v2");
    await expectMusicNotLoaded(nextVisit);
    server.setOffline(true);
    await context.setOffline(true);
    await nextVisit.reload();
    await expect(nextVisit.locator("html")).toHaveAttribute("data-build-version", "v2");
    await nextVisit.getByRole("tab", { name: "Music", exact: true }).click();
    await expect(nextVisit.getByRole("heading", { name: "CHROMATIC MUSIC" })).toBeVisible();
  } finally {
    await server.close();
  }
});
