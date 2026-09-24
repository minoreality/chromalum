import "./style.css";
import { COLORS, MODES, INPUT_LABELS, bits, name, evaluate, type Operation, type Arity, type InputLabel, type SignalInput } from "./model";
import { facingCircuit, type Layout } from "./facing";

// Standalone prototype: no imports from the application or its state.
type Route = "left" | "right";
const requestedLayout = new URL(location.href).searchParams.get("layout");
let layout: Layout = requestedLayout === "inputs" || requestedLayout === "parallel" ? requestedLayout : "outputs";
let arity: Arity = new URL(location.href).searchParams.get("arity") === "3" ? 3 : 2;
const OPERATIONS: Operation[] = ["or", "and"];
const selections: Record<Arity, Record<Operation, Record<InputLabel, number>>> = {
  2: { or: { ...MODES.or.initial }, and: { ...MODES.and.initial } },
  3: { or: { ...MODES.or.initial }, and: { ...MODES.and.initial } },
};

function activeInputs(operation: Operation): SignalInput[] {
  return INPUT_LABELS.slice(0, arity).map((label) => ({ label, value: selections[arity][operation][label] }));
}

function palette(operation: Operation, input: InputLabel) {
  return `<fieldset><legend>入力 ${input}</legend><div class="palette">
    ${COLORS.map(
      (color, level) => `<label class="choice" title="${color.name} · ${bits(level)}">
      <input type="radio" name="${operation}-${input}" data-input="${input}" value="${level}" aria-label="${color.name} ${bits(level)}" ${level === selections[arity][operation][input] ? "checked" : ""} />
      <span class="choice-dot" style="--swatch: ${color.hex}"></span><span>${color.name}</span>
    </label>`,
    ).join("")}
  </div></fieldset>`;
}

function lawSection(operation: Operation) {
  const mode = MODES[operation];
  return `<section id="law-${operation}" class="law" aria-labelledby="heading-${operation}">
    <h2 id="heading-${operation}">${mode.operator}から始める</h2>
    <p class="identity"></p>
    <div class="controls">
      <div class="control-heading"><span>二つの回路に同じ入力を与える</span><button class="reset" type="button"></button></div>
      <form class="inputs"></form>
    </div>
    <div class="law-diagrams">
      <figure class="circuit" data-route="left">
        <figcaption>① ${mode.operator} → NOT</figcaption>
        <div class="circuit-frame" data-operation="${operation}" data-route="left"></div>
        <p class="calculation" data-calculation="left"></p>
      </figure>
      <div class="equivalence" aria-label="二つの回路の出力は等しい">=</div>
      <figure class="circuit" data-route="right">
        <figcaption>② NOT → ${mode.dual}</figcaption>
        <div class="circuit-frame" data-operation="${operation}" data-route="right"></div>
        <p class="calculation" data-calculation="right"></p>
      </figure>
    </div>
    <div class="joined-view" hidden>
      <div class="joined-frame" data-operation="${operation}"></div>
      <div class="joined-calculations"><p class="calculation" data-calculation="left"></p><p class="calculation" data-calculation="right"></p></div>
    </div>
    <p class="result" role="status" aria-live="polite"></p>
  </section>`;
}

// Each drawn gate represents three independent one-bit gates, one per GRB channel.
function logicGate(operator: "OR" | "AND", x: number, y: number) {
  const outline = operator === "AND" ? "M0 -28 H22 A28 28 0 0 1 22 28 H0 Z" : "M0 -28 Q30 -28 50 0 Q30 28 0 28 Q16 0 0 -28 Z";
  return `<g data-gate="${operator}" transform="translate(${x} ${y})">
    <path class="gate" d="${outline}" /><text class="gate-name" x="${operator === "OR" ? 23 : 20}" y="5">${operator}</text>
  </g>`;
}

function notGate(x: number, y: number) {
  return `<g data-gate="NOT" transform="translate(${x} ${y})">
    <path class="gate" d="M0 -17 L28 0 L0 17 Z" /><circle class="gate" cx="32" cy="0" r="4" />
    <text class="gate-name" x="15" y="34">NOT</text>
  </g>`;
}

function wire(path: string) {
  return `<path class="wire" d="${path}" />`;
}

function bus(x: number, y: number) {
  return `<g class="bus-mark">${wire(`M${x - 3} ${y + 5} l6 -10`)}<text x="${x + 7}" y="${y - 9}">3</text></g>`;
}

function signal(x: number, y: number, level: number, attributes = "", label = "") {
  const color = COLORS[level];
  return `<g class="signal" data-level="${level}" ${attributes}>
    <title>${color.name} ${bits(level)}</title>
    ${label ? `<text class="port-name" x="${x}" y="${y - 52}">${label}</text>` : ""}
    <rect class="signal-swatch" x="${x - 14}" y="${y - 38}" width="28" height="19" rx="3" fill="${color.hex}" />
    <text class="signal-name" x="${x}" y="${y - 24}" fill="${level >= 4 ? "#10111b" : "#ffffff"}">${color.name}</text>
    <text class="signal-bits" x="${x}" y="${y - 5}">${bits(level)}</text>
  </g>`;
}

function circuit(operation: Operation, route: Route, width: number) {
  const mode = MODES[operation];
  const inputs = activeInputs(operation);
  const { combined, complements, ...results } = evaluate(operation, inputs);
  const output = results[route];
  const centerY = arity === 3 ? 170 : 125;
  const height = arity === 3 ? 310 : 220;
  const lanes = arity === 3 ? [80, 170, 260] : [80, 170];
  const ports = arity === 3 ? [-14, 0, 14] : [-14, 14];
  const first = width * 0.28;
  const end = width - 8;
  const outputX = width - 25;
  let drawing = "";
  if (route === "left") {
    const inverter = width - 89;
    inputs.forEach((_, i) => {
      const port = first + (mode.operator === "OR" ? (ports[i] === 0 ? 8 : 6) : 0);
      drawing += wire(`M8 ${lanes[i]} H${first - 16} V${centerY + ports[i]} H${port}`);
    });
    drawing += wire(`M${first + 50} ${centerY} H${inverter}`) + wire(`M${inverter + 36} ${centerY} H${end}`);
    drawing += logicGate(mode.operator, first, centerY) + notGate(inverter, centerY);
    drawing += signal((first + 50 + inverter) / 2, centerY, combined, "data-combined");
  } else {
    const finalGate = width - 104;
    const bend = finalGate - 12;
    inputs.forEach(({ label }, i) => {
      const port = finalGate + (mode.dual === "OR" ? (ports[i] === 0 ? 8 : 6) : 0);
      drawing += wire(`M8 ${lanes[i]} H${first}`);
      drawing += wire(`M${first + 36} ${lanes[i]} H${bend} V${centerY + ports[i]} H${port}`);
      drawing += notGate(first, lanes[i]);
      drawing += signal((first + 36 + bend) / 2, lanes[i], complements[i], `data-complement-${label}`);
    });
    drawing += wire(`M${finalGate + 50} ${centerY} H${end}`);
    drawing += logicGate(mode.dual, finalGate, centerY);
  }
  inputs.forEach(({ label, value }, i) => {
    drawing += bus(46, lanes[i]) + signal(22, lanes[i], value, "", label);
  });
  drawing += signal(outputX, centerY, output, `data-path-result="${route}"`);
  drawing += `<circle class="terminal" cx="${end}" cy="${centerY}" r="2.5" /><text class="port-name" x="${outputX}" y="${centerY + 29}">${route === "left" ? "y₁" : "y₂"}</text>`;
  const titleId = `${operation}-${route}-title`;
  const description =
    route === "left"
      ? `${inputs.map(({ value }) => name(value)).join("と")}の${mode.operator}は${name(combined)}。NOTを通ると${name(output)} ${bits(output)}。`
      : `${inputs.map(({ value }, i) => `${name(value)}のNOTは${name(complements[i])}`).join("、")}。${mode.dual}を通ると${name(output)} ${bits(output)}。`;
  return `<svg class="circuit-svg" viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${description}</title>${drawing}</svg>`;
}

document.querySelector<HTMLElement>("#app")!.innerHTML = `
  <header>
    <p class="eyebrow">CHROMALUM LAB <span>PROTOTYPE</span></p>
    <h1>色のド・モルガンの法則</h1>
    <p class="intro">演算の結果を補色にする回路と、各入力を補色にして演算する回路を比べます。</p>
    <p class="legend">線上の「3」はGRBの3ビットを表します。ゲートは各ビットに作用し、NOTは補色に対応します。</p>
    <div class="arity-switch" role="group" aria-label="色の入力数">
      <button type="button" data-arity="2" aria-pressed="false">2入力</button>
      <button type="button" data-arity="3" aria-pressed="false">3入力</button>
    </div>
    <p class="arity-description">一つの入力は一つの色です。入力を三つにしても、各色はGRBの3ビットで表します。</p>
    <div class="layout-switch" role="group" aria-label="回路の配置">
      <button type="button" data-layout="outputs" aria-pressed="false">出力を中央</button>
      <button type="button" data-layout="inputs" aria-pressed="false">入力を中央</button>
      <button type="button" data-layout="parallel" aria-pressed="false">並列（元の配置）</button>
    </div>
    <div class="layout-description">
      <p data-description="outputs">右側を左右反転し、両側から同じ出力へ集まります。</p>
      <p data-description="inputs">左側を左右反転し、中央の入力から左右へ分岐します。</p>
      <p data-description="parallel">元の配置：二つの回路を同じ向きに並べます。</p>
    </div>
    <nav aria-label="二つの法則"><a href="#law-or">ORから始める ↓</a><a href="#law-and">ANDから始める ↓</a></nav>
  </header>
  ${OPERATIONS.map(lawSection).join("")}
  <footer>三原色の有無を表す3ビットモデル · OR ∨ / AND ∧ / NOT ¬</footer>
`;

function renderLaw(operation: Operation) {
  const root = document.querySelector<HTMLElement>(`#law-${operation}`)!;
  const mode = MODES[operation];
  const inputs = activeInputs(operation);
  const { combined, complements, left: output } = evaluate(operation, inputs);
  root.dataset.arity = String(arity);
  root.querySelector<HTMLElement>(".law-diagrams")!.hidden = layout !== "parallel";
  root.querySelector<HTMLElement>(".joined-view")!.hidden = layout === "parallel";
  for (const frame of root.querySelectorAll<HTMLElement>(".circuit-frame")) {
    frame.innerHTML = layout === "parallel" ? circuit(operation, frame.dataset.route as Route, frame.getBoundingClientRect().width) : "";
  }
  const joined = root.querySelector<HTMLElement>(".joined-frame")!;
  joined.innerHTML = layout === "parallel" ? "" : facingCircuit(operation, inputs, joined.getBoundingClientRect().width, layout);
  for (const calculation of root.querySelectorAll<HTMLElement>("[data-calculation=left]")) {
    calculation.textContent = `${inputs.map(({ value }) => name(value)).join(` ${mode.symbol} `)} = ${name(combined)} → ¬${name(combined)} = ${name(output)}`;
  }
  for (const calculation of root.querySelectorAll<HTMLElement>("[data-calculation=right]")) {
    calculation.textContent = `${inputs.map(({ value }, i) => `¬${name(value)} = ${name(complements[i])}`).join(", ")} → ${complements.map(name).join(` ${mode.dualSymbol} `)} = ${name(output)}`;
  }
  root.querySelector<HTMLElement>(".result")!.textContent = `出力 y₁ = y₂ = ${name(output)} (${bits(output)})`;
}

function renderInputControls(operation: Operation) {
  const root = document.querySelector<HTMLElement>(`#law-${operation}`)!;
  const labels = INPUT_LABELS.slice(0, arity);
  const mode = MODES[operation];
  root.querySelector<HTMLElement>(".identity")!.textContent =
    `¬(${labels.join(` ${mode.symbol} `)}) = ${labels.map((label) => `¬${label}`).join(` ${mode.dualSymbol} `)}`;
  root.querySelector<HTMLElement>(".inputs")!.innerHTML = labels.map((label) => palette(operation, label)).join("");
  root.querySelector<HTMLElement>(".reset")!.innerHTML =
    `${labels.map((label) => name(mode.initial[label])).join("・")}に戻す <span aria-hidden="true">↺</span>`;
}

function updateArityControls() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-arity]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.arity) === arity));
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-arity]")) {
  button.addEventListener("click", () => {
    const next = Number(button.dataset.arity) as Arity;
    if (next === arity) return;
    arity = next;
    const url = new URL(location.href);
    url.searchParams.set("arity", String(arity));
    history.replaceState(null, "", url);
    updateArityControls();
    for (const operation of OPERATIONS) {
      renderInputControls(operation);
      renderLaw(operation);
    }
  });
}
updateArityControls();

function updateLayoutControls() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-layout]")) {
    button.setAttribute("aria-pressed", String(button.dataset.layout === layout));
  }
  for (const description of document.querySelectorAll<HTMLElement>("[data-description]")) {
    description.setAttribute("aria-hidden", String(description.dataset.description !== layout));
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-layout]")) {
  button.addEventListener("click", () => {
    layout = button.dataset.layout as Layout;
    const url = new URL(location.href);
    url.searchParams.set("layout", layout);
    history.replaceState(null, "", url);
    updateLayoutControls();
    for (const operation of OPERATIONS) renderLaw(operation);
  });
}
updateLayoutControls();

for (const operation of OPERATIONS) {
  const root = document.querySelector<HTMLElement>(`#law-${operation}`)!;
  root.querySelector<HTMLFormElement>(".inputs")!.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !INPUT_LABELS.includes(input.dataset.input as InputLabel)) return;
    selections[arity][operation][input.dataset.input as InputLabel] = Number(input.value);
    renderLaw(operation);
  });
  root.querySelector<HTMLButtonElement>(".reset")!.addEventListener("click", () => {
    Object.assign(selections[arity][operation], MODES[operation].initial);
    for (const input of root.querySelectorAll<HTMLInputElement>(".inputs input")) {
      input.checked = Number(input.value) === selections[arity][operation][input.dataset.input as InputLabel];
    }
    renderLaw(operation);
  });
  renderInputControls(operation);
  renderLaw(operation);
}

// Match the viewBox to the available width so text and gates keep their size.
const widths = new Map<Element, number>();
const resize = new ResizeObserver((entries) => {
  const changed = new Set<Operation>();
  for (const entry of entries) {
    if (widths.get(entry.target) === entry.contentRect.width) continue;
    widths.set(entry.target, entry.contentRect.width);
    changed.add((entry.target as HTMLElement).dataset.operation as Operation);
  }
  for (const operation of changed) renderLaw(operation);
});
for (const frame of document.querySelectorAll(".circuit-frame, .joined-frame")) resize.observe(frame);

if (!location.hash && new URL(location.href).searchParams.get("operation") === "and") {
  requestAnimationFrame(() => document.querySelector("#law-and")!.scrollIntoView());
}
