// Finds embedded artwork inside an arbitrary binary file.
//
// Raw audio data regularly contains stray image magic bytes (an MP3 frame can
// easily hold "FF D8 FF"), so taking the FIRST match yields garbage. Instead we
// collect EVERY candidate, then prefer the largest one that genuinely decodes —
// real covers are big and valid; coincidental matches are small and/or broken.

function readUInt32BE(buf, off) {
  return (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
}

function readUInt32LE(buf, off) {
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);
}

export function imageMime(buf) {
  if (!buf || buf.length < 2) return "image/jpeg";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

// Walks a JPEG starting at `i`, returning its end offset (exclusive) or -1.
// Handles baseline and progressive JPEGs (repeated SOS/DHT/DQT segments).
function jpegEnd(buf, i, n) {
  let p = i + 2;
  while (p + 1 < n) {
    if (buf[p] !== 0xff) { p++; continue; }
    const m = buf[p + 1];
    if (m === 0xff) { p++; continue; }
    if (m === 0xd9) return p + 2;
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }
    if (p + 4 > n) break;
    const segLen = (buf[p + 2] << 8) | buf[p + 3];
    if (segLen < 2) break;
    if (m === 0xda) {
      let q = p + 2 + segLen;
      while (q + 1 < n) {
        if (buf[q] === 0xff) {
          const mm = buf[q + 1];
          if (mm !== 0x00 && !(mm >= 0xd0 && mm <= 0xd7)) break;
        }
        q++;
      }
      p = q;
      continue;
    }
    p += 2 + segLen;
  }
  return -1;
}

// Collects every plausible embedded image slice found anywhere in `buf`.
export function collectImageCandidates(buf) {
  const n = buf.length;
  const out = [];

  for (let i = 0; i + 8 <= n; i++) {
    // PNG
    if (
      buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4e && buf[i + 3] === 0x47 &&
      buf[i + 4] === 0x0d && buf[i + 5] === 0x0a && buf[i + 6] === 0x1a && buf[i + 7] === 0x0a
    ) {
      let p = i + 8;
      while (p + 12 <= n) {
        const len = readUInt32BE(buf, p);
        if (len < 0) break;
        const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
        p += 8 + len + 4;
        if (type === "IEND") {
          out.push(buf.slice(i, Math.min(p, n)));
          break;
        }
      }
      continue;
    }

    // JPEG
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
      const end = jpegEnd(buf, i, n);
      if (end > i) out.push(buf.slice(i, end));
      continue;
    }

    // WebP
    if (
      i + 12 <= n &&
      buf[i] === 0x52 && buf[i + 1] === 0x49 && buf[i + 2] === 0x46 && buf[i + 3] === 0x46 &&
      buf[i + 8] === 0x57 && buf[i + 9] === 0x45 && buf[i + 10] === 0x42 && buf[i + 11] === 0x50
    ) {
      const end = i + 8 + readUInt32LE(buf, i + 4);
      if (end <= n && end >= i + 12) out.push(buf.slice(i, end));
      continue;
    }

    // GIF
    if (
      i + 6 <= n &&
      buf[i] === 0x47 && buf[i + 1] === 0x49 && buf[i + 2] === 0x46 && buf[i + 3] === 0x38 &&
      (buf[i + 4] === 0x37 || buf[i + 4] === 0x39) && buf[i + 5] === 0x61
    ) {
      for (let q = i + 6; q < n; q++) {
        if (buf[q] === 0x3b) { out.push(buf.slice(i, q + 1)); break; }
      }
    }
  }

  return out;
}

// True when the browser can actually decode this blob into a bitmap.
export function decodesToImage(file) {
  return new Promise((resolve) => {
    let url;
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve(false);
      return;
    }
    const img = new window.Image();
    const done = (ok) => {
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    img.onload = () => done(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => done(false);
    img.src = url;
  });
}

// Returns the best embedded image in `file` as an uploadable File, or null.
// Candidates are tried largest-first so the real cover wins over noise.
export async function pickBestEmbeddedImage(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const candidates = collectImageCandidates(buf)
    .filter((c) => c.length >= 512)
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);

  for (const c of candidates) {
    const f = new File([c], "cover", { type: imageMime(c) });
    if (await decodesToImage(f)) return f;
  }
  return null;
}