// Generates a deterministic gradient cover image (PNG File) from a seed string,
// used as a fallback when an audio file has no embedded artwork.

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function makeGradientCover(seed = "track", size = 800) {
  const h = hash(seed || "track");
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 90)) % 360;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${hue1}, 72%, 56%)`);
  g.addColorStop(1, `hsl(${hue2}, 68%, 28%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const radial = ctx.createRadialGradient(size * 0.3, size * 0.25, 0, size * 0.3, size * 0.25, size * 0.9);
  radial.addColorStop(0, "rgba(255,255,255,0.28)");
  radial.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "cover.png", { type: "image/png" });
}