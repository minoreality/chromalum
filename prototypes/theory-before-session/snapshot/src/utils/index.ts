/* ═══════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════ */
export const rgbStr = (c: readonly [number, number, number]): string => `rgb(${c[0]},${c[1]},${c[2]})`;
export const hexStr = (c: readonly [number, number, number]): string => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
/** CSS colour for a pure hue at full saturation; the angle wraps so -30 and 330 draw the same. */
export const hueStr = (angleDeg: number): string => `hsl(${((angleDeg % 360) + 360) % 360} 100% 50%)`;

export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export function openBlobUrlInNewTab(url: string): void {
  const opened = window.open(url, "_blank", "noopener");
  if (opened) opened.opener = null;
}
