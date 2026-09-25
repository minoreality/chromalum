import "./style.css";

// Standalone prototype: no imports from the application or its state.
const COLORS = [
  { name: "K", hex: "#000000" },
  { name: "B", hex: "#0000ff" },
  { name: "R", hex: "#ff0000" },
  { name: "M", hex: "#ff00ff" },
  { name: "G", hex: "#00ff00" },
  { name: "C", hex: "#00ffff" },
  { name: "Y", hex: "#ffff00" },
  { name: "W", hex: "#ffffff" },
] as const;

const CHANNELS = [
  { name: "G", bit: 4 },
  { name: "R", bit: 2 },
  { name: "B", bit: 1 },
];

const bits = (level: number) => level.toString(2).padStart(3, "0");
const subset = (level: number) =>
  `{${CHANNELS.filter(({ bit }) => (level & bit) !== 0)
    .map(({ name }) => name)
    .join(",")}}`;
const name = (level: number) => COLORS[level].name;
const MODES = {
  or: { operator: "OR", symbol: "∨", dual: "AND", dualSymbol: "∧", initial: { a: 4, b: 2 } },
  and: { operator: "AND", symbol: "∧", dual: "OR", dualSymbol: "∨", initial: { a: 3, b: 5 } },
} as const;
type Operation = keyof typeof MODES;
let operation: Operation = new URL(location.href).searchParams.get("operation") === "and" ? "and" : "or";
const selections = { or: { ...MODES.or.initial }, and: { ...MODES.and.initial } } as Record<Operation, { a: number; b: number }>;
let selected = selections[operation];

function colorNode(level: number, attributes = "") {
  const color = COLORS[level];
  const ink = level >= 4 ? "#10111b" : "#ffffff";
  return `<div class="color-node" data-level="${level}" ${attributes} title="${color.name} · ${bits(level)} · ${subset(level)}">
    <span class="swatch" style="--swatch: ${color.hex}; --ink: ${ink}">${color.name}</span>
    <span class="bits">${bits(level)}</span>
    <span class="subset">${subset(level)}</span>
  </div>`;
}

function palette(input: "a" | "b") {
  return `<fieldset><legend>入力 ${input}</legend><div class="palette">
    ${COLORS.map(
      (color, level) => `<label class="choice" title="${color.name} · ${bits(level)} · ${subset(level)}">
      <input type="radio" name="${input}" value="${level}" aria-label="${color.name} ${bits(level)}" ${level === selected[input] ? "checked" : ""} />
      <span class="choice-dot" style="--swatch: ${color.hex}"></span><span>${color.name}</span>
    </label>`,
    ).join("")}
  </div></fieldset>`;
}

function wires(type: "split" | "join", left: string, right: string) {
  return `<div class="wires ${type}" aria-hidden="true">
    <span class="stem"></span><span class="bar"></span><span class="leg left"></span><span class="leg right"></span>
    <span class="edge-label left">${left}</span><span class="edge-label right">${right}</span>
  </div>`;
}

document.querySelector<HTMLElement>("#app")!.innerHTML = `
  <header>
    <p class="eyebrow">CHROMALUM LAB <span>PROTOTYPE</span></p>
    <h1>色のド・モルガンの法則</h1>
    <div class="mode-switch" role="group" aria-label="最初の演算">
      <button type="button" class="mode-button" data-operation="or" aria-pressed="false">ORから始める</button>
      <button type="button" class="mode-button" data-operation="and" aria-pressed="false">ANDから始める</button>
    </div>
    <div class="intro mode-copy">
      <p data-description="or">ORの結果を補色にする。入力をそれぞれ補色にして、ANDを取る。<br class="wide-break" />二つの経路は、同じ色に到達します。</p>
      <p data-description="and">ANDの結果を補色にする。入力をそれぞれ補色にして、ORを取る。<br class="wide-break" />二つの経路は、同じ色に到達します。</p>
    </div>
  </header>
  <section class="controls" aria-label="二つの入力を選ぶ">
    <div class="control-heading"><span>入力を選ぶ</span><button type="button" id="reset">G・Rに戻す <span aria-hidden="true">↺</span></button></div>
    <form class="inputs">${palette("a")}${palette("b")}</form>
  </section>
  <section id="diagram" class="diagram" aria-label="同じ結果へ至る二つの経路"></section>
  <p id="announcement" class="sr-only" role="status" aria-live="polite"></p>
  <footer>三原色の有無を表す3ビットモデル · OR ∨ / AND ∧ / 補色 ¬</footer>
`;

function render() {
  const mode = MODES[operation];
  const { a, b } = selected;
  const combined = operation === "or" ? a | b : a & b;
  const complementA = a ^ 7;
  const complementB = b ^ 7;
  const left = combined ^ 7;
  const right = operation === "or" ? complementA & complementB : complementA | complementB;
  const equation = `¬(${name(a)} ${mode.symbol} ${name(b)}) = ${name(complementA)} ${mode.dualSymbol} ${name(complementB)} = ${name(right)}`;

  document.querySelector<HTMLElement>("#diagram")!.innerHTML = `
    <div class="shared-input">
      <p class="node-heading">同じ入力から出発</p>
      <div class="node-pair">${colorNode(a)}<span class="pair-separator">と</span>${colorNode(b)}</div>
    </div>
    ${wires("split", mode.operator, "各入力を補色に")}
    <div class="branch">
      <p class="step-title"><span>①</span> ${mode.operator}の結果</p>
      <div class="node-pair">${colorNode(combined, "data-combined")}</div>
    </div>
    <div class="branch">
      <p class="step-title"><span>②</span> 入力の補色</p>
      <div class="node-pair">${colorNode(complementA, "data-complement-a")}<span class="pair-separator">と</span>${colorNode(complementB, "data-complement-b")}</div>
    </div>
    ${wires("join", "結果を補色に", mode.dual)}
    <div class="shared-result" data-result-level="${right}">
      <p class="node-heading">同じ結果に到達</p>
      ${colorNode(right)}
    </div>
    <div class="proof">
      <p class="identity">¬(a ${mode.symbol} b) = ¬a ${mode.dualSymbol} ¬b</p>
      <p class="equation">${equation}</p>
      <div class="route-calculations">
        <p><span class="route-number">①</span><span>${name(a)} ${mode.symbol} ${name(b)} = ${name(combined)} <span class="calculation-arrow">→</span> ¬${name(combined)} = <strong data-path-result="left" data-level="${left}">${name(left)}</strong></span></p>
        <p><span class="route-number">②</span><span>¬${name(a)} = ${name(complementA)}, ¬${name(b)} = ${name(complementB)} <span class="calculation-arrow">→</span> ${name(complementA)} ${mode.dualSymbol} ${name(complementB)} = <strong data-path-result="right" data-level="${right}">${name(right)}</strong></span></p>
      </div>
      <div class="explanation mode-copy">
        <p data-description="or">どちらの入力にも含まれない原色が、どちらの経路でも残ります。</p>
        <p data-description="and">少なくとも一方の入力に含まれない原色が、どちらの経路でも残ります。</p>
      </div>
    </div>
  `;
  for (const button of document.querySelectorAll<HTMLButtonElement>(".mode-button")) {
    button.setAttribute("aria-pressed", String(button.dataset.operation === operation));
  }
  for (const description of document.querySelectorAll<HTMLElement>("[data-description]")) {
    description.setAttribute("aria-hidden", String(description.dataset.description !== operation));
  }
  document.querySelector<HTMLButtonElement>("#reset")!.innerHTML =
    `${name(mode.initial.a)}・${name(mode.initial.b)}に戻す <span aria-hidden="true">↺</span>`;
  document.querySelector<HTMLElement>("#announcement")!.textContent =
    `${mode.operator}から始める場合。${name(a)}と${name(b)}から、どちらの経路でも${name(right)}になります。`;
}

function syncInputs() {
  for (const input of document.querySelectorAll<HTMLInputElement>(".inputs input")) {
    input.checked = Number(input.value) === selected[input.name as "a" | "b"];
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".mode-button")) {
  button.addEventListener("click", () => {
    operation = button.dataset.operation as Operation;
    selected = selections[operation];
    const url = new URL(location.href);
    url.searchParams.set("operation", operation);
    history.replaceState(null, "", url);
    syncInputs();
    render();
  });
}

document.querySelector<HTMLFormElement>(".inputs")!.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || (input.name !== "a" && input.name !== "b")) return;
  selected[input.name] = Number(input.value);
  render();
});

document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", () => {
  Object.assign(selected, MODES[operation].initial);
  syncInputs();
  render();
});

render();
