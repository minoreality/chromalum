import "./style.css";
import {
  A1_WEIGHTS,
  CHAMBERS,
  COLORS,
  FUNNEL,
  HALVES,
  N,
  WALLS,
  additiveRank,
  bits,
  complementReversed,
  conditions,
  isA1,
  name,
  onWall,
  orderText,
  parseWeights,
  ranking,
  reduced,
  score,
  snap,
  upperHalf,
  type Half,
  type Weights,
} from "./model";

// Standalone prototype: no imports from the application or its state.
let weights: Weights = parseWeights(new URL(location.href).searchParams.get("w")) ?? A1_WEIGHTS;
type Point = [number, number];

// Label parts alternate plain text and a subscript: ["w", "G", " > w", "B"] reads w_G > w_B.
const math = (parts: readonly string[]) => parts.map((part, i) => (i % 2 ? `<sub>${part}</sub>` : part)).join("");
const ink = (level: number) => (level >= 4 ? "#10111b" : "#ffffff");
const TEXT_COLOR: Record<string, string> = { G: "#5dff5d", R: "#ff6b6b", B: "#8c9bff" };
const TINT: Record<Half, string> = { G: "#00ff00", R: "#ff0000", B: "#4f63ff", majority: "#9bacff" };
const HALF_TEXT: Record<Half | "none", string> = {
  G: "上半分 = G を含む色 {G, C, Y, W}：立方体の面",
  R: "上半分 = R を含む色 {R, M, Y, W}：立方体の面",
  B: "上半分 = B を含む色 {B, M, C, W}：立方体の面",
  majority: "上半分 = 原色を二つ以上含む色 {M, C, Y, W}：多数決",
  none: "上半分は未定：中央で同点",
};
const FUNNEL_TEXT = [
  "包含と矛盾しない全順序",
  "補色でちょうど逆順になる順序（三角形の12部屋）",
  "順位が原色の順位の和になる順序（上半分が立方体の面）",
  "さらに G > M と R > B を満たす順序",
];
const HASSE: Point[] = [
  [85, 132],
  [35, 96],
  [85, 96],
  [35, 56],
  [135, 96],
  [85, 56],
  [135, 56],
  [85, 18],
];

document.querySelector<HTMLElement>("#app")!.innerHTML = `
  <header>
    <p class="eyebrow">CHROMALUM LAB <span>PROTOTYPE</span></p>
    <h1>重みの三角形と八状態の順序</h1>
    <p class="intro">原色の重みを ${math(["w", "G", " + w", "R", " + w", "B", ` = ${N}`])} の整数格子上で動かし、加法的スコア σ(S) = Σ<sub>c∈S</sub> w<sub>c</sub> が八状態に与える順序を見ます。</p>
  </header>
  <section class="lab">
    <figure class="triangle">
      <div class="triangle-frame"></div>
      <figcaption>六本の壁が三角形を12部屋に分けます。色付きの部屋では一つの原色の重みが半分を超えます。太枠は三条件を満たす部屋です。</figcaption>
    </figure>
    <div class="readouts">
      <div class="weights">
        <p>${math(["w", "G", " : w", "R", " : w", "B"])} = <output class="weights-value"></output> <span class="ratio"></span></p>
        <button class="reset" type="button">4 : 2 : 1 に戻す</button>
      </div>
      <p class="hint">点をドラッグするか、点にフォーカスして矢印キーで動かします。Shift で6目盛りずつ動きます。</p>
      <ul class="conditions">
        ${conditions(weights)
          .map(({ label }) => `<li><span class="mark" aria-hidden="true"></span><span>${math(label)}</span></li>`)
          .join("")}
      </ul>
      <p class="theorem">三条件がすべて成り立つのは、順序が K&lt;B&lt;R&lt;M&lt;G&lt;C&lt;Y&lt;W のときだけです。</p>
      <p class="order">順序 <code aria-live="polite"></code></p>
      <div class="strip-frame"></div>
      <div class="halves">
        <svg class="hasse" viewBox="0 0 170 150" width="170" height="150" role="img" aria-label="包含順序のハッセ図。上半分を強調">
          ${[
            [0, 1],
            [0, 2],
            [0, 4],
            [1, 3],
            [1, 5],
            [2, 3],
            [2, 6],
            [4, 5],
            [4, 6],
            [3, 7],
            [5, 7],
            [6, 7],
          ]
            .map(([a, b]) => `<line class="hasse-edge" x1="${HASSE[a][0]}" y1="${HASSE[a][1]}" x2="${HASSE[b][0]}" y2="${HASSE[b][1]}" />`)
            .join("")}
          ${HASSE.map(
            ([x, y], level) => `<g class="hasse-node" data-level="${level}">
              <circle cx="${x}" cy="${y}" r="12" fill="${COLORS[level].hex}" />
              <text x="${x}" y="${y + 4}" fill="${ink(level)}">${name(level)}</text>
            </g>`,
          ).join("")}
        </svg>
        <div>
          <div class="half-labels">${(Object.keys(HALF_TEXT) as (Half | "none")[]).map((half) => `<p data-half="${half}">${HALF_TEXT[half]}</p>`).join("")}</div>
          <p class="note">補色は上半分と下半分を入れ替えます。そうなる上方閉集合はこの四つだけです。</p>
        </div>
      </div>
      <ol class="funnel">
        ${FUNNEL.map(
          (set, i) =>
            `<li><span class="count">${set.length}</span><span>${FUNNEL_TEXT[i]}</span><span class="mark" aria-hidden="true"></span></li>`,
        ).join("")}
      </ol>
    </div>
  </section>
  <section class="walls-section" aria-labelledby="walls-heading">
    <h2 id="walls-heading">壁を越えると入れ替わる組</h2>
    <table class="walls">
      <thead><tr><th scope="col">壁</th><th scope="col">入れ替わる組</th></tr></thead>
      <tbody>
        ${WALLS.map(
          ({ label, swaps }) =>
            `<tr><th scope="row">${math(label)}</th><td>${swaps.map(([x, y]) => `${name(x)} ↔ ${name(y)}`).join("、")}</td></tr>`,
        ).join("")}
      </tbody>
    </table>
    <p class="note">原色が半分を超えるかどうかの壁では原色とその補色が、二つの重みが等しくなる壁では互いに補色の関係にある二組が入れ替わります。</p>
  </section>
  <footer>加法的スコアの順序を扱う試作です。知覚的・測光的な明るさの尺度ではありません。</footer>
`;

const triangleFrame = document.querySelector<HTMLElement>(".triangle-frame")!;
const stripFrame = document.querySelector<HTMLElement>(".strip-frame")!;

// Draws the static triangle at the frame's width and returns its weight <-> screen maps.
function buildTriangle() {
  const width = triangleFrame.getBoundingClientRect().width;
  const side = Math.min(width - 48, 460);
  const top = 34;
  const cx = width / 2;
  const vertices: Point[] = [
    [cx, top],
    [cx - side / 2, top + (side * Math.sqrt(3)) / 2],
    [cx + side / 2, top + (side * Math.sqrt(3)) / 2],
  ];
  const height = vertices[1][1] + 36;
  const along = (w: Weights, axis: 0 | 1) => w.reduce((sum, v, i) => sum + v * vertices[i][axis], 0) / N;
  const toScreen = (w: Weights): Point => [along(w, 0), along(w, 1)];
  const [[xg, yg], [xr, yr], [xb, yb]] = vertices;
  const det = (yr - yb) * (xg - xb) + (xb - xr) * (yg - yb);
  const fromScreen = ([x, y]: Point) => {
    const g = ((yr - yb) * (x - xb) + (xb - xr) * (y - yb)) / det;
    const r = ((yb - yg) * (x - xb) + (xg - xb) * (y - yb)) / det;
    return snap([g, r, 1 - g - r]);
  };
  const path = (points: Weights[]) => `M${points.map((w) => toScreen(w).join(" ")).join(" L")} Z`;
  // A wall runs between the two points where its form vanishes on the triangle's edges.
  const wallEnds = (coefficients: readonly number[]) => {
    const corners: Weights[] = [
      [N, 0, 0],
      [0, N, 0],
      [0, 0, N],
    ];
    const f = (w: Weights) => coefficients.reduce((sum, c, i) => sum + c * w[i], 0);
    return corners.flatMap((p, i) => {
      const q = corners[(i + 1) % 3];
      const t = f(p) === f(q) ? -1 : f(p) / (f(p) - f(q));
      const [a, b] = [toScreen(p), toScreen(q)];
      return t >= 0 && t < 1 ? [[a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]] : [];
    });
  };
  const labelOffset: Point[] = [
    [0, -14],
    [-14, 22],
    [14, 22],
  ];
  triangleFrame.innerHTML = `<svg class="triangle-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="重みの三角形">
    ${CHAMBERS.map(
      ({ vertices: corners, order, half }) =>
        `<path class="chamber" d="${path(corners)}" fill="${TINT[half ?? "majority"]}" data-order="${order.map(name).join("")}" data-half="${half}"${isA1(order) ? " data-a1" : ""} />`,
    ).join("")}
    <path class="outline" d="${path([
      [N, 0, 0],
      [0, N, 0],
      [0, 0, N],
    ])}" />
    ${WALLS.map(({ coefficients }, i) => {
      const [[x1, y1], [x2, y2]] = wallEnds(coefficients);
      return `<line class="wall" data-wall="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    }).join("")}
    ${CHAMBERS.filter(({ order }) => isA1(order))
      .map(({ vertices: corners }) => `<path class="a1-outline" d="${path(corners)}" />`)
      .join("")}
    ${vertices
      .map(
        ([x, y], i) =>
          `<text class="corner" x="${x + labelOffset[i][0]}" y="${y + labelOffset[i][1]}" fill="${TEXT_COLOR["GRB"[i]]}">${"GRB"[i]}</text>`,
      )
      .join("")}
    <g class="handle" tabindex="0" role="slider" aria-roledescription="重みの点" aria-valuemin="0" aria-valuemax="${N}">
      <circle class="handle-ring" r="11" />
      <circle class="handle-dot" r="6" />
    </g>
  </svg>`;
  return { toScreen, fromScreen };
}

function stripSvg(width: number) {
  const { order, tied, rank } = ranking(weights);
  const pad = 16;
  const x = (s: number) => pad + (s / N) * (width - 2 * pad);
  const slot = (i: number) => pad + 13 + (i * (width - 2 * pad - 26)) / 7;
  const divider = (slot(3) + slot(4)) / 2;
  return `<svg class="strip-svg" viewBox="0 0 ${width} 160" width="${width}" height="160" role="img" aria-label="スコアの位置と順位">
    ${[0, N / 2, N].map((s) => `<text class="tick" x="${x(s)}" y="12">${s}</text>`).join("")}
    <line class="axis" x1="${x(0)}" y1="26" x2="${x(N)}" y2="26" />
    <line class="centre" x1="${x(N / 2)}" y1="17" x2="${x(N / 2)}" y2="35" />
    ${order
      .map(
        (level, i) =>
          `<line class="link" x1="${x(score(weights, level))}" y1="31" x2="${slot(i)}" y2="84" stroke="${level ? COLORS[level].hex : "#8c99b7"}" />`,
      )
      .join("")}
    ${order
      .map((level) => `<circle class="marker" cx="${x(score(weights, level))}" cy="26" r="5.5" fill="${COLORS[level].hex}" />`)
      .join("")}
    <line class="divider" x1="${divider}" y1="80" x2="${divider}" y2="146" />
    ${order
      .map(
        (level, i) => `<g class="slot" data-level="${level}" data-rank="${rank[i]}">
          <rect x="${slot(i) - 13}" y="84" width="26" height="20" rx="3" fill="${COLORS[level].hex}" />
          <text class="slot-name" x="${slot(i)}" y="98" fill="${ink(level)}">${name(level)}</text>
          <text class="slot-bits" x="${slot(i)}" y="118">${bits(level)}</text>
          <text class="slot-rank" x="${slot(i)}" y="134">${rank[i]}</text>
        </g>`,
      )
      .join("")}
    ${tied.map((tie, i) => (tie ? `<line class="tie" x1="${slot(i)}" y1="140" x2="${slot(i + 1)}" y2="140" />` : "")).join("")}
    <text class="half" x="${(slot(0) + slot(3)) / 2}" y="156">下半分</text>
    <text class="half" x="${(slot(4) + slot(7)) / 2}" y="156">上半分</text>
  </svg>`;
}

function update() {
  const { order, tied, strict } = ranking(weights);
  const half = tied[3] ? null : upperHalf(order);
  const [px, py] = layout.toScreen(weights);
  const handle = triangleFrame.querySelector<SVGGElement>(".handle")!;
  handle.setAttribute("transform", `translate(${px} ${py})`);
  handle.setAttribute("aria-valuenow", String(weights[0]));
  handle.setAttribute("aria-valuetext", `w_G ${weights[0]}、w_R ${weights[1]}、w_B ${weights[2]}`);
  for (const chamber of triangleFrame.querySelectorAll<SVGPathElement>(".chamber")) {
    chamber.toggleAttribute("data-current", strict && chamber.dataset.order === order.map(name).join(""));
  }
  for (const wall of triangleFrame.querySelectorAll<SVGLineElement>(".wall")) {
    wall.toggleAttribute("data-on", onWall(weights, WALLS[Number(wall.dataset.wall)].coefficients));
  }
  document.querySelector(".weights-value")!.textContent = weights.map((v) => String(v).padStart(3, " ")).join(" : ");
  // A shorter ratio exists only when the weights share a factor. Compare every weight: 0 stays 0 under any factor.
  const ratio = reduced(weights);
  document.querySelector(".ratio")!.textContent = ratio.every((v, i) => v === weights[i]) ? "" : `= ${ratio.join(" : ")}`;
  conditions(weights).forEach(({ holds }, i) => {
    const item = document.querySelectorAll<HTMLElement>(".conditions li")[i];
    item.dataset.holds = String(holds);
    item.querySelector(".mark")!.textContent = holds ? "✓" : "✗";
  });
  document.querySelector(".order code")!.textContent = orderText(order, tied);
  stripFrame.innerHTML = stripSvg(stripFrame.getBoundingClientRect().width);
  for (const node of document.querySelectorAll<SVGGElement>(".hasse-node")) {
    node.toggleAttribute("data-upper", half !== null && HALVES[half].includes(Number(node.dataset.level)));
  }
  for (const label of document.querySelectorAll<HTMLElement>(".half-labels [data-half]")) {
    label.setAttribute("aria-hidden", String(label.dataset.half !== (half ?? "none")));
  }
  const passes = [strict, strict && complementReversed(order), strict && additiveRank(order), strict && isA1(order)];
  document.querySelectorAll<HTMLElement>(".funnel li").forEach((item, i) => {
    item.dataset.state = strict ? String(passes[i]) : "tied";
    item.querySelector(".mark")!.textContent = strict ? (passes[i] ? "✓" : "✗") : "—";
  });
  document
    .querySelectorAll<HTMLElement>(".walls tbody tr")
    .forEach((row, i) => row.toggleAttribute("data-on", onWall(weights, WALLS[i].coefficients)));
  history.replaceState(null, "", `?w=${weights.join(",")}${location.hash}`);
}

function setWeights(next: Weights) {
  if (next.every((v, i) => v === weights[i])) return;
  weights = next;
  update();
}

let layout = buildTriangle();
update();

const svgPoint = (event: PointerEvent): Point => {
  const box = triangleFrame.querySelector("svg")!.getBoundingClientRect();
  return [event.clientX - box.left, event.clientY - box.top];
};
triangleFrame.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest("svg")) return;
  event.preventDefault();
  triangleFrame.setPointerCapture(event.pointerId);
  triangleFrame.querySelector<SVGGElement>(".handle")!.focus({ preventScroll: true });
  setWeights(layout.fromScreen(svgPoint(event)));
});
triangleFrame.addEventListener("pointermove", (event) => {
  if (triangleFrame.hasPointerCapture(event.pointerId)) setWeights(layout.fromScreen(svgPoint(event)));
});

// Arrow keys move along the lattice: left/right trade w_R against w_B, up/down trade w_G against both.
const KEYS: Record<string, Weights> = { ArrowLeft: [0, 1, -1], ArrowRight: [0, -1, 1], ArrowUp: [2, -1, -1], ArrowDown: [-2, 1, 1] };
triangleFrame.addEventListener("keydown", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".handle")) return;
  if (event.key === "Home") {
    event.preventDefault();
    setWeights(A1_WEIGHTS);
    return;
  }
  const step = KEYS[event.key];
  if (!step) return;
  event.preventDefault();
  const k = event.shiftKey ? 6 : 1;
  const next = weights.map((v, i) => v + k * step[i]);
  setWeights(next.every((v) => v >= 0) ? [next[0], next[1], next[2]] : snap(next.map((v) => v / N)));
});
document.querySelector(".reset")!.addEventListener("click", () => setWeights(A1_WEIGHTS));

// Match each viewBox to its frame so text and marks keep their size at every width. Heights follow
// widths only, so a redraw at an unchanged width is skipped. The redraw waits for the next frame:
// redrawing the triangle resizes its observed frame, which inside this callback would report a
// ResizeObserver loop.
const widths = new Map<Element, number>();
const resize = new ResizeObserver((entries) => {
  const changed = entries.filter((entry) => widths.get(entry.target) !== entry.contentRect.width);
  for (const entry of changed) widths.set(entry.target, entry.contentRect.width);
  if (!changed.length) return;
  const triangle = changed.some((entry) => entry.target === triangleFrame);
  requestAnimationFrame(() => {
    if (triangle) layout = buildTriangle();
    update();
  });
});
resize.observe(triangleFrame);
resize.observe(stripFrame);
