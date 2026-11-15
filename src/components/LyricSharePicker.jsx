import LyricCoverGradient from '@/components/LyricCoverGradient';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {findLyricsCatalog} from '@/lib/lyricsCatalog';

export default function LyricSharePicker({track,result,initialLine,onClose,onSelect}){
  const [animated,setAnimated]=useState(false);
  const cover=useCoverUrl(track.cover_art_url);
  const [resolved,setResolved]=useState(result||null);
  const [error,setError]=useState('');
  const initialLines=result?.record?.lines?.length?result.record.lines:(result?.text||"").split(/\r?\n/).map(text=>({text}));
  const initialIndex=initialLine?initialLines.filter(line=>line.text.trim()&&line.text!=="♪").findIndex(line=>line.text.trim()===initialLine.text.trim()&&line.start_time_ms===initialLine.start_time_ms):-1;
  const [start,setStart]=useState(initialIndex<0?null:initialIndex);
  const [end,setEnd]=useState(initialIndex<0?null:initialIndex);
  useEffect(()=>{
    if(result)return;
    const controller=new AbortController();
    findLyricsCatalog(track,{signal:controller.signal}).then(value=>{
      if(!controller.signal.aborted)setResolved(value||{});
    }).catch(()=>{
      if(!controller.signal.aborted)setError('Could not load lyrics. Close and try again.');
    });
    return()=>controller.abort();
  },[result,track]);
  const timed=resolved?.record?.lines;
  const lines=timed?.length?timed:(resolved?.text||'').split(/\r?\n/).map(text=>({text}));
  const lyrics=lines.filter(line=>line.text.trim()&&line.text!=='♪');
  const excerpt=start===null?[]:lyrics.slice(start,end+1).map(line=>line.text.trim());
  function choose(index){
    if(start===null||index<start||index>start+3||index===start){
      setStart(index);setEnd(index);
    }else setEnd(index);
  }
  const timestamp=lyrics[start]?.start_time_ms;
  const valid=excerpt.length>0&&excerpt.join('\n').length<=400;
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent data-public-dialog className="public-lyric-share-dialog grid max-h-[85dvh] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
      <DialogTitle>Share lyrics</DialogTitle>
      <DialogDescription>Choose a starting line and up to three more consecutive lines.</DialogDescription>
      <div className="min-h-0 overflow-auto overscroll-contain">
        {!resolved&&!error&&<p role="status">Finding lyrics…</p>}
        {error&&<p role="alert">{error}</p>}
        {resolved&&!lyrics.length&&<p>No lyrics available for this song.</p>}
        {lyrics.map((line,index)=><button key={index} type="button" ref={index===initialIndex?node=>node?.scrollIntoView({block:"nearest"}):undefined} aria-pressed={start!==null&&index>=start&&index<=end}
          className="block w-full rounded-lg px-3 py-2 text-left aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          onClick={()=>choose(index)}>{line.text}</button>)}
      </div>
      <div>
        {excerpt.length>0&&<div className="public-lyric-gradient mb-3 whitespace-pre-line rounded-xl p-3 font-semibold text-white" aria-label="Lyric preview">
          <LyricCoverGradient cover={cover} animated={animated}/>
          {excerpt.join('\n')}
        </div>}
        {excerpt.length>0&&!valid&&<p className="mb-2 text-sm">Choose a shorter excerpt.</p>}
        {excerpt.length>0&&<label className="mb-3 flex min-h-10 items-center gap-3 text-sm">
          <input type="checkbox" role="switch" checked={animated} onChange={event=>setAnimated(event.target.checked)} />
          Animate cover colors
        </label>}
        <button type="button" disabled={!valid} className="chrome-button disabled:opacity-40" onClick={()=>onSelect({
          lines:excerpt,startMs:Number.isFinite(timestamp)?timestamp:null,animated,
        })}>Continue</button>
      </div>
    </DialogContent>
  </Dialog>;
}
