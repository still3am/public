import { useEffect, useRef, useState } from 'react';
import { Loader2, X, Search, Save } from 'lucide-react';
import { base44, saveSyncedLyrics } from '@/api/base44Client';
import { lyricsResult, searchLyricsCatalog } from '@/lib/lyricsCatalog';
/** @param {any} props */
export default function FindLyricsModal({track,onClose,onSaved}) {
  const [title,setTitle]=useState(track.title||''),[artist,setArtist]=useState(track.artist||'');
  const [rows,setRows]=useState([]),[selected,setSelected]=useState(null),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
  const controller=useRef(null),alive=useRef(true),saveLock=useRef(false);
  async function search(){
    if(saveLock.current)return;
    controller.current?.abort();const current=new AbortController();controller.current=current;
    setLoading(true);setNotice('');setRows([]);setSelected(null);
    try{const result=await searchLyricsCatalog({title,artist},{signal:current.signal});if(!current.signal.aborted&&alive.current){setRows(result);if(!result.length)setNotice('No matches found. Try a different title or artist, or use manual lyrics.');}}
    catch(error){if(!current.signal.aborted&&alive.current)setNotice(error.message);}
    finally{if(!current.signal.aborted&&alive.current)setLoading(false);}
  }
  useEffect(()=>{alive.current=true;search();return()=>{alive.current=false;controller.current?.abort();};},[track.id]);
  const result=lyricsResult(selected,Number(selected?.duration)||track.duration_seconds);
  async function save(){
    if(saveLock.current||!result?.available)return;
    saveLock.current=true;setSaving(true);setNotice('');
    try{
      // Plain lyrics are confirmed independently; a failed timing write remains retryable.
      const saved=await base44.entities.Track.update(track.id,{lyrics_text:result.text});
      if(!saved?.id)throw new Error('Lyrics save was not confirmed.');
      if(result.record?.lines?.length)await saveSyncedLyrics({trackId:track.id,lines:result.record.lines});
      if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('lyrics:changed',{detail:{trackId:track.id}}));
      if(alive.current)onSaved?.({...saved,lyrics_text:result.text});
    }catch(error){if(alive.current)setNotice(error?.response?.status===402||error?.status===402?'Saving is unavailable right now. Your selected lyrics are still here; retry later.':error.message||'Could not save. Your selection is still here.');}
    finally{saveLock.current=false;if(alive.current)setSaving(false);}
  }
  const close=()=>{if(!saveLock.current)onClose();};
  return <div role="dialog" aria-modal="true" aria-label="Find lyrics" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={close}>
    <div className="bg-background w-full md:max-w-xl rounded-t-3xl md:rounded-3xl border border-border flex flex-col max-h-[92dvh]" onClick={e=>e.stopPropagation()}>
      <header className="flex justify-between items-center p-4 border-b"><h2 className="font-bold">Find lyrics · LRCLIB</h2><button className="p-3 rounded-full" onClick={close} disabled={saving} aria-label="Close"><X size={18}/></button></header>
      <div className="p-4 overflow-y-auto min-h-0 space-y-3"><p className="text-xs text-muted-foreground">Free catalog lookup. Choose the correct recording and review its words and timing before saving. Saving replaces this song’s lyrics{result?.record?' and synced timing':''}.</p>
      <form onSubmit={e=>{e.preventDefault();search();}} className="space-y-2"><label className="block text-xs">Song title<input className="block w-full border rounded-xl bg-background px-3 py-2 mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} disabled={saving}/></label><label className="block text-xs">Artist<input className="block w-full border rounded-xl bg-background px-3 py-2 mt-1" value={artist} onChange={e=>setArtist(e.target.value)} maxLength={200} disabled={saving}/></label><button type="submit" className="playlist-action" disabled={loading||saving||!title.trim()||!artist.trim()}><Search size={14}/> Search lyrics</button></form>
      {loading&&<p role="status" className="flex gap-2 text-sm"><Loader2 size={15} className="animate-spin"/>Finding matches…</p>}{notice&&<p role="status" className="text-xs text-muted-foreground">{notice}</p>}
      <div className="space-y-2">{rows.map(row=><button key={row.id} disabled={saving} aria-pressed={selected?.id===row.id} onClick={()=>setSelected(row)} className={`w-full text-left p-3 border rounded-xl ${selected?.id===row.id?'border-foreground':'border-border'}`}><strong className="block text-sm">{row.trackName}</strong><span className="block text-xs text-muted-foreground">{row.artistName} · {row.albumName||'Unknown album'} · {Math.round(row.duration)}s · {row.instrumental?'Instrumental':row.syncedLyrics?'Synced lyrics':'Plain lyrics'}</span>{track.duration_seconds>0&&Math.abs(row.duration-track.duration_seconds)>2&&<span className="block text-xs mt-1">Different duration — check this version carefully.</span>}</button>)}</div>
      {selected&&<div className="border rounded-xl p-3"><h3 className="text-sm font-semibold mb-2">Preview</h3><pre className="selectable-content whitespace-pre-wrap text-sm font-sans leading-7 max-h-52 overflow-y-auto">{result?.text||(selected.instrumental?'Instrumental — no lyrics.':'No lyrics in this record.')}</pre></div>}
      <a href="https://lrclib.net" target="_blank" rel="noopener noreferrer" className="text-xs underline">Lyrics provided by LRCLIB</a></div>
      <footer className="p-4 border-t flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]"><button className="playlist-action flex-1" disabled={saving} onClick={close}>Cancel</button><button className="playlist-action flex-1 bg-foreground text-background" onClick={save} disabled={loading||saving||!result?.available}>{saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}Save{result?.record?' synced lyrics':' lyrics'}</button></footer>
    </div></div>;
}
