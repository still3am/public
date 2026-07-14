export const GENRES = [
  "Pop",
  "Hip-Hop",
  "Electronic",
  "Rock",
  "R&B",
  "Jazz",
  "Classical",
  "Ambient",
  "Experimental",
  "Dance",
  "Indie",
  "Folk",
  "Country",
  "Metal",
  "Punk",
  "Lo-Fi",
  "Soul",
  "Funk",
  "Techno",
  "House",
  "Trap",
  "Latin",
  "Reggae",
  "World",
  "Other",
];

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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

// Returns the artist name to display for a track: explicit artist overrides
// uploader identity. Falls back to uploader_name if artist is missing.
export function displayArtist(track) {
  if (!track) return "Unknown";
  return (
    (track.artist && track.artist.trim()) ||
    track.uploader_name ||
    "Unknown"
  );
}