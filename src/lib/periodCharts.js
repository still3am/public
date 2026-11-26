import { base44 } from '@/api/base44Client';
import { readAllPages } from '@/lib/readPages';
import { getPublishedTracks } from '@/lib/catalogCache';
import { readAppSetting, saveAppSetting } from '@/lib/appSettings';

// Period charts are ranked in the app instead of on the server: the play stream
// is already in the app's own data, so the browser ranks it and shares the result
// through the public app settings record. Visitors then read the shared ranking,
// and a signed-in admin refreshes it when it is stale.
const DAY = 86400000;
const TTL = 10 * 60 * 1000;
const ROWS = { week: 'chart_week', month: 'chart_month' };
const STAMPS = { week: 'chart_week_at', month: 'chart_month_at' };
const memo = new Map();

export function rankPeriods(tracks, events, days, now = Date.now()) {
  const start = now - days * DAY, previous = start - days * DAY;
  const current = new Map(), prior = new Map(), valid = new Set(tracks.map((track) => track.id));
  for (const event of events) {
    const date = new Date(event.created_date).getTime();
    if (!valid.has(event.track_id) || date > now || date < previous) continue;
    const map = date >= start ? current : prior;
    map.set(event.track_id, (map.get(event.track_id) || 0) + 1);
  }
  const sorted = (map) => [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const previousRanks = new Map(sorted(prior).map(([id], index) => [id, index + 1]));
  return sorted(current).map(([track_id, plays], index) => ({
    track_id,
    plays,
    previous_plays: prior.get(track_id) || 0,
    position: index + 1,
    previous_position: previousRanks.get(track_id) || null,
    movement: previousRanks.has(track_id) ? previousRanks.get(track_id) - (index + 1) : null,
    growth: plays - (prior.get(track_id) || 0),
  }));
}

async function rankFromPlays(period, days, fresh) {
  const since = new Date(Date.now() - days * 2 * DAY).toISOString();
  const [tracks, events] = await Promise.all([
    getPublishedTracks(fresh),
    readAllPages((options) => base44.entities.PlayEvent.filter({ created_date: { $gte: since } }, { sort: '-created_date', ...options })),
  ]);
  return rankPeriods(tracks, events, days);
}

export async function getPeriodChart(period, { canCompute = false, fresh = false } = {}) {
  const days = period === 'month' ? 30 : 7;
  const cached = memo.get(period);
  if (!fresh && cached && Date.now() - cached.at < TTL) return cached.rows;

  let settings = null;
  try { settings = await readAppSetting(fresh); } catch { settings = null; }
  const stored = Array.isArray(settings?.[ROWS[period]]) ? settings[ROWS[period]] : [];
  const storedAt = Date.parse(settings?.[STAMPS[period]] || '') || 0;

  if (!canCompute) return stored;
  if (!fresh && stored.length && Date.now() - storedAt < TTL) {
    memo.set(period, { rows: stored, at: Date.now() });
    return stored;
  }

  const rows = await rankFromPlays(period, days, fresh);
  memo.set(period, { rows, at: Date.now() });
  saveAppSetting({ [ROWS[period]]: rows, [STAMPS[period]]: new Date().toISOString() }).catch(() => {});
  return rows;
}