import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import {
  SAVED_STATE_VERSION,
  saveState,
  loadState,
  loadStateWithStatus,
  checkStorageQuota,
  requestPersistentStorage,
  resetPersistenceConnectionForTests,
  SaveConflictError,
  recoverInvalidState,
} from "../idb-persistence";
import type { SavedState } from "../idb-persistence";

/**
 * Tests for IndexedDB persistence.
 * Uses fake-indexeddb for realistic IDB testing.
 */

function makeState(overrides?: Partial<SavedState>): SavedState {
  return {
    width: 4,
    height: 4,
    levelData: new Uint8Array(16),
    candidateIndexByLevel: [0, 0, 0, 0, 0, 0, 0, 0],
    version: SAVED_STATE_VERSION,
    revision: 0,
    ...overrides,
  };
}

function makeLegacyState(raw: unknown): SavedState {
  return raw as SavedState;
}

// Reset the IDB between tests by clearing the cached connection
const originalStorage = navigator.storage;

function deleteTestDb(): Promise<void> {
  resetPersistenceConnectionForTests();
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("chromalum");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("deleteDatabase blocked"));
  });
}

beforeEach(async () => {
  await deleteTestDb();
});

afterEach(() => {
  resetPersistenceConnectionForTests();
  Object.defineProperty(navigator, "storage", { configurable: true, value: originalStorage });
});

describe("idb-persistence error handling", () => {
  it("QuotaExceededError is detected by name", () => {
    const err = new DOMException("Quota exceeded", "QuotaExceededError");
    expect(err.name).toBe("QuotaExceededError");
    const isQuota = err && err.name === "QuotaExceededError";
    expect(isQuota).toBe(true);
  });

  it("other DOMException names are not quota errors", () => {
    const err = new DOMException("Read only", "ReadOnlyError");
    const isQuota = err && err.name === "QuotaExceededError";
    expect(isQuota).toBe(false);
  });
});

describe("saveState / loadState roundtrip", () => {
  it("save then load returns identical data", async () => {
    const state = makeState({ levelData: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]) });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.width).toBe(4);
    expect(loaded!.height).toBe(4);
    expect(Array.from(loaded!.levelData)).toEqual(Array.from(state.levelData));
    expect(loaded!.candidateIndexByLevel).toEqual(state.candidateIndexByLevel);
    expect(loaded!.version).toBe(SAVED_STATE_VERSION);
    expect(loaded!.revision).toBe(1);
  });

  it("save with pixelCandidateOverrideMap then load preserves pixelCandidateOverrideMap", async () => {
    const cm = new Uint8Array(16);
    cm[0] = 2;
    cm[5] = 3;
    const state = makeState({ pixelCandidateOverrideMap: cm });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.pixelCandidateOverrideMap).toBeDefined();
    expect(loaded!.pixelCandidateOverrideMap![0]).toBe(2);
    expect(loaded!.pixelCandidateOverrideMap![5]).toBe(3);
  });

  it("save with locked array preserves it", async () => {
    const state = makeState({ lockedLevels: [true, false, true, false, false, false, false, true] });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.lockedLevels).toEqual([true, false, true, false, false, false, false, true]);
  });

  it("atomically rejects a stale revision without overwriting newer work", async () => {
    const firstRevision = await saveState(makeState({ width: 8, height: 8, levelData: new Uint8Array(64) }), {
      expectedRevision: 0,
    });
    expect(firstRevision).toBe(1);

    await expect(
      saveState(makeState({ width: 16, height: 16, levelData: new Uint8Array(256) }), { expectedRevision: 0 }),
    ).rejects.toBeInstanceOf(SaveConflictError);

    const afterConflict = await loadState();
    expect(afterConflict?.width).toBe(8);
    expect(afterConflict?.height).toBe(8);
    expect(afterConflict?.revision).toBe(1);

    const secondRevision = await saveState(makeState({ width: 4, height: 4, levelData: new Uint8Array(16), revision: firstRevision }), {
      expectedRevision: firstRevision,
    });
    expect(secondRevision).toBe(2);
  });
});

describe("recoverInvalidState", () => {
  async function openRecords() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chromalum", 2);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function seedRecord(db: IDBDatabase, value: unknown) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(value, "current");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  }

  async function records(db: IDBDatabase) {
    return new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction("state", "readonly").objectStore("state").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  it.each([
    {
      label: "unsupported",
      raw: {
        version: SAVED_STATE_VERSION + 1,
        width: 1,
        height: 1,
        levelData: new Uint8Array([5]),
        candidateIndexByLevel: new Array(8).fill(0),
        extra: "keep me",
      },
    },
    { label: "malformed", raw: { width: 9, height: 8, revision: 7, levelData: new Uint8Array([2]) } },
    { label: "null", raw: null },
    { label: "undefined", raw: undefined },
  ])("archives the exact $label record and saves current work atomically", async ({ raw }) => {
    const db = await openRecords();
    try {
      await seedRecord(db, raw);
      const state = makeState({ levelData: new Uint8Array(16).fill(3) });
      const revision = await recoverInvalidState(state);
      expect(revision).toBe(raw && "revision" in raw ? 8 : 1);
      expect(await loadState()).toMatchObject({ ...state, revision });
      const stored = await records(db);
      expect(stored).toHaveLength(2);
      expect(stored).toContainEqual({ value: raw, archivedAt: expect.any(Number) });
      await saveState(makeState({ levelData: new Uint8Array(16).fill(6) }), { expectedRevision: revision });
      expect((await loadState())?.levelData[0]).toBe(6);
      expect(await records(db)).toContainEqual({ value: raw, archivedAt: expect.any(Number) });
    } finally {
      db.close();
    }
  });

  it("refuses recovery after another tab replaces the invalid record with valid work", async () => {
    const db = await openRecords();
    try {
      await seedRecord(db, null);
      await saveState(makeState({ levelData: new Uint8Array(16).fill(5) }));
      await expect(recoverInvalidState(makeState())).rejects.toHaveProperty("name", "SaveConflictError");
      expect((await loadState())?.levelData[0]).toBe(5);
      expect(await records(db)).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it("leaves the original record intact if writing the replacement aborts", async () => {
    const db = await openRecords();
    try {
      const raw = { unsupported: "original" };
      await seedRecord(db, raw);
      // An uncloneable replacement makes the real IDB transaction fail after the archive is queued.
      const uncloneable = { ...makeState(), extra: () => {} };
      await expect(recoverInvalidState(uncloneable)).rejects.toBeTruthy();
      expect(await records(db)).toEqual([raw]);
    } finally {
      db.close();
    }
  });
});

describe("loadState validation", () => {
  it("returns null for empty DB", async () => {
    const loaded = await loadState();
    expect(loaded).toBeNull();
  });

  it("reports empty status for empty DB", async () => {
    await expect(loadStateWithStatus()).resolves.toEqual({ status: "empty", state: null });
  });

  it("clamps pixel data > 7 to valid range", async () => {
    const data = new Uint8Array(16);
    data[0] = 15; // should become 15 & 7 = 7
    data[1] = 8; // should become 8 & 7 = 0
    data[2] = 255; // should become 255 & 7 = 7
    const state = makeState({ levelData: data });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.levelData[0]).toBe(7);
    expect(loaded!.levelData[1]).toBe(0);
    expect(loaded!.levelData[2]).toBe(7);
  });

  it("clamps negative candidateIndexByLevel values to 0", async () => {
    const state = makeState({ candidateIndexByLevel: [-1, 0, -5, 3, 0, 0, 0, 0] });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.candidateIndexByLevel[0]).toBe(0);
    expect(loaded!.candidateIndexByLevel[2]).toBe(0);
    expect(loaded!.candidateIndexByLevel[3]).toBe(3);
  });

  it("loads legacy v1 cc as candidateIndexByLevel", async () => {
    await saveState(
      makeLegacyState({
        w: 4,
        h: 4,
        data: new Uint8Array(16),
        cc: [0, 1, 2, 3, 0, 1, 2, 0],
        version: 1,
      }),
    );

    const loaded = await loadState();

    expect(loaded).not.toBeNull();
    expect(loaded!.candidateIndexByLevel).toEqual([0, 1, 2, 3, 0, 1, 2, 0]);
    expect(loaded!.revision).toBe(1);
    expect("cc" in loaded!).toBe(false);
  });

  it("strips locked array of wrong length", async () => {
    const state = makeState({ lockedLevels: [true, false, true] as unknown as boolean[] });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.lockedLevels).toBeUndefined();
  });

  it("strips pixelCandidateOverrideMap of wrong length", async () => {
    const state = makeState({ pixelCandidateOverrideMap: new Uint8Array(5) }); // should be 16
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.pixelCandidateOverrideMap).toBeUndefined();
  });

  it("accepts persisted canvas dimensions up to 2048 per side", async () => {
    const state = makeState({ width: 2048, height: 1, levelData: new Uint8Array(2048) });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.width).toBe(2048);
    expect(loaded!.height).toBe(1);
  });

  it("rejects persisted canvas dimensions above 2048 per side", async () => {
    const state = makeState({ width: 2049, height: 1, levelData: new Uint8Array(2049) });
    await saveState(state);
    const loaded = await loadState();
    expect(loaded).toBeNull();
  });

  it("reports invalid status for unsupported saved-state versions", async () => {
    const state = makeState({ version: SAVED_STATE_VERSION + 1 });
    await saveState(state);

    const result = await loadStateWithStatus();

    expect(result.status).toBe("invalid");
    expect(result.state).toBeNull();
    expect(result.reason).toContain("newer than supported");
    await expect(loadState()).resolves.toBeNull();
  });

  it("reports invalid status for corrupted persisted shapes", async () => {
    const state = makeState({ candidateIndexByLevel: [0, 0, 0] as unknown as number[] });
    await saveState(state);

    const result = await loadStateWithStatus();

    expect(result.status).toBe("invalid");
    expect(result.state).toBeNull();
    expect(result.reason).toContain("unsupported shape");
  });

  it.each([null, undefined, false, 0, "", NaN])("preserves a stored %s value as invalid instead of treating it as empty", async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chromalum", 2);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(value, "current");
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });

      await expect(loadStateWithStatus()).resolves.toMatchObject({ status: "invalid", state: null });

      const stored = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
        const request = db.transaction("state", "readonly").objectStore("state").openCursor("current");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      expect(stored).not.toBeNull();
      expect(stored!.value).toEqual(value);
    } finally {
      db.close();
    }
  });
});

describe("checkStorageQuota", () => {
  it("returns used/quota when API available", async () => {
    // jsdom may or may not have navigator.storage.estimate
    const result = await checkStorageQuota();
    if (result !== null) {
      expect(typeof result.used).toBe("number");
      expect(typeof result.quota).toBe("number");
    } else {
      // API not available in this environment — that's OK
      expect(result).toBeNull();
    }
  });
});

describe("requestPersistentStorage", () => {
  it("returns unsupported when the StorageManager persist API is unavailable", async () => {
    Object.defineProperty(navigator, "storage", { configurable: true, value: undefined });

    await expect(requestPersistentStorage()).resolves.toEqual({ supported: false, persisted: false, requested: false });
  });

  it("does not request when storage is already persistent", async () => {
    const persisted = vi.fn(() => Promise.resolve(true));
    const persist = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persisted, persist },
    });

    await expect(requestPersistentStorage()).resolves.toEqual({ supported: true, persisted: true, requested: false });
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it("requests persistent storage when it is not already enabled", async () => {
    const persisted = vi.fn(() => Promise.resolve(false));
    const persist = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persisted, persist },
    });

    await expect(requestPersistentStorage()).resolves.toEqual({ supported: true, persisted: true, requested: true });
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
