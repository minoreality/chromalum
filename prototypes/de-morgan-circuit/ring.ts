import { COLORS, MODES, bits, name, evaluate, type Operation, type SignalInput } from "./model";
import { branch, lanesFor, state, text, wire, type Point } from "./facing";

// The shared inputs split into the two routes and the routes rejoin at one shared output,
// so the drawing closes into a ring. Ring coordinates: s runs from the inputs to the
// output, t across it, route ① at negative t. Wide frames map s to y, as the flow prototype
// does. Narrow ones map s to x: two columns of three lanes need about 520px, and a 320px
// viewport leaves the frame 272px. Input a is outermost on both sides, so the connectors
// nest instead of crossing.
export function ringCircuit(operation: Operation, inputs: readonly SignalInput[], width: number) {
  const mode = MODES[operation];
  const results = evaluate(operation, inputs);
  const { lanes } = lanesFor(inputs.length);
  const reach = lanes[lanes.length - 1];
  const narrow = width <= 640;
  const nodes = inputs.map((_, i) => (narrow ? 20 + i * 34 : 76 + i * 80));
  const start = nodes[nodes.length - 1] + (narrow ? 14 : 24);
  const output = narrow ? width - 24 : start + 240;
  const length = output - start;
  const offset = narrow ? reach + 70 : Math.min(Math.max(width / 4, reach + 70), width / 2 - reach - 54);
  const middle = narrow ? 40 + offset + reach : width / 2;
  const height = narrow ? middle + offset + reach + 64 : output + 48;
  const at = (s: number, t: number): Point => (narrow ? [s, middle + t] : [middle + t, s]);
  const path = (...points: Point[]) => wire(points.map(([s, t]) => at(s, t)));

  function busMark(s: number, t: number) {
    const [x, y] = at(s, t);
    const [dx, dy] = narrow ? [5, -3] : [-3, 5];
    const from: Point = [x + dx, y + dy];
    const to: Point = [x - dx, y - dy];
    return wire([from, to]) + text(x + (narrow ? 12 : 8), y - 9, "3", "bus-label");
  }

  function route(which: "left" | "right") {
    const side = which === "left" ? -1 : 1;
    let drawing = "";
    inputs.forEach((_, i) => {
      const lane = side * (offset - lanes[i]);
      // Narrow nodes sit on their connector: it leaves above the label and below the bits.
      drawing += path([nodes[i], narrow ? (side < 0 ? -28 : 30) : 0], [nodes[i], lane], [start, lane]);
      drawing += busMark(nodes[i], side * (narrow ? (side < 0 ? 40 : 50) : 38));
    });
    const first = which === "left" ? Math.max(20, length * 0.28 - 24) : Math.max(6, length * 0.28 - 38);
    const frame = { origin: at(start, side * offset), vertical: !narrow, direction: 1, mirror: which === "left" ? 1 : -1 } as const;
    drawing += branch(which, operation, inputs, frame, first, length - (which === "left" ? 46 : 58), length);
    const gap = narrow ? 14 : 20;
    drawing += path([output, side * offset], [output, side * gap]);
    drawing += path([output - 4, side * (gap + 6)], [output, side * gap], [output + 4, side * (gap + 6)]);
    return `<g data-flow="${which}" data-route-result="${which}" data-level="${results[which]}">${drawing}</g>`;
  }

  let drawing = route("left") + route("right");
  inputs.forEach(({ label, value }, i) => {
    const point = at(nodes[i], 0);
    if (!narrow) {
      drawing += `<circle class="terminal" cx="${point[0]}" cy="${point[1]}" r="3" />`;
      drawing += state(point, value, false, 0, `data-shared-input="${label}"`, label);
      return;
    }
    const [x, y] = point;
    drawing += `<g class="signal" data-level="${value}" data-shared-input="${label}">
      <title>${name(value)} ${bits(value)}</title>
      ${text(x, y - 15, label, "port-name")}
      <rect class="signal-swatch" x="${x - 14}" y="${y - 10}" width="28" height="20" rx="3" fill="${COLORS[value].hex}" />
      <text class="signal-name" x="${x}" y="${y + 4}" fill="${value >= 4 ? "#10111b" : "#ffffff"}">${name(value)}</text>
      ${text(x, y + 24, bits(value), "signal-bits")}
    </g>`;
  });
  const result = results.left;
  const [x, y] = at(output, 0);
  drawing += `<g data-shared-output data-level="${result}">
    ${text(x - (narrow ? 52 : 0), y + (narrow ? -3 : -27), "同じ出力", "port-name")}
    <rect class="signal-swatch" x="${x - 20}" y="${y - 14}" width="40" height="28" rx="4" fill="${COLORS[result].hex}" />
    <text class="signal-name" x="${x}" y="${y + 5}" fill="${result >= 4 ? "#10111b" : "#ffffff"}">${name(result)}</text>
    ${text(x - (narrow ? 52 : 0), y + (narrow ? 14 : 33), bits(result), "signal-bits")}
  </g>`;
  drawing += text(narrow ? width / 2 : middle - offset, 20, `① ${mode.operator} → NOT`, "route-heading");
  drawing += text(narrow ? width / 2 : middle + offset, narrow ? height - 12 : 20, `② NOT → ${mode.dual}`, "route-heading");
  const titleId = `${operation}-ring-title`;
  return `<svg class="joined-svg" viewBox="0 0 ${width} ${height}" height="${height}" data-axis="${narrow ? "vertical" : "horizontal"}" role="img" aria-labelledby="${titleId}">
    <title id="${titleId}">同じ入力から二つの回路に分かれ、同じ出力で合流。入力は${inputs.map(({ value }) => `${name(value)} ${bits(value)}`).join("と")}。どちらの計算も${name(result)} ${bits(result)}。</title>
    ${drawing}
  </svg>`;
}
