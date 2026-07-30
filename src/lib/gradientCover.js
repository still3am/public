// Generates a deterministic Apple-Music-style mesh gradient cover (PNG File)
// from a seed string, used when an audio file has no embedded artwork.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export async function makeGradientCover(seed = "track", size = 800) {
  const h = hash(seed || "track");
  const base = h % 360;
  // Soft, saturated, analogous palette — the Apple Music "mesh" look.
  const hues = [base, (base + 35) % 360, (base + 310) % 360, (base + 65) % 360];

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `hsl(${hues[0]}, 70%, 52%)`;
  ctx.fillRect(0, 0, size, size);

  const blobs = [
    { x: 0.18, y: 0.18, r: 0.85, hue: hues[1], l: 62 },
    { x: 0.86, y: 0.24, r: 0.75, hue: hues[2], l: 56 },
    { x: 0.24, y: 0.88, r: 0.8, hue: hues[3], l: 46 },
    { x: 0.9, y: 0.92, r: 0.7, hue: hues[0], l: 34 },
  ];

  ctx.globalCompositeOperation = "source-over";
  for (const b of blobs) {
    const g = ctx.createRadialGradient(
      b.x * size, b.y * size, 0,
      b.x * size, b.y * size, b.r * size
    );
    g.addColorStop(0, `hsla(${b.hue}, 85%, ${b.l}%, 0.95)`);
    g.addColorStop(0.55, `hsla(${b.hue}, 80%, ${b.l}%, 0.45)`);
    g.addColorStop(1, `hsla(${b.hue}, 80%, ${b.l}%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // Gentle top-light / bottom-shade for depth.
  const sheen = ctx.createLinearGradient(0, 0, 0, size);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "cover.png", { type: "image/png" });
}