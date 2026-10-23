// Public metadata only. No credentials, audio downloads, or Base44 function calls.
let sequence = 0;
const cache = new Map();
const routes = { song: '/search', artist: '/search/artist', album: '/search/album' };
const abortError = () => new DOMException('Cancelled', 'AbortError');
export function catalogRequest(path, { signal } = {}) {
  if (!/^\/(search(?:\/artist|\/album)?|track\/\d+|album\/\d+|artist\/\d+)(?:\?|$)/.test(path)) return Promise.reject(new Error('Unsupported catalog request'));
  if (signal?.aborted) return Promise.reject(abortError());
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  return new Promise((resolve, reject) => {
    const name = `__publicCatalog${Date.now()}_${++sequence}`;
    const script = document.createElement('script');
    const url = new URL(path, 'https://api.deezer.com');
    url.searchParams.set('output', 'jsonp');url.searchParams.set('callback', name);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;settled = true;clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);script.remove();delete window[name];
      if (error) reject(error);else {
        if (cache.size >= 80) cache.delete(cache.keys().next().value);
        cache.set(path, { value, expires: Date.now() + 120000 });resolve(value);
      }
    };
    const cancel = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error('Catalog timed out. Please retry.')), 12000);
    window[name] = value => value?.error ? finish(new Error('Catalog is unavailable. Please retry.')) : finish(null, value);
    script.onerror = () => finish(new Error('Could not reach the catalog. Check your connection.'));
    script.src = url.href;script.async = true;script.referrerPolicy = 'no-referrer';
    signal?.addEventListener('abort', cancel, { once: true });document.head.appendChild(script);
  });
}
export async function searchExternalCatalog(query, kind = 'song', options = {}) {
  const term = String(query || '').trim().slice(0, 200);
  if (term.length < 2) return [];
  if (!routes[kind]) throw new Error('Unknown catalog category');
  const data = await catalogRequest(`${routes[kind]}?${new URLSearchParams({ q: term, limit: '24' })}`, options);
  if (!Array.isArray(data?.data)) throw new Error('Unexpected catalog response. Please retry.');
  return data.data.filter(row => Number.isSafeInteger(row.id) && row.id > 0);
}
export function catalogDetails(kind, id, options = {}) {
  if (!['song','album','artist'].includes(kind) || !/^\d+$/.test(String(id))) return Promise.reject(new Error('Invalid catalog item'));
  return catalogRequest(`/${kind === 'song' ? 'track' : kind}/${id}`, options);
}
export function catalogLink(value) {
  try { const url = new URL(value);return url.protocol === 'https:' && ['www.deezer.com','deezer.com'].includes(url.hostname) ? url.href : ''; } catch { return ''; }
}
export function uploadMetadata(track) {
  return {
    title: String(track.title || '').slice(0,200), artist: String(track.artist?.name || '').slice(0,200),
    album_name: String(track.album?.title || '').slice(0,300), album_artist: String(track.artist?.name || '').slice(0,300),
    release_year: Number(String(track.release_date || '').slice(0,4)) || 0,
    track_number: Number(track.track_position) || 0, disc_number: Number(track.disk_number) || 0,
    explicit: track.explicit_lyrics === true,
  };
}
