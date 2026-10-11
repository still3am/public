import { base44 } from "@/api/base44Client";

// Splits a combined artist tag ("Adele & Beyoncé feat. Jay-Z") into individual
// names — the same rule the artist links use, so every credited name resolves
// to its own Public Record page.
export const splitArtistNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every published track credited to an artist.
 *
 * The server narrows the catalog to tags containing the artist's name (a
 * superset of the real credits), then the exact name tokens are applied here.
 * Reading the artist's songs straight from the server — instead of pulling the
 * whole catalog and filtering it — means an artist's discography is complete no
 * matter how large the catalog grows.
 */
export async function fetchArtistTracks(artistName) {
  const names = splitArtistNames(artistName);
  if (!names.length) return [];

  const query = {
    is_published: true,
    $or: names.map((n) => ({
      artist: { $regex: escapeRegex(n), $options: "i" },
    })),
  };

  const res = await base44.entities.Track.filter(query, "-created_date", 1000);
  const list = Array.isArray(res) ? res : res.items || [];
  return list.filter((t) =>
    splitArtistNames(t.artist).some((n) => names.includes(n))
  );
}