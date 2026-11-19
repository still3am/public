import './catalog-about.css';
import { artistDetailRows } from '@/lib/artistDetails';
import CollapsibleText from '@/components/CollapsibleText';
import { useEffect, useState } from 'react';
import { findArtistInfo } from '@/lib/artistInfo';

function safeLink(value) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : null; }
  catch { return null; }
}

/** @param {{artist:any}} props */
export default function ArtistCatalogInfo({ artist }) {
  const [info, setInfo] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setInfo(null); setLoading(true); setError(false);
    findArtistInfo(artist).then(value => { if (alive) setInfo(value); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [artist.name, artist.location, artist.musicbrainz_id, artist.bio, artist.history_text, retry]);

  const savedBio = artist.bio?.trim();
  const history = artist.history_text?.trim();
  const biography = savedBio || (!history && info?.biography?.text);
  const officialWebsite = !artist.website && safeLink(info?.website);
  const rows = artistDetailRows(artist, info);

  return <div className="catalog-about artist-about-details">
    {!biography && !history && loading && <div className="artist-biography-loading" aria-hidden="true"><span /><span /><span /></div>}
    {biography && <div className="artist-biography">
      <h3>Biography</h3>
      <CollapsibleText text={biography} className="artist-about-copy selectable-content" clampClass="max-h-40" />
    </div>}
    {history && history !== savedBio && <div className="artist-biography artist-history">
      <h3>History</h3>
      <CollapsibleText text={history} className="artist-about-copy selectable-content whitespace-pre-line" clampClass="max-h-40" />
    </div>}
    {!biography && !history && !loading && <p className="artist-biography-empty">A biography hasn’t been added yet.</p>}
    {rows.length > 0 && <div className="artist-detail-facts artist-details-plain"><h3>Artist details</h3>
       <dl className="catalog-song-facts artist-detail-grid">{rows.map(({label,value}) => <div key={label}>
        <dt>{label}</dt><dd>{Array.isArray(value) ? value.join(" · ") : value}</dd>
      </div>)}</dl>    </div>}
    {loading && <p className="artist-about-status" role="status">Loading artist details…</p>}
    {error && <div className="artist-about-status" role="status">Additional details couldn’t load. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {officialWebsite && <a className="artist-official-link" href={officialWebsite} target="_blank" rel="noopener noreferrer">Official website ↗</a>}
  </div>;
}
