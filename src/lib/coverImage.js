// Cover art pulled from a file's metadata tags is often only ~300px, which
// looks blocky when blown up in the full-screen player. Before we upload a
// cover we upscale it on a canvas to a high resolution so the stored file is
// crisp on retina / 4K displays. Files already at or above the target pass
// through unchanged.
const COVER_TARGET = 2048;

export async function ensureHighResCover(file, target = COVER_TARGET) {
  if (!(file instanceof Blob)) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const longest =
      img.naturalWidth && img.naturalHeight
        ? Math.max(img.naturalWidth, img.naturalHeight)
        : 0;
    if (!longest || longest >= target) {
      URL.revokeObjectURL(url);
      return file;
    }
    const scale = target / longest;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const blob = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92)
    );
    if (!blob) return file;
    const baseName = (file.name || "cover").replace(/\.[a-z0-9]+$/i, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}