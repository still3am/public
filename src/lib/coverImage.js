// Never manufacture "4K" by enlarging a small embedded thumbnail. Keep the
// original bytes, dimensions, format and detail; use a true catalog master when
// one is available instead of resampling a low-resolution image.
export function ensureHighResCover(file) {
  return file;
}

export async function getCoverImageDimensions(file) {
  if (!(file instanceof Blob)) return null;
  if (typeof createImageBitmap === "function") {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height };
    } catch {
      return null;
    } finally {
      bitmap?.close?.();
    }
  }
  if (typeof Image === "undefined" || typeof URL === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}