import './catalog-about.css';
import CollapsibleText from '@/components/CollapsibleText';
import { useEffect, useState } from 'react';
import { findArtistInfo } from '@/lib/artistInfo';
/** @param {{artist:any}} props */
export default function ArtistCatalogInfo({ artist }) {
  const [info, setInfo] = useState(null),[loading, setLoading] = useState(true),[error, setError] = useState(false),[retry, setRetry] = useState(0);
  useEffect(() => {let alive = true;setInfo(null);setLoading(true);setError(false);
    findArtistInfo(artist).then((value) => {if (alive) setInfo(value);}).catch(() => {if (alive) setError(true);}).finally(() => {if (alive) setLoading(false);});return () => {alive = false;};
  }, [artist.name, artist.location, artist.musicbrainz_id, artist.bio, artist.history_text, retry]);
  if (loading) return <p role="status" className="text-xs text-muted-foreground mt-4">Finding artist details…</p>;
  if (error) return <button type="button" className="text-xs text-muted-foreground mt-4" onClick={() => setRetry((v) => v + 1)}>Retry artist details</button>;
  if (!info) return null;
  const rows = [['Artist', info.type==='Person'?'Solo artist':info.type], ['From', !artist.location && (info.origin || info.area)], [info.type === 'Person' ? 'Born' : 'Formed', !artist.formed_year && info.begin], ['Ended', info.end], ['Genres', info.genres||artist.catalogGenres]].filter((row) => row[1]);
  return <div className="mt-5 catalog-about">{!artist.bio?.trim() && !artist.history_text?.trim() && info.biography && <div className="mb-5"><CollapsibleText text={info.biography.text} className="artist-about-copy selectable-content leading-relaxed" clampClass="max-h-28" /><p className="text-xs text-muted-foreground mt-3">From <a href={info.biography.url} target="_blank" rel="noopener noreferrer" className="underline">Wikipedia contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a></p></div>}<dl className="artist-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">{info.website && <a href={info.website} target="_blank" rel="noopener noreferrer" className="underline">Official website</a>}<a href={'https://musicbrainz.org/artist/' + info.id} target="_blank" rel="noopener noreferrer" className="underline hidden">Artist details from MusicBrainz</a></div></div>;
}