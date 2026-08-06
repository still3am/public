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

export async function saveUserGenres(genres, userId) {
  const existing = await base44.entities.UserGenre.filter({}, "-created_date", 1).catch(() => []);
  const rec = Array.isArray(existing) && existing[0];
  if (rec) {
    await base44.entities.UserGenre.update(rec.id, { genres });
  } else {
    await base44.entities.UserGenre.create({ user_id: userId, genres });
  }
  cache = genres;
}

export async function hasUserGenres() {
  const g = await getUserGenres();
  return g.length > 0;
}