import {usePlayer} from '@/context/PlayerContext';
import { useEffect, useState } from 'react';
import { findLyricsCatalog } from '@/lib/lyricsCatalog';
import CollapsibleText from '@/components/CollapsibleText';
/** @param {{track:any}} props */
export default function TrackCatalogLyrics({ track }) {
  const player=usePlayer(),measuredDuration=player.currentTrack?.id===track.id&&player.duration>0?player.duration:track.duration_seconds;
  const identity=JSON.stringify([track.id,track.title,track.artist,measuredDuration]);
  const [storedState, setState] = useState({ identity: '', loading: true, result: null, error: '' }),[revision, setRevision] = useState(0);
  const state=storedState.identity===identity?storedState:{loading:true,result:null,error:''};
  useEffect(()=>{const changed=event=>{if(event.detail?.trackId===track.id)setRevision(v=>v+1);};window.addEventListener('lyrics:changed',changed);return()=>window.removeEventListener('lyrics:changed',changed);},[track.id]);
  useEffect(() => {
    const controller = new AbortController();setState({ identity, loading: true, result: null, error: '' });
    findLyricsCatalog({...track,duration_seconds:measuredDuration}, { signal: controller.signal }).then((result) => {if (!controller.signal.aborted) setState({ identity, loading: false, result, error: '' });}).catch((error) => {if (!controller.signal.aborted) setState({ identity, loading: false, result: null, error: error.message });});
    return () => controller.abort();
  }, [track.id, track.title, track.artist, track.duration_seconds, measuredDuration, revision, identity]);
  return <section className="track-page-section" aria-label="LRCLIB lyrics"><h2 className="text-lg font-extrabold tracking-tight mb-3">Lyrics</h2>
  {state.loading ? <p role="status" className="text-sm text-muted-foreground">Finding lyrics on LRCLIB…</p> : state.error ? <p role="status" className="text-sm text-muted-foreground">{state.error} <button className="underline" onClick={() => setRevision((v) => v + 1)}>Retry</button></p> : state.result?.available ? <><p className="text-xs text-muted-foreground mb-3 hidden">{state.result.record ? 'Synced lyrics available in the player' : 'Plain lyrics · timing unavailable'}</p><CollapsibleText text={state.result.text} className="track-page-lyrics selectable-content whitespace-pre-line leading-relaxed" clampClass="max-h-64" /></> : <p className="text-sm text-muted-foreground">{state.result?.instrumental ? 'This recording is marked instrumental.' : 'No matching lyrics on LRCLIB yet.'}</p>}
 </section>;
}