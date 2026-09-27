export class LazyChunkLoadError extends Error {
  constructor(readonly cause: unknown) {
    super("This part of the app could not be loaded. Reload the page to try again.");
    this.name = "LazyChunkLoadError";
  }
}

export async function loadLazyChunk<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    throw new LazyChunkLoadError(error);
  }
}
