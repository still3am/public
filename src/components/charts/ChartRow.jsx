import TrackRow from '@/components/TrackRow';
import compactCount from '@/lib/compactCount';

// One ranked song: its position and movement, the song itself, and the plays
// behind that placement — the period count plus the song's public all-time total.
export default function ChartRow({ track, index, queue, rank, row, period }) {
  const movement = row?.movement;
  const plays = period === 'all' ? track.play_count || 0 : row?.plays || 0;
  const total = track.play_count || 0;

  return (
    <div className="chart-ranked-row">
      <span className="chart-position">
        {rank}
        {period !== 'all' && row && (
          <small className="block text-[10px] leading-tight" aria-label={movement === null ? 'New this period' : `Position change ${movement}`}>
            {movement === null ? 'NEW' : movement > 0 ? '↑' + movement : movement < 0 ? '↓' + Math.abs(movement) : '—'}
          </small>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <TrackRow track={track} queue={queue} queueIndex={index} showArt />
      </div>
      <div className="hidden shrink-0 text-right tabular-nums sm:block">
        <p className="text-xs font-semibold text-foreground/75">
          {compactCount(plays)} <span className="text-[9px] font-medium uppercase tracking-wide text-foreground/40">plays</span>
        </p>
        {period !== 'all' && <p className="text-[10px] text-foreground/40">{compactCount(total)} total</p>}
      </div>
    </div>
  );
}