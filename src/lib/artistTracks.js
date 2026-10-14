import { base44 } from "@/api/base44Client";
import { readAllPages } from "@/lib/readPages";

// Splits a combined artist tag ("Adele & Beyoncé feat. Jay-Z") into individual
// names — the same rule the artist links use, so every credited name resolves
// to its own Public Record page.
export const splitArtistNames = (str, lower=true) =>
  (str || '').split(/\s*(?:,|&| feat\.| ft\.| x |;|\/)\s*/i)
    .map(s=>s.trim().replace(/\s+/g,' ')).filter(Boolean).map(s=>lower?s.toLowerCase():s);


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
      $or: [{ artist: { $regex: escapeRegex(n), $options: "i" } }, { title: { $regex: escapeRegex(n), $options: "i" } }],
    })),
  };

  const list = await readAllPages((opts) =>
    base44.entities.Track.filter(query, { sort: "-created_date", ...opts })
  );
  return list.filter(track => {
    const credit = String(track.artist || "");
    const credits = splitArtistNames(credit.replace(/\s+[\[(]?(?:feat(?:uring)?\.?|ft\.?)\s+/gi,", ")).map(name => /\b(?:feat(?:uring)?\.?|ft\.?)\s+/i.test(credit) ? name.replace(/[)\]]\s*$/,"").trim() : name);
    const titleFeature = String(track.title || "").match(/\b(?:feat(?:uring)?\.?|ft\.?)\s+([^)\]}]+)/i);
    const guests = titleFeature ? splitArtistNames(titleFeature[1]) : [];
    return [...credits,...guests].some(name => names.includes(name));
  });
}