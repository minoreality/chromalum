import { COLORS, MODES, bits, name, evaluate, type Operation, type SignalInput } from "./model";

export type Layout = "outputs" | "inputs" | "parallel";
type Point = [number, number];

const text = (x: number, y: number, value: string, className = "gate-name") =>
  `<text class="${className}" x="${x}" y="${y}">${value}</text>`;
const wire = (points: Point[]) => `<path class="wire" d="${points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")}" />`;

function state(point: Point, level: number, vertical: boolean, cross = 0, attributes = "", label = "") {
  const x = point[0] + (vertical ? (cross < 0 ? -36 : 36) : 0);
  const y = point[1] + (vertical ? 0 : -26);
  const color = COLORS[level];
  return `<g class="signal" data-level="${level}" ${attributes}>
    <title>${color.name} ${bits(level)}</title>
    ${label ? text(x, y - 23, label, "port-name") : ""}
    <rect class="signal-swatch" x="${x - 14}" y="${y - 11}" width="28" height="20" rx="3" fill="${color.hex}" />
    <text class="signal-name" x="${x}" y="${y + 4}" fill="${level >= 4 ? "#10111b" : "#ffffff"}">${color.name}</text>
    ${text(x, y + 24, bits(level), "signal-bits")}
  </g>`;
}

export function facingCircuit(operation: Operation, inputs: readonly SignalInput[], width: number, layout: Exclude<Layout, "parallel">) {
  const mode = MODES[operation];
  const { combined, complements, ...results } = evaluate(operation, inputs);
  const lanes = inputs.length === 3 ? [-80, 0, 80] : [-60, 60];
  const ports = inputs.length === 3 ? [-14, 0, 14] : [-14, 14];
  const vertical = width <= 640;
  const center: Point = [width / 2, vertical ? 364 : 160];
  const length = vertical ? 280 : width / 2 - 26;
  const height = vertical ? 728 : 300;

  function route(which: "left" | "right") {
    const direction = (layout === "outputs" ? which === "left" : which === "right") ? 1 : -1;
    const origin: Point =
      layout === "inputs" ? center : vertical ? [center[0], center[1] - direction * length] : [center[0] - direction * length, center[1]];
    // Only geometry is reflected/rotated. Labels are placed in screen coordinates.
    const point = (u: number, v: number): Point =>
      vertical ? [origin[0] + v, origin[1] + direction * u] : [origin[0] + direction * u, origin[1] + v];
    const line = (...points: Point[]) => wire(points.map(([u, v]) => point(u, v)));
    const matrix = (u: number, v: number) => {
      const [x, y] = point(u, v);
      return vertical ? `matrix(0 ${direction} 1 0 ${x} ${y})` : `matrix(${direction} 0 0 1 ${x} ${y})`;
    };
    function gate(operator: "AND" | "OR" | "NOT", u: number, v: number) {
      const outline =
        operator === "NOT"
          ? "M0 -17 L28 0 L0 17 Z"
          : operator === "AND"
            ? "M0 -28 H22 A28 28 0 0 1 22 28 H0 Z"
            : "M0 -28 Q30 -28 50 0 Q30 28 0 28 Q16 0 0 -28 Z";
      const p = point(u + (operator === "NOT" ? 15 : 22), v);
      const labelX = p[0] + (vertical && operator === "NOT" ? (v > 0 ? 34 : -34) : 0);
      const labelY = p[1] + (!vertical && operator === "NOT" ? 34 : 4);
      return `<g data-gate="${operator}"><g transform="${matrix(u, v)}">
        <path class="gate" d="${outline}" />${operator === "NOT" ? '<circle class="gate" cx="32" cy="0" r="4" />' : ""}
      </g>${text(labelX, labelY, operator)}</g>`;
    }
    const arrow = (u: number, v: number) => line([u - 5, v - 4], [u, v], [u - 5, v + 4]);
    const first = length * 0.28;
    let drawing = "";
    if (which === "left") {
      const inverter = length - 72;
      lanes.forEach((v, i) => {
        const port = first + (mode.operator === "OR" ? (ports[i] === 0 ? 8 : 6) : 0);
        drawing += line([0, v], [first - 16, v], [first - 16, ports[i]], [port, ports[i]]);
      });
      drawing += line([first + 50, 0], [inverter, 0]) + line([inverter + 36, 0], [length, 0]);
      drawing += gate(mode.operator, first, 0) + gate("NOT", inverter, 0);
      drawing += state(point((first + 50 + inverter) / 2, 0), combined, vertical, 0, "data-combined");
    } else {
      const finalGate = length - 90;
      const bend = finalGate - 12;
      lanes.forEach((v, i) => {
        const port = finalGate + (mode.dual === "OR" ? (ports[i] === 0 ? 8 : 6) : 0);
        drawing += line([0, v], [first, v]);
        drawing += line([first + 36, v], [bend, v], [bend, ports[i]], [port, ports[i]]);
        drawing += gate("NOT", first, v);
        drawing += state(point((first + 36 + bend) / 2, v), complements[i], vertical, v, `data-complement-${inputs[i].label}`);
      });
      drawing += line([finalGate + 50, 0], [length, 0]) + gate(mode.dual, finalGate, 0);
    }
    for (const v of lanes) {
      const mark = point(38, v);
      drawing += line([35, v + 5], [41, v - 5]);
      drawing += text(mark[0] + (vertical ? 12 : 8), mark[1] - 9, "3", "bus-label");
    }
    if (layout === "outputs") {
      inputs.forEach(({ label, value }, i) => {
        drawing += state(point(0, lanes[i]), value, vertical, lanes[i], "", label);
      });
      drawing += arrow(length - 30, 0);
    } else {
      for (const v of lanes) drawing += arrow(22, v);
      drawing += state(point(length, 0), results[which], vertical, 0, `data-path-result="${which}"`, which === "left" ? "y₁" : "y₂");
      const end = point(length, 0);
      drawing += `<circle class="terminal" cx="${end[0]}" cy="${end[1]}" r="2.5" />`;
    }
    return `<g data-flow="${which}" data-direction="${direction}" data-route-result="${which}" data-level="${results[which]}">${drawing}</g>`;
  }

  let drawing = route("left") + route("right");
  if (layout === "outputs") {
    const [x, y] = center;
    const result = results.left;
    drawing += `<g data-shared-output data-level="${result}">
      ${text(x - (vertical ? 62 : 0), y + (vertical ? 5 : -27), "同じ出力", "port-name")}
      <rect class="signal-swatch" x="${x - 20}" y="${y - 14}" width="40" height="28" rx="4" fill="${COLORS[result].hex}" />
      <text class="signal-name" x="${x}" y="${y + 5}" fill="${result >= 4 ? "#10111b" : "#ffffff"}">${name(result)}</text>
      ${text(x + (vertical ? 48 : 0), y + (vertical ? 5 : 33), bits(result), "signal-bits")}
    </g>`;
  } else {
    inputs.forEach(({ label, value }, i) => {
      const v = lanes[i];
      const point: Point = vertical ? [center[0] + v, center[1]] : [center[0], center[1] + v];
      drawing += `<circle class="terminal" cx="${point[0]}" cy="${point[1]}" r="3" />`;
      drawing += state(point, value, vertical, v, `data-shared-input="${label}"`, label);
    });
  }
  drawing += text(vertical ? center[0] : width / 4, 20, `① ${mode.operator} → NOT`, "route-heading");
  drawing += text(vertical ? center[0] : (width * 3) / 4, vertical ? height - 12 : 20, `② NOT → ${mode.dual}`, "route-heading");
  const titleId = `${operation}-${layout}-title`;
  const description = layout === "outputs" ? "右の回路を反転し、中央で同じ出力に合流" : "左の回路を反転し、中央の入力から両側へ分岐";
  return `<svg class="joined-svg" viewBox="0 0 ${width} ${height}" height="${height}" data-axis="${vertical ? "vertical" : "horizontal"}" role="img" aria-labelledby="${titleId}">
    <title id="${titleId}">${description}。入力は${inputs.map(({ value }) => `${name(value)} ${bits(value)}`).join("と")}。どちらの計算も${name(results.left)} ${bits(results.left)}。</title>
    ${drawing}
  </svg>`;
}
