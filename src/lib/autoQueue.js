import { getPublishedTracks } from "@/lib/catalogCache";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds the next batch of tracks to keep playback going:
 * 1. more from the same artist, 2. same genre, 3. popular + fresh exploration.
 * Always returns a mixed list (max `limit`), never repeating excluded ids.
 */
export async function buildAutoQueue(seed, excludeIds = [], limit = 15, userGenres = []) {
  const skip = new Set(excludeIds);
  if (seed?.id) skip.add(seed.id);

  const catalog=(await getPublishedTracks()).filter(t=>t?.audio_url||t?._private_audio||t?._offline);
  const sameArtist=catalog.filter(t=>seed?.artist&&t.artist===seed.artist);
  const sameGenre=catalog.filter(t=>seed?.genre&&t.genre===seed.genre);
  const popular=[...catalog].sort((a,b)=>(b.play_count||0)-(a.play_count||0));
  const fresh=catalog;
  const userGenreLists=[catalog.filter(t=>(userGenres||[]).includes(t.genre))];

  const take = (list, n) => {
    const out = [];
    if(n<=0)return out;
    for (const t of list) {
      if (!t?.id || skip.has(t.id)) continue;
      skip.add(t.id);
      out.push(t);
      if (out.length >= n) break;
    }
    return out;
  };

  const userPool = shuffle(userGenreLists.flat());

  const picks = [
    ...take(sameArtist, 2),
    ...take(userPool, userGenres?.length ? 8 : 0),
    ...take(shuffle(sameGenre), 4),
    ...take(shuffle(popular), 2),
    ...take(shuffle(fresh), 2),
  ];

  return [...picks,...take(shuffle(catalog),Math.max(0,limit-picks.length))].slice(0,limit);
}