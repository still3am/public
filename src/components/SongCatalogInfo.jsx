import './catalog-about.css';
import { useEffect, useState } from 'react';
import { findSongInfo } from '@/lib/songInfo';
/** @param {{track:any}} props */
export default function SongCatalogInfo({ track }) {
  const [info, setInfo] = useState(null),[loading, setLoading] = useState(true),[error, setError] = useState(false),[retry, setRetry] = useState(0);
  useEffect(() => {let alive = true;setInfo(null);setLoading(true);setError(false);
    findSongInfo(track).then((value) => {if (alive) setInfo(value);}).catch(() => {if (alive) setError(true);}).finally(() => {if (alive) setLoading(false);});
    return () => {alive = false;};
  }, [track.id, track.title, track.artist, track.duration_seconds, track.album_name, track.album_title, track.album, retry]);
  if (loading) return <p role="status" className="text-xs text-muted-foreground mt-3">Finding song details…</p>;
  if (error) return <button type="button" className="text-xs text-muted-foreground mt-3" onClick={() => setRetry((v) => v + 1)}>Retry song details</button>;
  if (!info) return null;
  const rows = [['Artist', info.artists], ['Album / release', info.album], ['Release date', info.releaseDate], ['Produced by', info.producer], ['Mixed by', info.mixer], ['Engineering', info.engineer]].filter((row) => row[1]);
  return <div className="mt-4 catalog-about"><dl className="catalog-song-facts">{rows.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm mt-1 break-words">{value}</dd></div>)}</dl><a className="inline-block text-xs text-muted-foreground underline mt-4 hidden" href={'https://musicbrainz.org/recording/' + info.id} target="_blank" rel="noopener noreferrer">Song details from MusicBrainz</a></div>;
}