import { useEffect, useState } from 'react';
import {getPublicLyrics} from '@/lib/publicLyrics';
import CollapsibleText from '@/components/CollapsibleText';
import FindLyricsModal from '@/components/FindLyricsModal';
/** @param {{track:any}} props */
export default function TrackCatalogLyrics({ track }) {
  const [state, setState] = useState({ loading: true, result: null, error: '' }),[revision, setRevision] = useState(0),[finding, setFinding] = useState(false);
  useEffect(()=>{const saved=event=>{if(event.detail?.trackId===track.id)setState({loading:false,result:event.detail.result,error:''});};window.addEventListener('lyrics:cache-status',saved);return()=>window.removeEventListener('lyrics:cache-status',saved);},[track.id]);
  useEffect(()=>{const changed=event=>{if(event.detail?.trackId===track.id)setRevision(v=>v+1);};window.addEventListener('lyrics:changed',changed);return()=>window.removeEventListener('lyrics:changed',changed);},[track.id]);
  useEffect(() => {
    const controller = new AbortController();setState({ loading: true, result: null, error: '' });
    getPublicLyrics(track, { signal: controller.signal }).then((result) => {if (!controller.signal.aborted) setState({ loading: false, result, error: '' });}).catch((error) => {if (!controller.signal.aborted) setState({ loading: false, result: null, error: error.message });});
    return () => controller.abort();
  }, [track.id, track.title, track.artist, track.duration_seconds, track.album_name, revision]);
  return <section className="track-page-section" aria-label="LRCLIB lyrics"><h2 className="text-lg font-extrabold tracking-tight mb-3">Lyrics</h2>
  {state.loading ? <p role="status" className="text-sm text-muted-foreground">Finding lyrics on LRCLIB…</p> : state.error ? <p role="status" className="text-sm text-muted-foreground">{state.error} <button className="underline" onClick={() => setRevision((v) => v + 1)}>Retry</button></p> : state.result?.available ? <><p className="text-xs text-muted-foreground mb-3 hidden">{state.result.record ? 'Synced lyrics available in the player' : 'Plain lyrics · timing unavailable'}</p><CollapsibleText text={state.result.text} className="track-page-lyrics selectable-content whitespace-pre-line leading-relaxed" clampClass="max-h-64" /></> : <p className="text-sm text-muted-foreground">{state.result?.instrumental ? 'This recording is marked instrumental.' : 'Synced lyrics aren’t available for this recording yet.'}</p>}
  {state.result?.cacheStatus==='unavailable'&&<p role="status" className="text-xs text-muted-foreground mt-2">{state.result.cacheMessage}</p>}
  {state.result?.cacheStatus==='saving'&&<p role="status" className="text-xs text-muted-foreground mt-2">Saving synced lyrics for everyone…</p>}
  {finding && <FindLyricsModal track={track} onClose={() => setFinding(false)} onSaved={() => {setFinding(false);}} />}
 </section>;
}