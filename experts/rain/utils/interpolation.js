// Interpolation Utilities
// Value interpolation functions

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpArray(a, b, t) {
  return a.map((val, i) => lerp(val, b[i], t));
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function catmullRom(p0, p1, p2, p3, t) {
  const tt = t * t;
  const ttt = tt * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * tt +
    (-p0 + 3 * p1 - 3 * p2 + p3) * ttt
  );
}

export function hermite(p0, m0, p1, m1, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 +
         (t3 - 2 * t2 + t) * m0 +
         (-2 * t3 + 3 * t2) * p1 +
         (t3 - t2) * m1;
}