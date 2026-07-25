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