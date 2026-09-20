// Keep the picker filters and all import entry points on the same format list.
export const IMAGE_IMPORT_TYPES: Record<string, string[]> = {
  "image/avif": [".avif"],
  "image/bmp": [".bmp"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg", ".jfif", ".jpe"],
  "image/png": [".png"],
  "image/svg+xml": [".svg"],
  "image/webp": [".webp"],
};

export const IMAGE_IMPORT_ACCEPT = Object.entries(IMAGE_IMPORT_TYPES)
  .flatMap(([type, extensions]) => [type, ...extensions])
  .join(",");

export function getImageImportType(file: Pick<File, "name" | "type">): string | null {
  const type = file.type.toLowerCase();
  if (Object.keys(IMAGE_IMPORT_TYPES).includes(type)) return type;
  // Some operating systems leave File.type empty or supply a generic MIME type.
  // Infer only those cases; the browser decoder still validates the actual bytes.
  if (type && type !== "application/octet-stream") return null;
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return Object.entries(IMAGE_IMPORT_TYPES).find(([, extensions]) => extensions.includes(extension))?.[0] ?? null;
}
