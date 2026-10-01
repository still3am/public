// Deterministic pseudo-random bar heights. Seeded by a track id so a given
// song always draws the same resting shape when there is no live analyser
// data to draw from.
export function getBars(seed) {
  let s = 0;
  for (const c of String(seed || "x")) s = (s * 31 + c.charCodeAt(0)) | 0;
  const bars = [];
  for (let i = 0; i < 64; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = (s % 1000) / 1000;
    bars.push(0.25 + 0.75 * v);
  }
  return bars;
}