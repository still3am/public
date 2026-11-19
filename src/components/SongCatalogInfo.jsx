import './catalog-about.css';
import { useEffect, useState } from 'react';
import { findSongInfo } from '@/lib/songInfo';
import { formatTime } from '@/lib/audio-utils';

const display = value => Array.isArray(value) ? value.filter(Boolean).join(', ') : typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
/** @param {{track:any}} props */
export default function SongCatalogInfo({ track }) {
  const [info, setInfo] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;setInfo(null);setLoading(true);setError(false);
    findSongInfo(track).then(value => {if (alive) setInfo(value);})
      .catch(() => {if (alive) setError(true);})
      .finally(() => {if (alive) setLoading(false);});
    return () => {alive = false;};
  }, [track.id, track.title, track.artist, track.duration_seconds, track.album_name, track.album_title, track.album, retry]);
  const savedAlbum = [track.album_name, track.album_title, track.album].map(display).find(value => value && !/^(unknown|unknown album|single)$/i.test(value));
  const rows = [
    ['Artist', track.artist || info?.artists],
    ['Album', savedAlbum || info?.album],
    ['Released', info?.releaseDate || track.release_date || track.release_year],
    ['Duration', track.duration_seconds > 0 ? formatTime(track.duration_seconds) : ''],
    ['Genre', track.genre && !/^(other|unknown)$/i.test(track.genre) ? track.genre : ''],
    ['Produced by', info?.producer], ['Mixed by', info?.mixer],
    ['Engineering', info?.engineer], ['Composed by', info?.composer],
    ['Lyrics by', info?.lyricist], ['Written by', info?.writer],
    ['Arranged by', info?.arranger], ['Performed by', info?.performers]
  ].map(([label,value]) => [label,display(value)]).filter(([,value]) => value);
  return <div className="catalog-about track-song-info">
    {rows.length > 0 && <dl className="catalog-song-facts">{rows.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {loading && <p className="track-info-status" role="status">Loading additional credits…</p>}
    {error && <p className="track-info-status" role="status">Additional credits couldn’t load. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!loading && !error && !rows.length && <p className="track-info-status">Song details haven’t been added yet.</p>}
  </div>;
}
