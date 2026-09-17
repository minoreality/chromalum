// Octahedron Gray-code net: derivation, census, verification, and figure.
//
// Run from the repository root:
//   node prototypes/octahedron-gray-net/net.mjs
//
// Everything below is derived from raw three-bit words. The one external read is
// a cross-check against the repository's own OCTA_FACES table, so this prototype
// fails loudly if the shared duality in src/data/theory-data.ts ever moves.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const NAME = ["K", "B", "R", "M", "G", "C", "Y", "W"];
const FILL = ["#000000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"];
const CODE = { B: 1, R: 2, M: 3, G: 4, C: 5, Y: 6 };
const CHANNEL = ["B", "R", "G"]; // bit index 0, 1, 2 of value = 4G + 2R + B
const CHANNEL_FILL = ["#4060ff", "#ff3b3b", "#25d366"];
const VERTEX_FILL = { B: "#4060ff", R: "#ff3b3b", M: "#ff5cf0", G: "#25d366", C: "#22d3ee", Y: "#facc15" };

const weight = (n) => ((n >> 2) & 1) + ((n >> 1) & 1) + (n & 1);
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
  console.log("  ok  " + message);
};

// -- The octahedron ----------------------------------------------------------
// Six chromatic colours as vertices; complements are antipodal, giving three
// axes. Each axis holds exactly one primary and one secondary.

const AXES = [
  ["Y", "B"],
  ["C", "R"],
  ["M", "G"],
]; // [secondary, primary] for the B, R and G channels

console.log("axes");
AXES.forEach(([secondary, primary], channel) => {
  assert(
    weight(CODE[primary]) === 1 && weight(CODE[secondary]) === 2 && (CODE[primary] ^ CODE[secondary]) === 7,
    primary + "/" + secondary + " is a primary-secondary complement pair naming channel " + CHANNEL[channel],
  );
  assert(
    ((CODE[primary] >> channel) & 1) === 1 && ((CODE[secondary] >> channel) & 1) === 0,
    primary + " has " + CHANNEL[channel] + " set and " + secondary + " has it clear",
  );
});

// A face takes one vertex per axis, so there are eight.
const faceFor = (word) => AXES.map(([secondary, primary], channel) => (((word >> channel) & 1) === 1 ? primary : secondary));
const FACES = [0, 1, 2, 3, 4, 5, 6, 7].map(faceFor);

// Duality: the face's colour is the sum of the primaries among its vertices.
const dual = (face) => face.reduce((acc, ch) => (weight(CODE[ch]) === 1 ? acc | CODE[ch] : acc), 0);

console.log("\nduality");
assert(
  FACES.every((face, word) => dual(face) === word),
  "face colour = sum of the primary vertices, inverse of the face construction",
);

// Cross-check against the shared table rather than trusting the derivation alone.
const source = fs.readFileSync(path.join(ROOT, "src", "data", "theory-data.ts"), "utf8");
const marker = source.indexOf("export const OCTA_FACES");
if (marker < 0) throw new Error("OCTA_FACES not found in src/data/theory-data.ts");
const body = source.slice(source.indexOf("= [", marker) + 3);
const repoFaces = [...body.slice(0, body.indexOf("\n];")).matchAll(/verts:\s*\[(\d+),\s*(\d+),\s*(\d+)\]\s*,\s*color:\s*(\d+)/g)].map(
  (m) => ({ verts: [+m[1], +m[2], +m[3]], color: +m[4] }),
);
assert(repoFaces.length === 8, "parsed all eight faces out of src/data/theory-data.ts");
assert(
  repoFaces.every((row) => row.verts.reduce((acc, v) => (weight(v) === 1 ? acc | v : acc), 0) === row.color),
  "the repository's own face colours obey the same rule",
);

// -- Census of the nets ------------------------------------------------------
// A net is a spanning tree of the face-adjacency graph. Two faces share an edge
// when they differ in one axis choice, so that graph is the cube graph Q3.

const share = (a, b) => FACES[a].filter((v) => FACES[b].includes(v));
const adjacent = FACES.map((_, a) => FACES.map((_, b) => b).filter((b) => b !== a && share(a, b).length === 2));

console.log("\nface graph");
assert(
  adjacent.every((ns, a) => ns.length === 3 && ns.every((b) => weight(a ^ b) === 1)),
  "face adjacency is a one-bit difference, so the face graph is Q3 (degree 3, odd)",
);

const spanningTrees = (() => {
  const laplacian = Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: 8 }, (_, j) => (i === j ? adjacent[i].length : adjacent[i].includes(j) ? -1 : 0)),
  );
  const minor = laplacian.slice(1).map((row) => row.slice(1));
  let determinant = 1;
  for (let i = 0; i < minor.length; i++) {
    let pivot = i;
    while (pivot < minor.length && Math.abs(minor[pivot][i]) < 1e-9) pivot++;
    if (pivot !== i) {
      const swap = minor[i];
      minor[i] = minor[pivot];
      minor[pivot] = swap;
      determinant = -determinant;
    }
    determinant *= minor[i][i];
    for (let r = i + 1; r < minor.length; r++) {
      const factor = minor[r][i] / minor[i][i];
      for (let c = i; c < minor.length; c++) minor[r][c] -= factor * minor[i][c];
    }
  }
  return Math.round(determinant);
})();

const paths = [];
for (let start = 0; start < 8; start++) {
  const walkFrom = (v, seen, seq) => {
    if (seq.length === 8) {
      if (seq[0] < seq[7]) paths.push([...seq]);
      return;
    }
    for (const u of adjacent[v]) {
      if (seen.has(u)) continue;
      seen.add(u);
      seq.push(u);
      walkFrom(u, seen, seq);
      seq.pop();
      seen.delete(u);
    }
  };
  walkFrom(start, new Set([start]), [start]);
}
const closed = paths.filter((p) => adjacent[p[7]].includes(p[0]));

console.log("\ncensus");
assert(spanningTrees === 384, "Q3 has 384 spanning trees, so 384 labelled nets in all");
assert(paths.length === 72, "72 of them are paths, the only shape that can carry a Gray code");
assert(closed.length === 48, "48 of those are a cyclic Gray code with one gluing cut");

// -- Unfolding ---------------------------------------------------------------

const SIN60 = Math.sqrt(3) / 2;
const reflect = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = dx * dx + dy * dy;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d;
  const foot = [a[0] + t * dx, a[1] + t * dy];
  return [2 * foot[0] - p[0], 2 * foot[1] - p[1]];
};
const centroid = (placed) => {
  const keys = Object.keys(placed);
  return [keys.reduce((s, k) => s + placed[k][0], 0) / keys.length, keys.reduce((s, k) => s + placed[k][1], 0) / keys.length];
};

function unfold(tour) {
  const last = tour.length - 1;
  const seams = [];
  for (let i = 0; i < last; i++) seams.push(tour[i].filter((v) => tour[i + 1].includes(v)));
  const placed = [{ [tour[0][0]]: [0, 0], [tour[0][1]]: [1, 0], [tour[0][2]]: [0.5, SIN60] }];
  for (let i = 0; i < last; i++) {
    const previous = placed[i];
    const [s, t] = seams[i];
    const oldApex = tour[i].find((v) => !seams[i].includes(v));
    const newApex = tour[i + 1].find((v) => !seams[i].includes(v));
    placed.push({
      [s]: previous[s],
      [t]: previous[t],
      [newApex]: reflect(previous[oldApex], previous[s], previous[t]),
    });
  }
  return { placed, seams };
}

// Two shapes exist among the 48. The one chosen here is the palindromic cut: it
// renders the reflected Gray code's own recursion, with the slow channel
// flipping exactly once, in the middle.
const WALK = [0, 1, 3, 2, 6, 7, 5, 4]; // K B M R Y W C G, rightmost digit fastest
const TOUR = WALK.map(faceFor);
const flips = WALK.map((v, i) => v ^ WALK[(i + 1) % 8]);
const flipBit = flips.map((d) => [1, 2, 4].indexOf(d));
const linear = flipBit.slice(0, 7);

console.log("\nchosen tour");
assert(
  TOUR.every((face, i) => face.filter((v) => TOUR[(i + 1) % 8].includes(v)).length === 2),
  "consecutive faces share an edge all the way round, including the cut",
);
assert(
  flips.every((d) => weight(d) === 1),
  "every gluing flips exactly one channel",
);
assert(
  linear.join() === [...linear].reverse().join(),
  "the linear flip sequence " + linear.map((k) => CHANNEL[k]).join(" ") + " is a palindrome",
);
{
  const counts = [0, 0, 0];
  for (const k of flipBit) counts[k]++;
  assert(
    counts.filter((c) => c === 4).length === 1 && counts.filter((c) => c === 2).length === 2,
    "channel counts are " + counts.join(", ") + ": one fast and two slow, which 8 steps over 3 channels forces",
  );
}

const { placed, seams } = unfold(TOUR);
let centres = placed.map(centroid);
{
  let clashes = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      if (Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1]) < 1e-6) clashes++;
    }
  }
  assert(clashes === 0, "the eight triangles lie flat without overlapping, so this is a valid net");
}
const slide = [centres[4][0] - centres[0][0], centres[4][1] - centres[0][1]];
assert(
  [0, 1, 2, 3].every((i) => Math.hypot(centres[i][0] + slide[0] - centres[i + 4][0], centres[i][1] + slide[1] - centres[i + 4][1]) < 1e-9),
  "the second half is the first half translated by a single vector",
);
assert(
  [0, 1, 2, 3].every((i) => (WALK[i] ^ WALK[i + 4]) === (WALK[0] ^ WALK[4])),
  "that translation is the constant xor " + NAME[WALK[0] ^ WALK[4]],
);
{
  const opposite = (face) => face.map((ch) => Object.keys(CODE).find((k) => CODE[k] === (CODE[ch] ^ 7)));
  assert(
    TOUR.every((face) => (dual(face) ^ dual(opposite(face))) === 7),
    "opposite faces on the solid carry complementary colours",
  );
}

// -- Figure ------------------------------------------------------------------

const angle = -Math.atan2(slide[1], slide[0]);
const cos = Math.cos(angle);
const sin = Math.sin(angle);
const turned = placed.map((p) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos]])),
);
centres = turned.map(centroid);

const SCALE = 118;
const all = turned.flatMap((p) => Object.values(p));
const minX = Math.min(...all.map((v) => v[0]));
const minY = Math.min(...all.map((v) => v[1]));
const PAD_X = 54;
const PAD_TOP = 124;
const STRIP = 150;
const W = (Math.max(...all.map((v) => v[0])) - minX) * SCALE + 2 * PAD_X;
const H = (Math.max(...all.map((v) => v[1])) - minY) * SCALE + PAD_TOP + STRIP;
const px = (x) => (x - minX) * SCALE + PAD_X;
const py = (y) => (y - minY) * SCALE + PAD_TOP;
const FONT = 'font-family="ui-monospace,Consolas,monospace"';

let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W.toFixed(0) + " " + H.toFixed(0) + '"';
svg += ' width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '">';
svg += '<rect width="100%" height="100%" fill="#0e1014"/>';
svg += '<text x="' + PAD_X + '" y="30" fill="#cbd5e1" ' + FONT + ' font-size="14">';
svg += "face fill = dual cube vertex,  GRB = 4G+2R+B</text>";
svg += '<text x="' + PAD_X + '" y="52" fill="#8b919b" ' + FONT + ' font-size="13">';
svg += "small dots = octahedron vertices (chromatic six)</text>";

const mirrorX = (px(turned[3][seams[3][0]][0]) + px(turned[3][seams[3][1]][0])) / 2;
svg += '<text x="' + mirrorX.toFixed(1) + '" y="82" fill="#9ca3af" ' + FONT;
svg += ' font-size="13" text-anchor="middle">reflect</text>';
svg += '<line x1="' + mirrorX.toFixed(1) + '" y1="90" x2="' + mirrorX.toFixed(1) + '"';
svg += ' y2="' + (H - STRIP + 104).toFixed(1) + '" stroke="#4b5563" stroke-width="1.5" stroke-dasharray="6 7"/>';

turned.forEach((p, i) => {
  const pts = Object.keys(p)
    .map((k) => px(p[k][0]).toFixed(1) + "," + py(p[k][1]).toFixed(1))
    .join(" ");
  svg += '<polygon points="' + pts + '" fill="' + FILL[WALK[i]] + '" stroke="#6b7280" stroke-width="1.5"/>';
  const ink = WALK[i] >= 4 ? "#000" : "#fff"; // the app's own label-contrast rule
  svg += '<text x="' + px(centres[i][0]).toFixed(1) + '" y="' + (py(centres[i][1]) - 3).toFixed(1) + '"';
  svg += ' fill="' + ink + '" ' + FONT + ' font-size="21" font-weight="700" text-anchor="middle">';
  svg += NAME[WALK[i]] + "</text>";
  svg += '<text x="' + px(centres[i][0]).toFixed(1) + '" y="' + (py(centres[i][1]) + 17).toFixed(1) + '"';
  svg += ' fill="' + ink + '" ' + FONT + ' font-size="15" text-anchor="middle">';
  svg += WALK[i].toString(2).padStart(3, "0") + "</text>";
});

const seamX = [];
for (let i = 0; i < 7; i++) {
  const [a, b] = seams[i];
  const p = turned[i];
  const k = flipBit[i];
  svg += '<line x1="' + px(p[a][0]).toFixed(1) + '" y1="' + py(p[a][1]).toFixed(1) + '"';
  svg += ' x2="' + px(p[b][0]).toFixed(1) + '" y2="' + py(p[b][1]).toFixed(1) + '"';
  svg += ' stroke="' + CHANNEL_FILL[k] + '" stroke-width="7" stroke-linecap="round"/>';
  const mx = (px(p[a][0]) + px(p[b][0])) / 2;
  const my = (py(p[a][1]) + py(p[b][1])) / 2;
  seamX.push(mx);
  svg += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="13" fill="#0e1014"';
  svg += ' stroke="' + CHANNEL_FILL[k] + '" stroke-width="2.5"/>';
  svg += '<text x="' + mx.toFixed(1) + '" y="' + (my + 5).toFixed(1) + '" fill="' + CHANNEL_FILL[k] + '"';
  svg += " " + FONT + ' font-size="14" font-weight="700" text-anchor="middle">' + CHANNEL[k] + "</text>";
}
{
  const p = turned[7];
  const e = TOUR[7].filter((v) => TOUR[0].includes(v));
  svg += '<line x1="' + px(p[e[0]][0]).toFixed(1) + '" y1="' + py(p[e[0]][1]).toFixed(1) + '"';
  svg += ' x2="' + px(p[e[1]][0]).toFixed(1) + '" y2="' + py(p[e[1]][1]).toFixed(1) + '"';
  svg += ' stroke="' + CHANNEL_FILL[flipBit[7]] + '" stroke-width="5" stroke-dasharray="8 6"';
  svg += ' stroke-linecap="round" opacity="0.85"/>';
}

const drawn = new Set();
turned.forEach((p) => {
  for (const [k, v] of Object.entries(p)) {
    const id = k + ":" + px(v[0]).toFixed(1) + "," + py(v[1]).toFixed(1);
    if (drawn.has(id)) continue;
    drawn.add(id);
    svg += '<circle cx="' + px(v[0]).toFixed(1) + '" cy="' + py(v[1]).toFixed(1) + '" r="5.5"';
    svg += ' fill="' + VERTEX_FILL[k] + '" stroke="#0e1014" stroke-width="1.8"/>';
    svg += '<text x="' + px(v[0]).toFixed(1) + '" y="' + (py(v[1]) - 11).toFixed(1) + '"';
    svg += ' fill="#8b919b" ' + FONT + ' font-size="12" text-anchor="middle">' + k + "</text>";
  }
});

const baseline = H - STRIP + 64;
svg += '<text x="' + PAD_X + '" y="' + (baseline - 32) + '" fill="#9ca3af" ' + FONT;
svg += ' font-size="13">flip sequence</text>';
linear.forEach((k, i) => {
  svg += '<text x="' + seamX[i].toFixed(1) + '" y="' + baseline + '" fill="' + CHANNEL_FILL[k] + '"';
  svg += " " + FONT + ' font-size="24" font-weight="700" text-anchor="middle">' + CHANNEL[k] + "</text>";
});
const bracket = (from, to) => {
  let d = "M " + seamX[from].toFixed(1) + " " + (baseline + 16);
  d += " L " + seamX[from].toFixed(1) + " " + (baseline + 26);
  d += " L " + seamX[to].toFixed(1) + " " + (baseline + 26);
  d += " L " + seamX[to].toFixed(1) + " " + (baseline + 16);
  return '<path d="' + d + '" fill="none" stroke="#6b7280" stroke-width="1.5"/>';
};
svg += bracket(0, 2) + bracket(4, 6);
svg += '<text x="' + ((seamX[0] + seamX[2]) / 2).toFixed(1) + '" y="' + (baseline + 44) + '"';
svg += ' fill="#9ca3af" ' + FONT + ' font-size="13" text-anchor="middle">2-bit Gray on B,R</text>';
svg += '<text x="' + ((seamX[4] + seamX[6]) / 2).toFixed(1) + '" y="' + (baseline + 44) + '"';
svg += ' fill="#9ca3af" ' + FONT + ' font-size="13" text-anchor="middle">the same, reversed</text>';
svg += '<text x="' + seamX[3].toFixed(1) + '" y="' + (baseline + 70) + '"';
svg += ' fill="#9ca3af" ' + FONT + ' font-size="13" text-anchor="middle">G flips once, at the centre</text>';
svg += "</svg>";

const out = path.join(HERE, "octahedron-gray-net.svg");
fs.writeFileSync(out, svg);
console.log("\nwalk  " + WALK.map((v) => NAME[v] + " " + v.toString(2).padStart(3, "0")).join("  "));
console.log("faces " + TOUR.map((f) => f.join("")).join(" "));
console.log("wrote " + path.relative(ROOT, out).split(path.sep).join("/"));

// -- Infinite band -----------------------------------------------------------
// Keep walking the cycle instead of stopping after eight faces. The unfolding
// never closes and never overlaps, so the net is the repeating unit of a band.
// That turns the palindrome from a property of a printed row into an actual
// mirror symmetry of the drawing.

const bandWords = (count) => Array.from({ length: count }, (_, i) => WALK[i % 8]);

console.log("\ninfinite band");
{
  const words = bandWords(32);
  const { placed: long } = unfold(words.map(faceFor));
  const centresLong = long.map(centroid);
  let clashes = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (Math.hypot(centresLong[i][0] - centresLong[j][0], centresLong[i][1] - centresLong[j][1]) < 1e-6) clashes++;
    }
  }
  assert(clashes === 0, "walking the cycle four times lays 32 triangles flat with no overlap");

  const step = [centresLong[4][0] - centresLong[0][0], centresLong[4][1] - centresLong[0][1]];
  assert(
    centresLong
      .slice(0, -4)
      .every((q, i) => Math.hypot(q[0] + step[0] - centresLong[i + 4][0], q[1] + step[1] - centresLong[i + 4][1]) < 1e-9),
    "every triangle maps onto the fourth one along, so the band repeats with a 4-triangle unit",
  );
  assert(
    (WALK[0] ^ WALK[4]) !== 0 && (WALK[0] ^ WALK[8 % 8]) === 0,
    "the geometric period is 4 triangles while the colours only come back after 8",
  );

  // Reflecting the band across a seam's own line is a symmetry, and it is exactly
  // the inversion of whichever channel that seam flips. B seams are not mirrors.
  const bandFlips = words
    .slice(1)
    .map((w, i) => w ^ words[i])
    .map((d) => [1, 2, 4].indexOf(d));
  const { seams: longSeams } = unfold(words.map(faceFor));
  for (const seamIndex of [1, 3, 5, 7]) {
    const [a, b] = longSeams[seamIndex];
    const line = long[seamIndex];
    const channel = bandFlips[seamIndex];
    let matched = 0;
    let labelled = true;
    centresLong.forEach((q, i) => {
      const image = reflect(q, line[a], line[b]);
      const j = centresLong.findIndex((t) => Math.hypot(t[0] - image[0], t[1] - image[1]) < 1e-9);
      if (j < 0) return;
      matched++;
      if ((words[i] ^ words[j]) !== 1 << channel) labelled = false;
    });
    const reachable = 2 * Math.min(seamIndex + 1, words.length - seamIndex - 1);
    assert(
      matched === reachable && labelled,
      "the line through seam " + (seamIndex + 1) + " (" + CHANNEL[channel] + ") mirrors the whole band and inverts " + CHANNEL[channel],
    );
  }

  // The fast channel's seams are not mirrors, so the band has two mirror
  // families and not three. Seam 1 is skipped: its window reaches two triangles,
  // too few for the test to say anything.
  for (const seamIndex of [2, 4, 6]) {
    const [a, b] = longSeams[seamIndex];
    const line = long[seamIndex];
    let matched = 0;
    centresLong.forEach((q) => {
      const image = reflect(q, line[a], line[b]);
      if (centresLong.some((t) => Math.hypot(t[0] - image[0], t[1] - image[1]) < 1e-9)) matched++;
    });
    const reachable = 2 * Math.min(seamIndex + 1, words.length - seamIndex - 1);
    assert(
      bandFlips[seamIndex] === 0 && matched < reachable,
      "the line through seam " + (seamIndex + 1) + " (" + CHANNEL[bandFlips[seamIndex]] + ") is not a mirror of the band",
    );
  }
}

// Two colourings of the same band. "flip" strokes each seam with the channel that
// inverts across it, which is what the Gray code is about. "xor" strokes it with the
// XOR of the shared edge's two endpoints, which is how ChromaticOctahedron colours the
// Color Diamond. They agree on exactly half the edges; see the README.
function buildBand(mode) {
  const xorMode = mode === "xor";
  const COUNT = 14;
  const words = bandWords(COUNT);
  const tour = words.map(faceFor);
  const { placed: raw, seams: bandSeams } = unfold(tour);
  let mid = raw.map(centroid);
  const step = [mid[4][0] - mid[0][0], mid[4][1] - mid[0][1]];
  const turn = -Math.atan2(step[1], step[0]);
  const bc = Math.cos(turn);
  const bs = Math.sin(turn);
  const band = raw.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [v[0] * bc - v[1] * bs, v[0] * bs + v[1] * bc]])));
  mid = band.map(centroid);
  const bandFlips = words
    .slice(1)
    .map((w, i) => w ^ words[i])
    .map((d) => [1, 2, 4].indexOf(d));

  const edgeXor = bandSeams.map(([a, b]) => CODE[a] ^ CODE[b]);
  const seamInk = (i) => (xorMode ? FILL[edgeXor[i]] : CHANNEL_FILL[bandFlips[i]]);

  const S = 96;
  const pts = band.flatMap((p) => Object.values(p));
  const bx = Math.min(...pts.map((p) => p[0]));
  const by = Math.min(...pts.map((p) => p[1]));
  const PAD = 10;
  const TOP = 118;
  const BOTTOM = xorMode ? 196 : 126;
  const BW = (Math.max(...pts.map((p) => p[0])) - bx) * S + 2 * PAD;
  const BH = (Math.max(...pts.map((p) => p[1])) - by) * S + TOP + BOTTOM;
  const qx = (x) => (x - bx) * S + PAD;
  const qy = (y) => (y - by) * S + TOP;
  const BG = "#0e1014";

  let band_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + BW.toFixed(0) + " " + BH.toFixed(0) + '"';
  band_svg += ' width="' + BW.toFixed(0) + '" height="' + BH.toFixed(0) + '"><defs>';
  band_svg += '<linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="' + BG + '"/>';
  band_svg += '<stop offset="1" stop-color="' + BG + '" stop-opacity="0"/></linearGradient>';
  band_svg += '<linearGradient id="fadeR" x1="1" x2="0"><stop offset="0" stop-color="' + BG + '"/>';
  band_svg += '<stop offset="1" stop-color="' + BG + '" stop-opacity="0"/></linearGradient>';
  // The mirror lines run far past the seams so they read as lines, not segments,
  // so clip them to the panel or they spill onto the page around the figure.
  band_svg += '<clipPath id="panel"><rect width="' + BW.toFixed(0) + '" height="' + BH.toFixed(0) + '"/></clipPath>';
  band_svg += "</defs>";
  band_svg += '<rect width="100%" height="100%" fill="' + BG + '"/>';
  band_svg += '<text x="' + (BW / 2).toFixed(1) + '" y="34" fill="#cbd5e1" ' + FONT;
  band_svg += ' font-size="15" text-anchor="middle">';
  band_svg +=
    (xorMode ? "the same band, seams coloured the way the Color Diamond colours its edges" : "the net tiles a band that never ends") +
    "</text>";
  band_svg += '<text x="' + (BW / 2).toFixed(1) + '" y="58" fill="#8b919b" ' + FONT + ' font-size="13" text-anchor="middle">';
  band_svg += xorMode
    ? "seam colour = XOR of the two shared vertices; the dashed lines are still the mirrors"
    : "every G seam and every R seam is a mirror line, and each one inverts that channel";
  band_svg += "</text>";

  band_svg += '<g clip-path="url(#panel)">';
  for (let i = 0; i < COUNT - 1; i++) {
    if (bandFlips[i] === 0) continue; // B seams are not mirrors
    const [a, b] = bandSeams[i];
    const p = band[i];
    const ax = qx(p[a][0]);
    const ay = qy(p[a][1]);
    const dx = qx(p[b][0]) - ax;
    const dy = qy(p[b][1]) - ay;
    const grow = 1200 / Math.hypot(dx, dy);
    // In xor mode the seams already use the six chromatic colours, so keep the
    // mirror lines neutral and name the channel they invert instead.
    const ink = xorMode ? "#6b7280" : CHANNEL_FILL[bandFlips[i]];
    band_svg += '<line x1="' + (ax - dx * grow).toFixed(1) + '" y1="' + (ay - dy * grow).toFixed(1) + '"';
    band_svg += ' x2="' + (ax + dx * (1 + grow)).toFixed(1) + '" y2="' + (ay + dy * (1 + grow)).toFixed(1) + '"';
    band_svg += ' stroke="' + ink + '" stroke-width="1.4" stroke-dasharray="5 6" opacity="0.55"/>';
    if (xorMode) {
      band_svg += '<text x="' + (ax + dx * 0.5).toFixed(1) + '" y="84" fill="' + CHANNEL_FILL[bandFlips[i]] + '"';
      band_svg += " " + FONT + ' font-size="12" text-anchor="middle">mirror ' + CHANNEL[bandFlips[i]] + "</text>";
    }
  }
  band_svg += "</g>";
  band.forEach((p, i) => {
    const poly = Object.keys(p)
      .map((k) => qx(p[k][0]).toFixed(1) + "," + qy(p[k][1]).toFixed(1))
      .join(" ");
    band_svg += '<polygon points="' + poly + '" fill="' + FILL[words[i]] + '" stroke="#6b7280" stroke-width="1.4"/>';
    const ink = words[i] >= 4 ? "#000" : "#fff";
    band_svg += '<text x="' + qx(mid[i][0]).toFixed(1) + '" y="' + (qy(mid[i][1]) - 1).toFixed(1) + '"';
    band_svg += ' fill="' + ink + '" ' + FONT + ' font-size="17" font-weight="700" text-anchor="middle">' + NAME[words[i]] + "</text>";
    band_svg += '<text x="' + qx(mid[i][0]).toFixed(1) + '" y="' + (qy(mid[i][1]) + 15).toFixed(1) + '"';
    band_svg += ' fill="' + ink + '" ' + FONT + ' font-size="12" text-anchor="middle">' + words[i].toString(2).padStart(3, "0") + "</text>";
  });
  const bandSeamX = [];
  for (let i = 0; i < COUNT - 1; i++) {
    const [a, b] = bandSeams[i];
    const p = band[i];
    band_svg += '<line x1="' + qx(p[a][0]).toFixed(1) + '" y1="' + qy(p[a][1]).toFixed(1) + '"';
    band_svg += ' x2="' + qx(p[b][0]).toFixed(1) + '" y2="' + qy(p[b][1]).toFixed(1) + '"';
    band_svg += ' stroke="' + seamInk(i) + '" stroke-width="6" stroke-linecap="round"/>';
    bandSeamX.push((qx(p[a][0]) + qx(p[b][0])) / 2);
  }
  const seen = new Set();
  band.forEach((p) => {
    for (const [k, v] of Object.entries(p)) {
      const id = k + ":" + qx(v[0]).toFixed(1) + "," + qy(v[1]).toFixed(1);
      if (seen.has(id)) continue;
      seen.add(id);
      band_svg += '<circle cx="' + qx(v[0]).toFixed(1) + '" cy="' + qy(v[1]).toFixed(1) + '" r="4.5"';
      band_svg += ' fill="' + VERTEX_FILL[k] + '" stroke="' + BG + '" stroke-width="1.6"/>';
    }
  });
  const fadeTop = TOP - 30;
  const fadeHeight = (BH - TOP - BOTTOM + 60).toFixed(0);
  band_svg += '<rect x="0" y="' + fadeTop + '" width="110" height="' + fadeHeight + '" fill="url(#fadeL)"/>';
  band_svg += '<rect x="' + (BW - 110).toFixed(0) + '" y="' + fadeTop + '" width="110" height="' + fadeHeight + '" fill="url(#fadeR)"/>';

  const row = BH - BOTTOM + 58;
  const dimAt = (i) => (i < 1 || i > COUNT - 3 ? "0.35" : "1");
  const glyphRow = (y, ink, text, size) => {
    bandSeamX.forEach((x, i) => {
      band_svg += '<text x="' + x.toFixed(1) + '" y="' + y + '" fill="' + ink(i) + '"';
      band_svg += " " + FONT + ' font-size="' + size + '" font-weight="700" text-anchor="middle"';
      band_svg += ' opacity="' + dimAt(i) + '">' + text(i) + "</text>";
    });
    for (const x of [bandSeamX[0] - 34, bandSeamX[COUNT - 2] + 34]) {
      band_svg += '<text x="' + x.toFixed(1) + '" y="' + y + '" fill="#6b7280" ' + FONT;
      band_svg += ' font-size="' + size + '" text-anchor="middle">...</text>';
    }
  };
  const caption = (x, y, text) => {
    band_svg += '<text x="' + x.toFixed(1) + '" y="' + y + '" fill="#9ca3af" ' + FONT;
    band_svg += ' font-size="12">' + text + "</text>";
  };

  let unitTop;
  if (xorMode) {
    caption(PAD, row - 20, "edge XOR, as the Color Diamond strokes it");
    glyphRow(
      row,
      (i) => FILL[edgeXor[i]],
      (i) => NAME[edgeXor[i]],
      19,
    );
    // "=" where the two rules agree, the complement sign where they do not
    bandSeamX.forEach((x, i) => {
      const same = edgeXor[i] === 1 << bandFlips[i];
      band_svg += '<text x="' + x.toFixed(1) + '" y="' + (row + 22) + '" fill="#6b7280"';
      band_svg += " " + FONT + ' font-size="13" text-anchor="middle" opacity="' + dimAt(i) + '">';
      band_svg += (same ? "=" : "¬") + "</text>";
    });
    caption(PAD, row + 26, "flipped channel");
    glyphRow(
      row + 46,
      (i) => CHANNEL_FILL[bandFlips[i]],
      (i) => CHANNEL[bandFlips[i]],
      19,
    );
    unitTop = row + 62;
  } else {
    glyphRow(
      row,
      (i) => CHANNEL_FILL[bandFlips[i]],
      (i) => CHANNEL[bandFlips[i]],
      19,
    );
    unitTop = row + 14;
  }

  const unitFrom = bandSeamX[2];
  const unitTo = bandSeamX[6];
  let unit = "M " + unitFrom.toFixed(1) + " " + unitTop + " L " + unitFrom.toFixed(1) + " " + (unitTop + 11);
  unit += " L " + unitTo.toFixed(1) + " " + (unitTop + 11) + " L " + unitTo.toFixed(1) + " " + unitTop;
  band_svg += '<path d="' + unit + '" fill="none" stroke="#6b7280" stroke-width="1.5"/>';
  band_svg += '<text x="' + ((unitFrom + unitTo) / 2).toFixed(1) + '" y="' + (unitTop + 30) + '"';
  band_svg += ' fill="#9ca3af" ' + FONT + ' font-size="13" text-anchor="middle">';
  band_svg += "repeating unit: 4 triangles, colours repeat after 8</text>";
  if (xorMode) {
    band_svg += '<text x="' + (BW / 2).toFixed(1) + '" y="' + (unitTop + 52) + '"';
    band_svg += ' fill="#8b919b" ' + FONT + ' font-size="12" text-anchor="middle">';
    band_svg += "the two rules agree on half the seams and are complements on the rest</text>";
  }
  band_svg += "</svg>";

  const name = xorMode ? "octahedron-gray-band-xor.svg" : "octahedron-gray-band.svg";
  const bandOut = path.join(HERE, name);
  fs.writeFileSync(bandOut, band_svg);
  console.log("wrote " + path.relative(ROOT, bandOut).split(path.sep).join("/"));
}

// The XOR colouring must reproduce the Color Diamond's own edge colours.
{
  const words = bandWords(9);
  const { seams: check } = unfold(words.map(faceFor));
  const agree = check.filter(([a, b], i) => (CODE[a] ^ CODE[b]) === 1 << [1, 2, 4].indexOf(words[i] ^ words[i + 1])).length;
  assert(
    check.every(([a, b]) => weight(CODE[a] ^ CODE[b]) > 0 && (CODE[a] ^ CODE[b]) !== 7),
    "every seam's XOR is a chromatic colour, never K or W",
  );
  assert(agree === 4 && check.length === 8, "the XOR rule and the flip rule agree on 4 of the 8 seams in one turn of the cycle");
}

buildBand("flip");
buildBand("xor");

// -- The plane ---------------------------------------------------------------
// The band is one strip. Slide a copy sideways by a single triangle side and the
// copies interlock, so the net tiles the whole plane. The copies carry the same
// colours, and the one-bit rule survives across the joins, which makes the whole
// tiling a Gray-code colouring in two directions rather than one.

const SNAP = (x) => {
  const y = Math.round(x * 1e4) / 1e4;
  return (y === 0 ? 0 : y).toFixed(4);
};
const CELL = (p) => SNAP(p[0]) + "," + SNAP(p[1]);
const NEIGHBOUR_GAP = 1 / Math.sqrt(3); // centroid distance between two triangles sharing an edge

const period = (() => {
  const { placed } = unfold(bandWords(9).map(faceFor));
  const mid = placed.map(centroid);
  return { placed: placed.slice(0, 4), mid: mid.slice(0, 4), lift: [0, mid[4][1] - mid[0][1]] };
})();
const SIDEWAYS = [1, 0];
const planeCell = (i, k, j) => ({
  point: [period.mid[i][0] + SIDEWAYS[0] * j, period.mid[i][1] + period.lift[1] * k],
  word: WALK[(((i + 4 * k) % 8) + 8) % 8],
  band: j,
});

console.log("\nthe plane");
{
  const REACH = 4.5;
  const inside = (p) => Math.abs(p[0]) < REACH && Math.abs(p[1]) < REACH;
  const laid = new Map();
  let doubled = 0;
  for (let j = -9; j <= 9; j++) {
    for (let k = -9; k <= 9; k++) {
      for (let i = 0; i < 4; i++) {
        const cell = planeCell(i, k, j);
        if (!inside(cell.point)) continue;
        const id = CELL(cell.point);
        if (laid.has(id)) doubled++;
        laid.set(id, cell);
      }
    }
  }
  assert(doubled === 0, "sliding the band sideways by one triangle side never puts two triangles in the same place");

  // No gaps either: compare against the unit triangular grid over the same window.
  const grid = [];
  for (let a = -12; a <= 12; a++) {
    for (let b = -12; b <= 12; b++) {
      const ox = a + b * 0.5;
      const oy = b * SIN60;
      grid.push([ox + 0.5, oy + SIN60 / 3]);
      grid.push([ox + 1, oy + (2 * SIN60) / 3]);
    }
  }
  const wanted = grid.filter(inside);
  assert(wanted.every((p) => laid.has(CELL(p))) && wanted.length === laid.size, "and it leaves no gaps, so the net tiles the plane");

  const cells = [...laid.values()];
  const crossings = new Map();
  let broken = 0;
  for (const a of cells) {
    for (const b of cells) {
      if (a === b) continue;
      if (Math.abs(Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1]) - NEIGHBOUR_GAP) > 1e-6) continue;
      const d = a.word ^ b.word;
      if (weight(d) !== 1) broken++;
      crossings.set(d, (crossings.get(d) ?? 0) + 1);
    }
  }
  assert(broken === 0, "every pair of triangles sharing an edge differs in exactly one channel, anywhere in the plane");

  // Crossing from one band into the next always inverts the fast channel.
  const across = new Set();
  let crossingPairs = 0;
  for (const a of cells) {
    for (const b of cells) {
      if (Math.abs(a.band - b.band) !== 1) continue;
      if (Math.abs(Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1]) - NEIGHBOUR_GAP) > 1e-6) continue;
      crossingPairs++;
      across.add(a.word ^ b.word);
    }
  }
  assert(
    crossingPairs > 0 && across.size === 1 && across.has(1),
    "crossing the join between two bands always inverts " + CHANNEL[0] + ", the fast channel",
  );

  // The colouring repeats on a lattice of eight triangles holding all eight colours.
  const domain = [0, 1].flatMap((k) => [0, 1, 2, 3].map((i) => planeCell(i, k, 0).word));
  assert(new Set(domain).size === 8, "one period of the colouring is 8 triangles carrying all eight colours exactly once");
  assert(
    Math.abs(2 * period.lift[1] * SIDEWAYS[0] - 8 * (Math.sqrt(3) / 4)) < 1e-9,
    "that period spans w by 2v, an area of exactly 8 unit triangles",
  );
}

// -- Which nets tile at all --------------------------------------------------
// The band above is not the only net that tiles. Take every net, flatten it,
// and ask two questions: does it tile the plane by translations, and does the
// colouring survive the joins? The answers cut 384 down to 2 shapes.

console.log("\ncensus of tilings");
{
  const edgeList = [];
  for (let a = 0; a < 8; a++) for (const b of adjacent[a]) if (a < b) edgeList.push([a, b]);

  const trees = [];
  const choose = (start, taken) => {
    if (taken.length === 7) {
      const parent = [...Array(8).keys()];
      const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      for (const [a, b] of taken) {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return;
        parent[ra] = rb;
      }
      trees.push([...taken]);
      return;
    }
    for (let i = start; i < edgeList.length; i++) {
      taken.push(edgeList[i]);
      choose(i + 1, taken);
      taken.pop();
    }
  };
  choose(0, []);
  assert(trees.length === 384, "the face graph has 384 spanning trees, so 384 labelled nets");

  // Unfold a tree, not just a path: breadth-first reflection from one face.
  const unfoldTree = (tree) => {
    const nb = [...Array(8)].map(() => []);
    for (const [a, b] of tree) {
      nb[a].push(b);
      nb[b].push(a);
    }
    const laid = [];
    laid[0] = { [FACES[0][0]]: [0, 0], [FACES[0][1]]: [1, 0], [FACES[0][2]]: [0.5, SIN60] };
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const u = queue.shift();
      for (const v of nb[u]) {
        if (seen.has(v)) continue;
        seen.add(v);
        const sh = share(u, v);
        const oldApex = FACES[u].find((x) => !sh.includes(x));
        const newApex = FACES[v].find((x) => !sh.includes(x));
        laid[v] = {
          [sh[0]]: laid[u][sh[0]],
          [sh[1]]: laid[u][sh[1]],
          [newApex]: reflect(laid[u][oldApex], laid[u][sh[0]], laid[u][sh[1]]),
        };
        queue.push(v);
      }
    }
    return laid;
  };

  // A centroid, as a cell of the unit triangular grid.
  const gridCell = (c) => {
    const t = c[1] / SIN60;
    const upB = Math.round(t - 1 / 3);
    const up = Math.abs(t - 1 / 3 - upB) < 1e-6;
    const b = up ? upB : Math.round(t - 2 / 3);
    return { a: Math.round(c[0] - b * 0.5 - (up ? 0.5 : 1)), b, o: up ? 0 : 1 };
  };
  // A tile of 8 triangles needs a translation sublattice of index 4; there are seven.
  const sublattices = [];
  for (const [m, d] of [
    [1, 4],
    [2, 2],
    [4, 1],
  ])
    for (let c = 0; c < d; c++) sublattices.push({ m, c, d });
  // Reduce a cell modulo the lattice, keeping how many steps along each generator
  // it took, so a colouring may shift from copy to copy instead of repeating.
  const reduceCell = (g, L) => {
    const b = ((g.b % L.d) + L.d) % L.d;
    const down = (g.b - b) / L.d;
    const shifted = g.a - down * L.c;
    const a = ((shifted % L.m) + L.m) % L.m;
    return { cls: a + "," + b + "," + g.o, along: (shifted - a) / L.m, down };
  };
  const residue = (g, L) => reduceCell(g, L).cls;
  // Triangles sharing an edge, in grid coordinates.
  const touching = (g) =>
    g.o === 0
      ? [
          { a: g.a, b: g.b, o: 1 },
          { a: g.a - 1, b: g.b, o: 1 },
          { a: g.a, b: g.b - 1, o: 1 },
        ]
      : [
          { a: g.a, b: g.b, o: 0 },
          { a: g.a + 1, b: g.b, o: 0 },
          { a: g.a, b: g.b + 1, o: 0 },
        ];

  const turnBy = (p, k) => {
    const t = (k * Math.PI) / 3;
    return [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t)];
  };
  const settle = (cs) => {
    const q = cs.map((p) => [+p[0].toFixed(4), +p[1].toFixed(4)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const o = q[0];
    return JSON.stringify(q.map((p) => [+(p[0] - o[0]).toFixed(3), +(p[1] - o[1]).toFixed(3)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  };
  const shapeOf = (cs) => {
    let best = null;
    for (let m = 0; m < 2; m++)
      for (let k = 0; k < 6; k++) {
        const s = settle(cs.map((p) => turnBy(m ? [p[0], -p[1]] : p, k)));
        if (best === null || s < best) best = s;
      }
    return best;
  };

  const allShapes = new Set();
  const tileShapes = new Set();
  const keepShapes = new Set();
  const looseShapes = new Set();
  let flat = 0;
  let tiles = 0;
  let keeps = 0;
  let loose = 0;
  let drawnNetKeeps = false;
  const drawnTree = JSON.stringify(
    WALK.slice(0, 7)
      .map((v, i) => [v, WALK[i + 1]].sort((x, y) => x - y))
      .sort((x, y) => x[0] - y[0] || x[1] - y[1]),
  );
  for (const tree of trees) {
    const laid = unfoldTree(tree);
    const centres = laid.map(centroid);
    const cells = centres.map(gridCell);
    if (new Set(cells.map((g) => g.a + "," + g.b + "," + g.o)).size !== 8) continue;
    flat++;
    allShapes.add(shapeOf(centres));
    const fits = sublattices.filter((L) => new Set(cells.map((g) => residue(g, L))).size === 8);
    if (!fits.length) continue;
    tiles++;
    tileShapes.add(shapeOf(centres));
    // Each face carries its own word. Two rules: copies repeat the colours exactly,
    // or each step along a lattice generator xors the whole copy by a fixed mask.
    // A window two lattice steps wide settles it, since xoring twice is the identity.
    const sample = [];
    for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) for (const o of [0, 1]) sample.push({ a, b, o });
    let exact = false;
    let shifted = false;
    for (const L of fits) {
      const word = new Map();
      cells.forEach((g, i) => word.set(residue(g, L), i));
      for (let along = 0; along < 8; along++) {
        for (let down = 0; down < 8; down++) {
          const colourAt = (g) => {
            const r = reduceCell(g, L);
            return word.get(r.cls) ^ (r.along & 1 ? along : 0) ^ (r.down & 1 ? down : 0);
          };
          if (!sample.every((g) => touching(g).every((h) => weight(colourAt(g) ^ colourAt(h)) === 1))) continue;
          shifted = true;
          if (along === 0 && down === 0) exact = true;
        }
      }
    }
    if (shifted) {
      loose++;
      looseShapes.add(shapeOf(centres));
    }
    if (!exact) continue;
    keeps++;
    keepShapes.add(shapeOf(centres));
    const asTree = JSON.stringify(tree.map((e) => [...e].sort((x, y) => x - y)).sort((x, y) => x[0] - y[0] || x[1] - y[1]));
    if (asTree === drawnTree) drawnNetKeeps = true;
  }

  assert(
    flat === 384 && allShapes.size === 11,
    "every net lies flat without overlapping, and they make 11 shapes, the classical count for the octahedron",
  );
  assert(tiles === 96 && tileShapes.size === 6, "96 of them tile the plane by translations, in 6 shapes");
  assert(
    keeps === 32 && keepShapes.size === 2,
    "32 of those keep the one-bit rule with every copy repeating the colours exactly, in 2 shapes",
  );
  assert(
    loose === 40 && looseShapes.size === 5,
    "but allowing each lattice step to xor the copy by a fixed mask raises that to 40 nets in 5 shapes, so the count depends on how strict the rule is",
  );
  assert(drawnNetKeeps, "the net drawn in these figures is one of them");
}

{
  const X0 = -0.1;
  const X1 = 5.9;
  const Y0 = -0.1;
  const Y1 = 5.3;
  const drawn = [];
  for (let j = -3; j <= 7; j++) {
    for (let k = -2; k <= 5; k++) {
      for (let i = 0; i < 4; i++) {
        const verts = Object.values(period.placed[i]).map(([x, y]) => [x + j, y + period.lift[1] * k]);
        const cx = verts.reduce((a, p) => a + p[0], 0) / 3;
        const cy = verts.reduce((a, p) => a + p[1], 0) / 3;
        if (cx < X0 || cx > X1 || cy < Y0 || cy > Y1) continue;
        drawn.push({ verts, at: [cx, cy], word: planeCell(i, k, j).word, inDomain: j === 0 && (k === 0 || k === 1) });
      }
    }
  }

  const S = 86;
  const PAD = 16;
  const TOP = 96;
  const BOTTOM = 86;
  const PW = (X1 - X0) * S + 2 * PAD;
  const PH = (Y1 - Y0) * S + TOP + BOTTOM;
  const ux = (x) => (x - X0) * S + PAD;
  const uy = (y) => PH - BOTTOM - (y - Y0) * S; // flip so the band runs up the page

  let plane = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + PW.toFixed(0) + " " + PH.toFixed(0) + '"';
  plane += ' width="' + PW.toFixed(0) + '" height="' + PH.toFixed(0) + '"><defs>';
  plane += '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">';
  plane += '<path d="M0,0 L10,5 L0,10 z" fill="#e5e7eb"/></marker>';
  plane += '<clipPath id="sheet"><rect width="' + PW.toFixed(0) + '" height="' + PH.toFixed(0) + '"/></clipPath></defs>';
  plane += '<rect width="100%" height="100%" fill="#0e1014"/>';
  plane += '<text x="' + (PW / 2).toFixed(1) + '" y="34" fill="#cbd5e1" ' + FONT;
  plane += ' font-size="15" text-anchor="middle">stacked sideways, the bands tile the plane</text>';
  plane += '<text x="' + (PW / 2).toFixed(1) + '" y="58" fill="#8b919b" ' + FONT + ' font-size="13" text-anchor="middle">';
  plane += "any two triangles sharing an edge differ in exactly one channel</text>";
  plane += '<g clip-path="url(#sheet)">';
  for (const t of drawn) {
    const poly = t.verts.map((p) => ux(p[0]).toFixed(1) + "," + uy(p[1]).toFixed(1)).join(" ");
    plane += '<polygon points="' + poly + '" fill="' + FILL[t.word] + '" stroke="#4b5563" stroke-width="1"/>';
    const ink = t.word >= 4 ? "#000" : "#fff";
    plane += '<text x="' + ux(t.at[0]).toFixed(1) + '" y="' + (uy(t.at[1]) + 1).toFixed(1) + '" fill="' + ink + '"';
    plane += " " + FONT + ' font-size="15" font-weight="700" text-anchor="middle">' + NAME[t.word] + "</text>";
    plane += '<text x="' + ux(t.at[0]).toFixed(1) + '" y="' + (uy(t.at[1]) + 16).toFixed(1) + '" fill="' + ink + '"';
    plane += " " + FONT + ' font-size="10" text-anchor="middle">' + t.word.toString(2).padStart(3, "0") + "</text>";
  }
  for (const t of drawn.filter((d) => d.inDomain)) {
    const poly = t.verts.map((p) => ux(p[0]).toFixed(1) + "," + uy(p[1]).toFixed(1)).join(" ");
    plane += '<polygon points="' + poly + '" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>';
  }
  plane += "</g>";
  const fromX = 0.5;
  const fromY = 0.289;
  const arrow = (dx, dy, label, lx, ly) => {
    let out = '<line x1="' + ux(fromX).toFixed(1) + '" y1="' + uy(fromY).toFixed(1) + '"';
    out += ' x2="' + ux(fromX + dx).toFixed(1) + '" y2="' + uy(fromY + dy).toFixed(1) + '"';
    out += ' stroke="#e5e7eb" stroke-width="2.4" marker-end="url(#arrow)"/>';
    out += '<text x="' + ux(fromX + lx).toFixed(1) + '" y="' + uy(fromY + ly).toFixed(1) + '" fill="#e5e7eb"';
    out += " " + FONT + ' font-size="13" font-weight="700">' + label + "</text>";
    return out;
  };
  plane += arrow(0, 2 * period.lift[1], "2v", 0.12, 1.1);
  plane += arrow(SIDEWAYS[0], 0, "w", 0.42, -0.22);
  plane += '<text x="' + PAD + '" y="' + (PH - 48).toFixed(0) + '" fill="#9ca3af" ' + FONT + ' font-size="12">';
  plane += "white outline: one period of the colouring, 8 triangles, all eight colours once</text>";
  plane += '<text x="' + PAD + '" y="' + (PH - 28).toFixed(0) + '" fill="#9ca3af" ' + FONT + ' font-size="12">';
  plane += "w slides one band onto the next; crossing that boundary always flips B</text>";
  plane += "</svg>";

  const planeOut = path.join(HERE, "octahedron-gray-plane.svg");
  fs.writeFileSync(planeOut, plane);
  console.log("wrote " + path.relative(ROOT, planeOut).split(path.sep).join("/"));
}

// -- what the tiling does and does not carry ---------------------------------
// Beyond the one-bit rule, ask what else the coloured plane respects: the
// orientation of a triangle, the complement, mixing, and the Tone rank.

console.log("\nwhat the tiling carries");
{
  const REACH = 4;
  const sheet = [];
  for (let a = -REACH; a <= REACH; a++) for (let b = -REACH; b <= REACH; b++) for (const o of [0, 1]) sheet.push({ a, b, o });
  // Index the plane the way the figure does, then read colours back by position.
  const lookup = new Map();
  for (let j = -9; j <= 9; j++)
    for (let k = -9; k <= 9; k++)
      for (let i = 0; i < 4; i++) {
        const cell = planeCell(i, k, j);
        lookup.set(CELL(cell.point), cell.word);
      }
  const centreOf = (g) => {
    const ox = g.a + g.b * 0.5;
    const oy = g.b * SIN60;
    return g.o === 0 ? [ox + 0.5, oy + SIN60 / 3] : [ox + 1, oy + (2 * SIN60) / 3];
  };
  const colourOf = (g) => lookup.get(CELL(centreOf(g)));
  const known = sheet.filter((g) => colourOf(g) !== undefined);
  assert(known.length === sheet.length, "the colouring reaches every cell of the sample sheet");

  // Orientation splits the eight colours by weight parity.
  const upward = new Set(known.filter((g) => g.o === 0).map(colourOf));
  const downward = new Set(known.filter((g) => g.o === 1).map(colourOf));
  assert(
    [...upward].every((v) => weight(v) % 2 === 0) && [...downward].every((v) => weight(v) % 2 === 1),
    "triangles pointing one way carry the even-weight colours K M C Y and the other way the odd-weight B R G W",
  );
  assert(upward.size === 4 && downward.size === 4, "each orientation carries exactly four of the eight, the two inscribed tetrahedra");

  // No local mixing rule: a triangle is not the join, meet or xor of its neighbours.
  const neighboursOf = (g) =>
    g.o === 0
      ? [
          { a: g.a, b: g.b, o: 1 },
          { a: g.a - 1, b: g.b, o: 1 },
          { a: g.a, b: g.b - 1, o: 1 },
        ]
      : [
          { a: g.a, b: g.b, o: 0 },
          { a: g.a + 1, b: g.b, o: 0 },
          { a: g.a, b: g.b + 1, o: 0 },
        ];
  const inner = known.filter((g) => Math.abs(g.a) < REACH - 1 && Math.abs(g.b) < REACH - 1);
  for (const [label, combine] of [
    ["join", (n) => n[0] | n[1] | n[2]],
    ["meet", (n) => n[0] & n[1] & n[2]],
    ["xor", (n) => n[0] ^ n[1] ^ n[2]],
  ]) {
    assert(
      !inner.every((g) => combine(neighboursOf(g).map(colourOf)) === colourOf(g)),
      "no triangle rule: a face is not the " + label + " of its three neighbours",
    );
  }

  // Tone moves by one channel weight per step, and two of the three are the smallest.
  const gaps = new Set(
    inner.map((g) =>
      neighboursOf(g)
        .map((h) => Math.abs(colourOf(h) - colourOf(g)))
        .sort((x, y) => x - y)
        .join(","),
    ),
  );
  assert(
    [...gaps].every((g) => g.split(",").every((n) => [1, 2, 4].includes(Number(n)))),
    "every step changes the Tone rank by exactly one channel weight",
  );
  assert(
    [...gaps].every((g) => g.startsWith("1,1,")),
    "and in this tiling two of a triangle's three neighbours are one Tone step away: " + [...gaps].sort().join(" "),
  );
}

// -- Edges and nodes of the tiling -------------------------------------------
// The faces are coloured. Ask what the edges and the corners can carry too. The
// edges take a colour cleanly. The corners do not, and that is a trap worth
// recording: a net's triangle has labelled corners, but six triangles meet at a
// point of the plane where only four meet at a vertex of the solid.

console.log("\nedges and nodes");
const planeTile = (i, k, j) => {
  const verts = Object.entries(period.placed[i]).map(([label, [x, y]]) => ({
    label,
    at: [x + SIDEWAYS[0] * j, y + period.lift[1] * k],
  }));
  const at = [verts.reduce((s, v) => s + v.at[0], 0) / 3, verts.reduce((s, v) => s + v.at[1], 0) / 3];
  return { verts, at, word: planeCell(i, k, j).word };
};
{
  const patch = [];
  for (let j = -8; j <= 10; j++) for (let k = -3; k <= 8; k++) for (let i = 0; i < 4; i++) patch.push(planeTile(i, k, j));

  const ring = new Map();
  for (const tile of patch) {
    for (const v of tile.verts) {
      const id = CELL(v.at);
      if (!ring.has(id)) ring.set(id, { at: v.at, labels: [], words: [] });
      ring.get(id).labels.push(v.label);
      ring.get(id).words.push(tile.word);
    }
  }
  const interior = [...ring.values()].filter((v) => v.labels.length === 6);
  assert(interior.length > 40, "the patch has " + interior.length + " corners with all six triangles present");
  assert(
    interior.every((v) => new Set(v.labels).size > 1),
    "not one of them gets a single octahedron label: a net's corner colours cannot survive the tiling",
  );

  // What a corner can carry instead: its six faces always share one channel value.
  const held = interior.map((v) => {
    const around = [...new Set(v.words)];
    const fixed = [0, 1, 2].filter((c) => new Set(around.map((w) => (w >> c) & 1)).size === 1);
    return { size: around.length, fixed, value: fixed.length === 1 ? (around[0] >> fixed[0]) & 1 : null };
  });
  assert(
    held.every((h) => h.size === 4 && h.fixed.length === 1),
    "instead every corner is ringed by exactly the four colours that share one channel value",
  );
  assert(
    held.every((h) => h.fixed[0] !== 0),
    "and that channel is never " + CHANNEL[0] + ": the fast channel is the one no corner holds fixed",
  );

  // An edge takes the xor of the two faces, which here is the flipped channel.
  const gapBetween = 1 / Math.sqrt(3);
  const edges = [];
  const seenEdge = new Set();
  for (const a of patch) {
    for (const b of patch) {
      if (Math.abs(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) - gapBetween) > 1e-6) continue;
      const id = [CELL(a.at), CELL(b.at)].sort().join("|");
      if (seenEdge.has(id)) continue;
      seenEdge.add(id);
      const shared = a.verts.filter((v) => b.verts.some((w) => CELL(w.at) === CELL(v.at)));
      if (shared.length !== 2) continue;
      edges.push({ from: shared[0].at, to: shared[1].at, channel: [1, 2, 4].indexOf(a.word ^ b.word) });
    }
  }
  assert(
    edges.length > 100 && edges.every((e) => e.channel >= 0),
    "an edge's colour is the xor of the two faces it separates, and that is always a single channel",
  );

  const X0 = -0.15;
  const X1 = 5.85;
  const Y0 = -0.15;
  const Y1 = 5.2;
  const inFrame = (p) => p[0] > X0 && p[0] < X1 && p[1] > Y0 && p[1] < Y1;
  const shown = patch.filter((t) => inFrame(t.at));
  const S = 92;
  const PAD = 16;
  const TOP = 96;
  const BOTTOM = 104;
  const RW = (X1 - X0) * S + 2 * PAD;
  const RH = (Y1 - Y0) * S + TOP + BOTTOM;
  const rx = (x) => (x - X0) * S + PAD;
  const ry = (y) => RH - BOTTOM - (y - Y0) * S;

  let rich = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + RW.toFixed(0) + " " + RH.toFixed(0) + '"';
  rich += ' width="' + RW.toFixed(0) + '" height="' + RH.toFixed(0) + '"><defs>';
  rich += '<clipPath id="frame"><rect width="' + RW.toFixed(0) + '" height="' + RH.toFixed(0) + '"/></clipPath></defs>';
  rich += '<rect width="100%" height="100%" fill="#0e1014"/>';
  rich += '<text x="' + (RW / 2).toFixed(1) + '" y="32" fill="#cbd5e1" ' + FONT;
  rich += ' font-size="15" text-anchor="middle">faces, edges and nodes all carry something</text>';
  rich += '<text x="' + (RW / 2).toFixed(1) + '" y="56" fill="#8b919b" ' + FONT + ' font-size="13" text-anchor="middle">';
  rich += "edge = the channel that flips across it; node = the channel its six faces hold fixed</text>";
  rich += '<g clip-path="url(#frame)">';
  for (const t of shown) {
    const poly = t.verts.map((v) => rx(v.at[0]).toFixed(1) + "," + ry(v.at[1]).toFixed(1)).join(" ");
    rich += '<polygon points="' + poly + '" fill="' + FILL[t.word] + '" stroke="none"/>';
  }
  for (const e of edges) {
    if (!inFrame(e.from) && !inFrame(e.to)) continue;
    rich += '<line x1="' + rx(e.from[0]).toFixed(1) + '" y1="' + ry(e.from[1]).toFixed(1) + '"';
    rich += ' x2="' + rx(e.to[0]).toFixed(1) + '" y2="' + ry(e.to[1]).toFixed(1) + '"';
    rich += ' stroke="' + CHANNEL_FILL[e.channel] + '" stroke-width="4.5" stroke-linecap="round"/>';
  }
  for (const t of shown) {
    const ink = t.word >= 4 ? "#000" : "#fff";
    rich += '<text x="' + rx(t.at[0]).toFixed(1) + '" y="' + (ry(t.at[1]) + 6).toFixed(1) + '" fill="' + ink + '"';
    rich += " " + FONT + ' font-size="16" font-weight="700" text-anchor="middle">' + NAME[t.word] + "</text>";
  }
  interior.forEach((v, index) => {
    if (!inFrame(v.at)) return;
    const ink = CHANNEL_FILL[held[index].fixed[0]];
    rich += '<circle cx="' + rx(v.at[0]).toFixed(1) + '" cy="' + ry(v.at[1]).toFixed(1) + '" r="8"';
    rich += ' fill="' + (held[index].value ? ink : "#0e1014") + '" stroke="' + ink + '" stroke-width="3"/>';
  });
  rich += "</g>";
  const legendY = RH - 62;
  rich += '<text x="' + PAD + '" y="' + (legendY - 14) + '" fill="#9ca3af" ' + FONT + ' font-size="12">nodes</text>';
  let legendX = PAD + 56;
  for (const [channel, value] of [
    [2, 1],
    [2, 0],
    [1, 1],
    [1, 0],
  ]) {
    const ink = CHANNEL_FILL[channel];
    rich += '<circle cx="' + legendX + '" cy="' + (legendY - 18) + '" r="8" fill="' + (value ? ink : "#0e1014") + '"';
    rich += ' stroke="' + ink + '" stroke-width="3"/>';
    rich += '<text x="' + (legendX + 16) + '" y="' + (legendY - 13) + '" fill="#cbd5e1" ' + FONT + ' font-size="12">';
    rich += CHANNEL[channel] + "=" + value + "</text>";
    legendX += 88;
  }
  rich += '<text x="' + PAD + '" y="' + (legendY + 14) + '" fill="#9ca3af" ' + FONT + ' font-size="12">';
  rich += "B never appears on a node: the fast channel is the one no corner holds fixed</text>";
  rich += '<text x="' + PAD + '" y="' + (legendY + 34) + '" fill="#9ca3af" ' + FONT + ' font-size="12">';
  rich += "the net's own corner labels are left off: six triangles meet here, only four at a vertex of the solid</text>";
  rich += "</svg>";

  const richOut = path.join(HERE, "octahedron-gray-plane-rich.svg");
  fs.writeFileSync(richOut, rich);
  console.log("wrote " + path.relative(ROOT, richOut).split(path.sep).join("/"));
}
