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
  return name.replace(/\.[^.]+$/, "").trim() || "";
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
  try {
    const headBuf = await file.slice(0, 16).arrayBuffer();
    const head = new Uint8Array(headBuf);

    // ID3v2 (mp3)
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const major = head[3];
      const tagSize = readSynchsafe(head, 6);
      const total = 10 + tagSize;
      const buf = new Uint8Array(await file.slice(0, Math.min(total, 2 * 1024 * 1024)).arrayBuffer());
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
        const headerLen = frameIdLen + sizeLen + 2;
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
  } catch {}
  return null;
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
      const buf = new Uint8Array(await file.slice(0, Math.min(total, 2 * 1024 * 1024)).arrayBuffer());
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
        const headerLen = frameIdLen + sizeLen + 2;
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
  } catch {}
  return "";
}