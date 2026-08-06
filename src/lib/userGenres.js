import { base44 } from "@/api/base44Client";

let cache = null;

export async function getUserGenres() {
  if (cache) return cache;
  try {
    const records = await base44.entities.UserGenre.filter({}, "-created_date", 1);
    cache = Array.isArray(records) && records[0]?.genres ? records[0].genres : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function clearUserGenresCache() {
  cache = null;
}

export async function hasUserGenres() {
  const g = await getUserGenres();
  return g.length > 0;
}