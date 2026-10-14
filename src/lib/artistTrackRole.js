import { splitArtistNames } from "@/lib/artistTracks";
const normalize = value => String(value || "").trim().replace(/\s+/g," ").toLowerCase();
export function artistTrackRole(track, artistName) {
  const target = normalize(artistName);
  if (!target) return null;
  const credit = String(track.artist || "");
  if (normalize(credit) === target) return "lead";
  const standardized = credit.replace(/\s+[\[(]?(?:feat(?:uring)?\.?|ft\.?)\s+/gi,", ");
  const names = splitArtistNames(standardized).map(name => /\b(?:feat(?:uring)?\.?|ft\.?)\s+/i.test(credit) ? name.replace(/[)\]]\s*$/,"").trim() : name);
  if (names[0] === target) return "lead";
  if (names.includes(target)) return "appearance";
  const featured = String(track.title || "").match(/\b(?:feat(?:uring)?\.?|ft\.?)\s+([^)\]}]+)/i);
  return featured && splitArtistNames(featured[1]).includes(target) ? "appearance" : null;
}
