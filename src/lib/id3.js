// Minimal ID3v2 tag parser — extracts title (TIT2), artist (TPE1) and embedded cover art (APIC).

function decodeText(bytes) {
  if (!bytes.length) return "";
  const enc = bytes[0];
  const data = bytes.slice(1);
  try {
    if (enc === 0) return new TextDecoder("latin1").decode(data).replace(/\0+$/, "");
    if (enc === 1) return new TextDecoder("utf-16").decode(data).replace(/\0+$/, "");
    if (enc === 2) return new TextDecoder("utf-16be").decode(data).replace(/\0+$/, "");
    return new TextDecoder("utf-8").decode(data).replace(/\0+$/, "");
  } catch {
    return "";
  }
}

function syncsafe(b, i) {
  return ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);
}

function readUint32(b, i) {
  return (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
}

function parseApic(bytes) {
  const enc = bytes[0];
  let i = 1;
  // mime type — latin1, null terminated
  while (i < bytes.length && bytes[i] !== 0) i++;
  const mime = new TextDecoder("latin1").decode(bytes.slice(1, i)) || "image/jpeg";
  i++; // skip null
  i++; // picture type byte
  // description — terminated by 0x00 (or 0x00 0x00 for utf-16)
  if (enc === 1 || enc === 2) {
    while (i + 1 < bytes.length && !(bytes[i] === 0 && bytes[i + 1] === 0)) i += 2;
    i += 2;
  } else {
    while (i < bytes.length && bytes[i] !== 0) i++;
    i++;
  }
  if (i >= bytes.length) return null;
  return new Blob([bytes.slice(i)], { type: mime.includes("/") ? mime : `image/${mime}` });
}

export async function parseId3(file) {
  const out = { title: "", artist: "", picture: null };
  const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (header.length < 10 || header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) return out;
  const version = header[3];
  const tagSize = syncsafe(header, 6);
  const buf = new Uint8Array(await file.slice(10, 10 + tagSize).arrayBuffer());

  let i = 0;
  // skip extended header if present
  if (header[5] & 0x40) {
    const extSize = version === 4 ? syncsafe(buf, 0) : readUint32(buf, 0);
    i += extSize + (version === 4 ? 0 : 4);
  }

  while (i + 10 <= buf.length) {
    const id = String.fromCharCode(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = version === 4 ? syncsafe(buf, i + 4) : readUint32(buf, i + 4);
    if (size <= 0 || i + 10 + size > buf.length) break;
    const body = buf.slice(i + 10, i + 10 + size);
    if (id === "TIT2" && !out.title) out.title = decodeText(body).trim();
    if (id === "TPE1" && !out.artist) out.artist = decodeText(body).trim();
    if (id === "APIC" && !out.picture) {
      try { out.picture = parseApic(body); } catch {}
    }
    i += 10 + size;
    if (out.title && out.artist && out.picture) break;
  }
  return out;
}

export function getAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      resolve(isFinite(a.duration) ? a.duration : 0);
      URL.revokeObjectURL(url);
    };
    a.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    a.src = url;
  });
}