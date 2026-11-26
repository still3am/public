import { useMemo } from 'react';
import compactCount from '@/lib/compactCount';

// A short read of the chart, built only from data the page already has: play
// counts per song, the ranking rows for the period, and the public song totals.
export default function ChartSummary({ period, positions, tracks }) {
  const stats = useMemo(() => {
    if (period === 'all') {
      const plays = tracks.reduce((sum, track) => sum + (track.play_count || 0), 0);
      const likes = tracks.reduce((sum, track) => sum + (track.like_count || 0), 0);
      return [
        { label: 'Total plays', value: compactCount(plays) },
        { label: 'Songs charted', value: compactCount(tracks.length) },
        { label: 'Likes', value: compactCount(likes) },
      ];
    }
    const titles = new Map(tracks.map((track) => [track.id, track]));
    const plays = positions.reduce((sum, row) => sum + (row.plays || 0), 0);
    const fresh = positions.filter((row) => row.movement === null).length;
    const riser = [...positions].sort((a, b) => (b.growth || 0) - (a.growth || 0))[0];
    const riserTrack = riser ? titles.get(riser.track_id) : null;
    return [
      { label: period === 'week' ? 'Plays this week' : 'Plays this month', value: compactCount(plays) },
      { label: 'Songs charted', value: compactCount(positions.length) },
      { label: 'New entries', value: compactCount(fresh) },
      { label: 'Biggest riser', value: riserTrack?.title || '—', detail: riserTrack && riser.growth > 0 ? '+' + compactCount(riser.growth) + ' plays' : '', title: riserTrack?.title },
    ];
  }, [period, positions, tracks]);

  const columns = stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/50 mb-5 ${columns}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 bg-card px-4 py-3.5">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1.5 truncate text-lg font-semibold tracking-tight" title={stat.title || stat.value}>{stat.value}</dd>
          {stat.detail && <small className="text-[11px] text-muted-foreground">{stat.detail}</small>}
        </div>
      ))}
    </dl>
  );
}