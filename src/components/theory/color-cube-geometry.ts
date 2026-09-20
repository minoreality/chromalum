import { CUBE_EDGES, CUBE_VERTICES_3D } from "../../data/theory-data";
import { compareDepth, edgeDepth, projectOrthographic } from "../../utils/geometry-3d";

// Preserve the existing horizontal span and diagram centre with one uniform
// scale. The small initial tilt separates K and W without stretching an axis.
const SCALE = 70 * Math.sqrt(3 / 2);
const CENTRE = { x: 150, y: 133 };
const INITIAL_TILT = (5 * Math.PI) / 180;
// Blend line style while a face is within 15 degrees of edge-on, rather than
// switching the dash pattern as soon as its normal changes sign.
const EDGE_BLEND_SINE = Math.sin(Math.PI / 12);

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

// A centred unit cube in an orthonormal, right-handed frame. Screen y points
// down and z points away from the viewer; R is above the chromatic hexagon.
const VERTICES = CUBE_VERTICES_3D.map(([g, r, b]) => {
  return [(g - b) / Math.SQRT2, (g + b - 2 * r) / Math.sqrt(6), -(g + r + b) / Math.sqrt(3)] as const;
});

export function hasseRankY(rank: number): number {
  return CENTRE.y + (SCALE * (1.5 - rank)) / Math.sqrt(3);
}

export function colorCubeView(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const angle = INITIAL_TILT + (Math.PI / 2 - INITIAL_TILT) * t;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  // Rotate around the screen's horizontal axis. At the endpoint, y is
  // proportional to -(g+r+b), placing each Boolean rank on one horizontal row.
  const vertices = VERTICES.map(([x, y, z]) => [x, cosine * y + sine * z, -sine * y + cosine * z] as const);
  const points = vertices.map((point) => projectOrthographic(point, CENTRE, SCALE));
  const axes = [4, 2, 1].map((mask) => ({ mask, depth: vertices[mask][2] - vertices[0][2] }));
  // Hasse's settled view has solid edges. Fill the remaining dash gaps during
  // the final part of the turn; reversing follows the same continuous values.
  const hiddenLineWeight = 1 - smoothstep((t - 0.8) / 0.2);
  const orderedEdges = CUBE_EDGES.map((edge, index) => ({
    edge,
    index,
    depth: edgeDepth(vertices[edge[0]], vertices[edge[1]]),
    dashWeight:
      hiddenLineWeight *
      axes.reduce((weight, axis) => {
        if ((edge[0] ^ edge[1]) & axis.mask) return weight;
        // An edge is hidden when both of its adjoining faces point away from
        // the viewer. Each fixed bit chooses one outward-facing normal.
        const normalDepth = (edge[0] & axis.mask ? 1 : -1) * axis.depth;
        return weight * smoothstep((normalDepth + EDGE_BLEND_SINE) / (2 * EDGE_BLEND_SINE));
      }, 1),
  })).sort(compareDepth);
  return { vertices, points, orderedEdges };
}
