export const GENRES = [
  "Pop", "Hip-Hop", "Electronic", "Rock", "R&B", "Jazz", "Classical",
  "Ambient", "Experimental", "Dance", "Indie", "Folk", "Country",
  "Metal", "Punk", "Lo-Fi", "Soul", "Funk", "Techno", "House",
  "Trap", "Latin", "Reggae", "World", "Other",
  "Afro-Pop", "Amapiano", "Afrobeats", "K-Pop", "J-Pop", "Bollywood",
  "Reggaeton", "Dancehall", "Drill", "Phonk", "Hyperpop",
  "Drum & Bass", "Trance", "Disco", "Synthwave", "Vaporwave",
  "Jersey Club", "Bossa Nova", "Gospel", "Chill", "Garage", "Hardcore",
  "Bedroom Pop", "Pop Punk", "Worship",
  // Drill family
  "Sexy Drill", "UK Drill", "Brooklyn Drill", "Chicago Drill", "NY Drill",
  "Arabic Drill", "Afro Drill",
  // African
  "Gengetone", "Alté", "Gqom", "3-Step", "Singeli", "Bongo Flava",
  "Maskandi", "Afrosoul",
  // Latin
  "Baile Funk", "Funk Carioca", "Cumbia", "Bachata", "Merengue", "Salsa",
  "Sertanejo", "Forró", "Tango", "Bolero", "Mariachi", "Ranchera",
  "Latin Pop", "Latin Trap", "Urbano",
  // Asian
  "City Pop", "C-Pop", "T-Pop", "Mandopop", "Pinoy Pop", "Punjabi",
  "Tamil", "Bhangra", "Dangdut",
  // Rock / alt
  "Dream Pop", "Shoegaze", "Post-Punk", "Emo", "Ska", "Grunge",
  "J-Rock", "K-Rock",
  // Hip-Hop / R&B
  "Neo-Soul", "Crunk", "Memphis Rap", "Cloud Rap", "Trap Metal",
  "Slowed & Reverb", "Sped Up",
  // Caribbean / diaspora
  "Zouk", "Kompa", "Kizomba",
  // Regional vocal
  "Fado", "Arabic Pop", "Persian Pop", "Turkish Pop",
];

export const AUDIO_ACCEPT =
  "audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,.aiff,.webm";

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function formatNumber(n) {
  if (n == null) return "0";
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "K";
  if (n < 1000000) return Math.round(n / 1000) + "K";
  return (n / 1000000).toFixed(1) + "M";
}

export function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

export function getAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(url);
      resolve(d && isFinite(d) ? Math.round(d) : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export function deriveDefaultTitle(fileOrName) {
  const name = typeof fileOrName === "string" ? fileOrName : fileOrName?.name;
  if (!name) return "Untitled";
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim() || "Untitled"
  );
}

export function deriveDefaultArtist(fileOrName) {
  const name = typeof fileOrName === "string" ? fileOrName : fileOrName?.name;
  if (!name) return "";
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "";
}

export function displayArtist(track) {
  if (!track) return "Unknown";
  return (
    (track.artist && track.artist.trim()) ||
    track.uploader_name ||
    "Unknown"
  );
}

export function isRecentlyAdded(track, days = 7) {
  if (!track?.created_date) return false;
  const then = new Date(track.created_date).getTime();
  if (isNaN(then)) return false;
  return Date.now() - then < days * 86400 * 1000;
}

export function isTrending(track, threshold = 30) {
  return (track?.play_count || 0) > threshold;
}

export function bytesToReadable(bytes) {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const v = bytes / Math.pow(1024, i);
  return `${i >= 1 ? v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2) : Math.round(v)} ${units[i]}`;
}

function readSynchsafe(buf, off) {
  return (
    ((buf[off] & 0x7f) << 21) |
    ((buf[off + 1] & 0x7f) << 14) |
    ((buf[off + 2] & 0x7f) << 7) |
    (buf[off + 3] & 0x7f)
  );
}

function readUInt32BE(buf, off) {
  return (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
}

// Extracts embedded cover art (ID3v2 APIC for mp3; FLAC PICTURE block).
// Returns a File ready for upload, or null.
export async function extractEmbeddedCover(file) {
  // Primary: pull any embedded image straight from the file bytes — any
  // container, any image format, any size ("take any image of the file").
  try {
    const scanned = await scanFileForAnyImage(file);
    if (scanned) return scanned;
  } catch {}

  try {
    const headBuf = await file.slice(0, 16).arrayBuffer();
    const head = new Uint8Array(headBuf);

    // ID3v2 (mp3)
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const major = head[3];
      const tagSize = readSynchsafe(head, 6);
      const total = 10 + tagSize;
      const buf = new Uint8Array(await file.slice(0, Math.min(total, 10 * 1024 * 1024)).arrayBuffer());
      let off = 10;
      const frameIdLen = major === 2 ? 3 : 4;
      const sizeLen = major === 2 ? 3 : 4;
      while (off + frameIdLen + sizeLen + 2 <= buf.length) {
        let id = "";
        for (let i = 0; i < frameIdLen; i++) id += String.fromCharCode(buf[off + i]);
        if (!/^[A-Z0-9]+$/.test(id)) break;
        let fsize;
        if (major === 2) {
          fsize = (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5];
        } else if (major === 4) {
          fsize = readSynchsafe(buf, off + 4);
        } else {
          fsize = readUInt32BE(buf, off + 4);
        }
        const headerLen = major === 2 ? frameIdLen + sizeLen : frameIdLen + sizeLen + 2;
        const dataStart = off + headerLen;
        if (id === "APIC" || id === "PIC") {
          let p = dataStart;
          const encoding = buf[p];
          p++;
          let mime = "";
          if (id === "PIC") {
            mime = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2]);
            p += 3;
          } else {
            while (p < buf.length && buf[p] !== 0) {
              mime += String.fromCharCode(buf[p]);
              p++;
            }
            p++; // skip null terminator
          }
          p++; // picture type byte
          // skip description (null-terminated; UTF-16 uses double null)
          if (encoding === 1 || encoding === 2) {
            while (p + 1 < buf.length && !(buf[p] === 0 && buf[p + 1] === 0)) p += 2;
            p += 2;
          } else {
            while (p < buf.length && buf[p] !== 0) p++;
            p++;
          }
          if (!mime) mime = "image/jpeg";
          const imgBytes = buf.slice(p, dataStart + fsize);
          if (imgBytes.length > 0) {
            return new File([imgBytes], "cover", { type: mime });
          }
        }
        off = dataStart + fsize;
      }
    }

    // FLAC
    if (head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43) {
      const buf = new Uint8Array(await file.slice(0, Math.min(file.size, 5 * 1024 * 1024)).arrayBuffer());
      let p = 4;
      while (p + 4 < buf.length) {
        const blockType = buf[p] & 0x7f;
        const last = (buf[p] & 0x80) !== 0;
        const len = readUInt32BE(buf, p + 1);
        p += 4;
        if (blockType === 6) {
          const mimeLen = readUInt32BE(buf, p + 4);
          let mp = p + 8;
          let mime = "";
          for (let i = 0; i < mimeLen; i++) mime += String.fromCharCode(buf[mp + i]);
          mp += mimeLen;
          const descLen = readUInt32BE(buf, mp);
          mp += 4 + descLen;
          const dataLen = readUInt32BE(buf, mp);
          mp += 4;
          if (!mime) mime = "image/jpeg";
          const imgBytes = buf.slice(mp, mp + dataLen);
          if (imgBytes.length > 0) {
            return new File([imgBytes], "cover", { type: mime });
          }
        }
        if (last) break;
        p += len;
      }
    }

    // MP4 / M4A (cover art in a covr atom; moov sits at the start for
    // fast-start files and at the end otherwise, so scan head + tail).
    if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) { // "ftyp"
      const covr = await findMp4Cover(file);
      if (covr) return covr;
    }
  } catch {}
  return null;
}

// Scans an MP4/M4A file for the covr atom (embedded artwork). Reads the head
// and (if the file is large) the tail, then scans each chunk for the "covr"
// atom signature followed by a "data" atom.
async function findMp4Cover(file) {
  const scan = (buf) => {
    for (let q = 0; q + 20 < buf.length; q++) {
      if (buf[q] === 0x63 && buf[q + 1] === 0x6f && buf[q + 2] === 0x76 && buf[q + 3] === 0x72) { // "covr"
        if (buf[q + 8] === 0x64 && buf[q + 9] === 0x61 && buf[q + 10] === 0x74 && buf[q + 11] === 0x61) { // "data"
          const dataSize = readUInt32BE(buf, q + 4);
          const payloadLen = dataSize - 16;
          if (payloadLen > 0 && q + 20 + payloadLen <= buf.length) {
            const img = buf.slice(q + 20, q + 20 + payloadLen);
            let mime = "image/jpeg";
            if (img[0] === 0x89 && img[1] === 0x50) mime = "image/png";
            return new File([img], "cover", { type: mime });
          }
        }
      }
    }
    return null;
  };
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer());
  const found = scan(head);
  if (found) return found;
  if (file.size > 4 * 1024 * 1024) {
    const tail = new Uint8Array(await file.slice(file.size - 4 * 1024 * 1024, file.size).arrayBuffer());
    return scan(tail);
  }
  return null;
}

// Scans an MP4/M4A file for a metadata atom (e.g. ©ART, ©nam) whose body is a
// UTF-8 "data" atom, and returns the trimmed text.
async function findMp4Text(file, typeStr) {
  const tb = [...typeStr].map((c) => c.charCodeAt(0));
  const scan = (buf) => {
    for (let q = 0; q + 20 < buf.length; q++) {
      if (buf[q] === tb[0] && buf[q + 1] === tb[1] && buf[q + 2] === tb[2] && buf[q + 3] === tb[3]) {
        if (buf[q + 8] === 0x64 && buf[q + 9] === 0x61 && buf[q + 10] === 0x74 && buf[q + 11] === 0x61) { // "data"
          const dataSize = readUInt32BE(buf, q + 4);
          const payloadLen = dataSize - 16;
          if (payloadLen > 0 && q + 20 + payloadLen <= buf.length) {
            const text = new TextDecoder("utf-8").decode(buf.slice(q + 20, q + 20 + payloadLen)).replace(/\x00+$/g, "").trim();
            if (text) return text;
          }
        }
      }
    }
    return "";
  };
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer());
  const r = scan(head);
  if (r) return r;
  if (file.size > 4 * 1024 * 1024) {
    const tail = new Uint8Array(await file.slice(file.size - 4 * 1024 * 1024, file.size).arrayBuffer());
    return scan(tail);
  }
  return "";
}

function decodeID3Text(bytes, enc) {
  if (!bytes || bytes.length === 0) return "";
  let td;
  try {
    if (enc === 3) td = new TextDecoder("utf-8");
    else if (enc === 2) td = new TextDecoder("utf-16be");
    else if (enc === 1) td = new TextDecoder("utf-16");
    else td = new TextDecoder("latin1");
    return td.decode(bytes).replace(/\x00+$/g, "").trim();
  } catch {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s.replace(/\x00+$/g, "").trim();
  }
}

// --- Generic embedded-image scan ---
// Finds the first complete image (JPEG / PNG / WebP / GIF) located anywhere in
// the raw file bytes, independent of the audio container. Used as a fallback
// when the structured parsers (ID3 APIC, FLAC PICTURE, MP4 covr) miss a cover
// — e.g. non-standard headers or unusual containers.
function readUInt32LE(buf, off) {
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);
}

export function scanAnyImage(buf) {
  const n = buf.length;

  // PNG: \x89PNG\r\n\x1a\n + chunks ... IEND
  for (let i = 0; i + 8 <= n; i++) {
    if (
      buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4e && buf[i + 3] === 0x47 &&
      buf[i + 4] === 0x0d && buf[i + 5] === 0x0a && buf[i + 6] === 0x1a && buf[i + 7] === 0x0a
    ) {
      let p = i + 8;
      while (p + 12 <= n) {
        const len = readUInt32BE(buf, p);
        const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
        p += 8 + len + 4;
        if (type === "IEND") return buf.slice(i, Math.min(p, n));
      }
    }
  }

  // JPEG: FFD8FF ... FFD9, parse segments to a precise end
  for (let i = 0; i + 3 < n; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
      let p = i + 2;
      while (p + 1 < n) {
        if (buf[p] !== 0xff) { p++; continue; }
        const m = buf[p + 1];
        if (m === 0xff) { p++; continue; } // fill bytes
        if (m === 0xd9) return buf.slice(i, p + 2); // EOI
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }
        if (p + 4 > n) break;
        const segLen = (buf[p + 2] << 8) | buf[p + 3];
        if (m === 0xda) {
          // entropy-coded scan: read raw until the next real marker
          let q = p + 2 + segLen;
          while (q + 1 < n) {
            if (buf[q] === 0xff) {
              const mm = buf[q + 1];
              if (mm !== 0x00 && !(mm >= 0xd0 && mm <= 0xd7)) {
                if (mm === 0xd9) return buf.slice(i, q + 2);
                break;
              }
            }
            q++;
          }
          break;
        }
        p += 2 + segLen;
      }
    }
  }

  // WebP: RIFF....WEBP
  for (let i = 0; i + 12 <= n; i++) {
    if (
      buf[i] === 0x52 && buf[i + 1] === 0x49 && buf[i + 2] === 0x46 && buf[i + 3] === 0x46 &&
      buf[i + 8] === 0x57 && buf[i + 9] === 0x45 && buf[i + 10] === 0x42 && buf[i + 11] === 0x50
    ) {
      const size = readUInt32LE(buf, i + 4);
      const end = i + 8 + size;
      if (end <= n && end >= i + 12) return buf.slice(i, end);
    }
  }

  // GIF: GIF87a / GIF89a ... trailer 0x3B
  for (let i = 0; i + 6 <= n; i++) {
    if (
      buf[i] === 0x47 && buf[i + 1] === 0x49 && buf[i + 2] === 0x46 && buf[i + 3] === 0x38 &&
      (buf[i + 4] === 0x37 || buf[i + 4] === 0x39) && buf[i + 5] === 0x61
    ) {
      let q = i + 6;
      while (q < n) {
        if (buf[q] === 0x3b) return buf.slice(i, q + 1);
        q++;
      }
    }
  }

  return null;
}

export function imageMime(buf) {
  if (!buf || buf.length < 2) return "image/jpeg";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

export async function scanFileForAnyImage(file) {
  const win = 10 * 1024 * 1024;
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, win)).arrayBuffer());
  let found = scanAnyImage(head);
  if (!found && file.size > win) {
    const tail = new Uint8Array(await file.slice(file.size - win, file.size).arrayBuffer());
    found = scanAnyImage(tail);
  }
  if (!found || found.length < 4) return null;
  return new File([found], "cover", { type: imageMime(found) });
}

// Extracts the embedded title tag (ID3v2 TIT2/TT2 for mp3; FLAC TITLE vorbis comment).
// Returns a trimmed string, or "" if none found.
export async function extractEmbeddedTitle(file) {
  try {
    const headBuf = await file.slice(0, 16).arrayBuffer();
    const head = new Uint8Array(headBuf);

    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const major = head[3];
      const tagSize = readSynchsafe(head, 6);
      const total = 10 + tagSize;
      const buf = new Uint8Array(await file.slice(0, Math.min(total, 10 * 1024 * 1024)).arrayBuffer());
      let off = 10;
      const frameIdLen = major === 2 ? 3 : 4;
      const sizeLen = major === 2 ? 3 : 4;
      const target = major === 2 ? ["TT2"] : ["TIT2"];
      while (off + frameIdLen + sizeLen + 2 <= buf.length) {
        let id = "";
        for (let i = 0; i < frameIdLen; i++) id += String.fromCharCode(buf[off + i]);
        if (!/^[A-Z0-9]+$/.test(id)) break;
        let fsize;
        if (major === 2) {
          fsize = (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5];
        } else if (major === 4) {
          fsize = readSynchsafe(buf, off + 4);
        } else {
          fsize = readUInt32BE(buf, off + 4);
        }
        const headerLen = major === 2 ? frameIdLen + sizeLen : frameIdLen + sizeLen + 2;
        const dataStart = off + headerLen;
        if (target.includes(id) && fsize > 0) {
          const enc = buf[dataStart];
          const text = decodeID3Text(buf.slice(dataStart + 1, dataStart + fsize), enc);
          if (text) return text;
        }
        off = dataStart + fsize;
      }
    }

    if (head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43) {
      const buf = new Uint8Array(await file.slice(0, Math.min(file.size, 5 * 1024 * 1024)).arrayBuffer());
      let p = 4;
      while (p + 4 < buf.length) {
        const blockType = buf[p] & 0x7f;
        const last = (buf[p] & 0x80) !== 0;
        const len = readUInt32BE(buf, p + 1);
        p += 4;
        if (blockType === 4) {
          const vendorLen = readUInt32BE(buf, p);
          let vp = p + 4 + vendorLen;
          const count = readUInt32BE(buf, vp);
          vp += 4;
          for (let i = 0; i < count; i++) {
            const clen = readUInt32BE(buf, vp);
            vp += 4;
            const comment = new TextDecoder("utf-8").decode(buf.slice(vp, vp + clen));
            vp += clen;
            const idx = comment.indexOf("=");
            if (idx > 0 && comment.slice(0, idx).toUpperCase() === "TITLE") {
              const v = comment.slice(idx + 1).trim();
              if (v) return v;
            }
          }
        }
        if (last) break;
        p += len;
      }
    }

    // MP4 / M4A (title in a ©nam atom)
    if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) { // "ftyp"
      const t = await findMp4Text(file, "©nam");
      if (t) return t;
    }
  } catch {}
  return "";
}

// Extracts the embedded artist tag (ID3v2 TPE1/TP1 for mp3; FLAC ARTIST vorbis comment).
// Returns a trimmed string, or "" if none found.
export async function extractEmbeddedArtist(file) {
  try {
    const headBuf = await file.slice(0, 16).arrayBuffer();
    const head = new Uint8Array(headBuf);

    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const major = head[3];
      const tagSize = readSynchsafe(head, 6);
      const total = 10 + tagSize;
      const buf = new Uint8Array(await file.slice(0, Math.min(total, 10 * 1024 * 1024)).arrayBuffer());
      let off = 10;
      const frameIdLen = major === 2 ? 3 : 4;
      const sizeLen = major === 2 ? 3 : 4;
      const target = major === 2 ? ["TP1"] : ["TPE1", "TPE2"];
      while (off + frameIdLen + sizeLen + 2 <= buf.length) {
        let id = "";
        for (let i = 0; i < frameIdLen; i++) id += String.fromCharCode(buf[off + i]);
        if (!/^[A-Z0-9]+$/.test(id)) break;
        let fsize;
        if (major === 2) {
          fsize = (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5];
        } else if (major === 4) {
          fsize = readSynchsafe(buf, off + 4);
        } else {
          fsize = readUInt32BE(buf, off + 4);
        }
        const headerLen = major === 2 ? frameIdLen + sizeLen : frameIdLen + sizeLen + 2;
        const dataStart = off + headerLen;
        if (target.includes(id) && fsize > 0) {
          const enc = buf[dataStart];
          const text = decodeID3Text(buf.slice(dataStart + 1, dataStart + fsize), enc);
          if (text) return text;
        }
        off = dataStart + fsize;
      }
    }

    if (head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43) {
      const buf = new Uint8Array(await file.slice(0, Math.min(file.size, 5 * 1024 * 1024)).arrayBuffer());
      let p = 4;
      while (p + 4 < buf.length) {
        const blockType = buf[p] & 0x7f;
        const last = (buf[p] & 0x80) !== 0;
        const len = readUInt32BE(buf, p + 1);
        p += 4;
        if (blockType === 4) {
          const vendorLen = readUInt32BE(buf, p);
          let vp = p + 4 + vendorLen;
          const count = readUInt32BE(buf, vp);
          vp += 4;
          for (let i = 0; i < count; i++) {
            const clen = readUInt32BE(buf, vp);
            vp += 4;
            const comment = new TextDecoder("utf-8").decode(buf.slice(vp, vp + clen));
            vp += clen;
            const idx = comment.indexOf("=");
            if (idx > 0 && comment.slice(0, idx).toUpperCase() === "ARTIST") {
              const v = comment.slice(idx + 1).trim();
              if (v) return v;
            }
          }
        }
        if (last) break;
        p += len;
      }
    }

    // MP4 / M4A (artist in a ©ART atom)
    if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) { // "ftyp"
      const a = await findMp4Text(file, "©ART");
      if (a) return a;
    }
  } catch {}
  return "";
}