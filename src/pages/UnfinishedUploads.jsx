import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileAudio, Loader2, Pencil, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { readAllPages } from "@/lib/readPages";
import { publicSubmitBlockers, awaitingFirstSubmit } from "@/lib/publicSubmit";
import { useUpload } from "@/context/UploadContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import EditTrackModal from "@/components/EditTrackModal";
import PublicSubmitButton from "@/components/upload/PublicSubmitButton";
import EmptyState from "@/components/EmptyState";
import { GENRES } from "@/lib/audio-utils";

function Artwork({ source }) {
  const url = useCoverUrl(source);
  return <div className="w-14 h-14 rounded-xl overflow-hidden bg-foreground/5 shrink-0 grid place-items-center">{url?<img src={url} alt="" className="w-full h-full object-cover" loading="lazy"/>:<FileAudio size={23} className="text-muted-foreground"/>}</div>;
}

export default function UnfinishedUploads() {
  const { user } = useAuth();
  const queue = useUpload();
  const admin = user?.role === "admin";
  const [scope,setScope]=useState("mine"),[tracks,setTracks]=useState(null),[query,setQuery]=useState(""),[filter,setFilter]=useState("all");
  const [editing,setEditing]=useState(null),[limit,setLimit]=useState(50),[refreshing,setRefreshing]=useState(false),[failed,setFailed]=useState(false);
  const [selected,setSelected]=useState(()=>new Set()),[genre,setGenre]=useState(""),[saving,setSaving]=useState(false),[batchFailed,setBatchFailed]=useState(false);
  const request=useRef(0),lock=useRef(false);
  const load=useCallback(async()=>{
    const version=++request.current;
    if(!user?.id){setTracks([]);return;}
    setRefreshing(true);setFailed(false);
    try {
      const rows=await readAllPages(options=>base44.entities.Track.filter({is_published:{$ne:true},...(!(admin&&scope==="all")?{uploader_id:user.id}:{})},{sort:"-created_date",...options}));
      if(version===request.current)setTracks(rows);
    }catch{if(version===request.current)setFailed(true);}
    finally{if(version===request.current)setRefreshing(false);}
  },[user?.id,admin,scope]);
  useEffect(()=>{setTracks(null);setSelected(new Set());setEditing(null);load();return()=>{request.current++;};},[load]);
  useEffect(()=>setLimit(50),[query,filter,scope]);
  const canEdit=t=>admin||t.uploader_id===user?.id;
  const draft=t=>awaitingFirstSubmit(t);
  const needsGenre=t=>!t.genre||t.genre==="Other"||!GENRES.includes(t.genre);
  const visible=useMemo(()=>{
    const term=query.trim().toLowerCase();
    return (tracks||[]).filter(t=>(filter==="all"||filter==="genre"&&needsGenre(t)||filter==="ready"&&draft(t)&&!publicSubmitBlockers(t).length||t.approval_status===filter)&&(!term||[t.title,t.artist,t.genre].some(v=>String(v||"").toLowerCase().includes(term))));
  },[tracks,query,filter]);
  const updateTrack=saved=>{setTracks(prev=>(prev||[]).map(t=>t.id===saved.id?{...t,...saved}:t).filter(t=>!t.is_published));};
  const markSubmitted=ids=>setTracks(prev=>(prev||[]).flatMap(t=>!ids.includes(t.id)?[t]:admin?[]:[{...t,approval_status:"pending",is_published:false}]));
  const toggle=id=>setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  async function applyGenre(){
    if(lock.current||!genre||!selected.size)return;
    lock.current=true;setSaving(true);setBatchFailed(false);
    const ids=(tracks||[]).filter(t=>selected.has(t.id)&&canEdit(t)&&draft(t)).map(t=>t.id);
    const version=request.current;
    try {
      // Keep completed chunks reflected even if a later chunk needs a retry.
      for(let start=0;start<ids.length;start+=50){
        if(version!==request.current)return;
        const chunk=ids.slice(start,start+50);
        await base44.entities.Track.bulkUpdate(chunk.map(id=>({id,genre})));
        if(version!==request.current)return;
        setTracks(prev=>(prev||[]).map(t=>chunk.includes(t.id)?{...t,genre}:t));
        setSelected(prev=>new Set([...prev].filter(id=>!chunk.includes(id))));
      }
      setGenre("");
    }catch{if(version===request.current)setBatchFailed(true);}
    finally{lock.current=false;setSaving(false);}
  }
  const queued=(queue?.items||[]).filter(t=>t.status!=="done").length;
  return <div className="max-w-5xl mx-auto pb-10">
    <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-5"><ChevronLeft size={18}/>Library</Link>
    <header className="page-intro"><h1>Unfinished uploads</h1><p>Finish the details for music saved here, then send it to PUBLIC.</p></header>
    <div className="rounded-2xl border border-border p-4 mb-5 space-y-2">
      <p className="text-sm"><strong>{tracks===null?"…":tracks.length}</strong> unpublished songs{tracks&&<> · {tracks.filter(needsGenre).length} genres to review</>}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">These songs are already stored. Editing their genre does not upload the audio again. “Other” is a valid genre; review it when it was a fallback.</p>
      <Link to="/upload" className="inline-flex text-sm underline underline-offset-4">{queued? `Continue ${queued} queued uploads`:"Choose files that never finished uploading"}</Link>
    </div>
    <div className="collection-tools">
      <input aria-label="Search unfinished uploads" placeholder="Search songs or artists" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="Filter unfinished uploads" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All unfinished</option><option value="genre">Review genre</option><option value="private">Private drafts</option><option value="ready">Ready to submit</option><option value="pending">In review</option><option value="rejected">Rejected</option></select>
      {admin&&<select aria-label="Upload owner" value={scope} onChange={e=>{if(!saving)setScope(e.target.value);}} disabled={saving}><option value="mine">My uploads</option><option value="all">All uploads · admin</option></select>}
      <button className="playlist-action" onClick={load} disabled={refreshing||saving} aria-label="Refresh unfinished uploads"><RefreshCw size={17} className={refreshing?"animate-spin":""}/></button>
    </div>
    {selected.size>0&&<div className="rounded-2xl border border-border p-3 mb-4 flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">{selected.size} selected</span>
      <select className="rounded-xl border border-border bg-background p-2 text-sm max-w-full" aria-label="Genre for selected songs" value={genre} onChange={e=>setGenre(e.target.value)} disabled={saving}><option value="">Choose genre</option>{GENRES.map(g=><option key={g}>{g}</option>)}</select>
      <button className="playlist-action" onClick={applyGenre} disabled={!genre||saving}>{saving?<Loader2 size={15} className="animate-spin"/>:null}Save genre</button>
      <button className="text-sm underline" onClick={()=>setSelected(new Set())} disabled={saving}>Clear selection</button>
      {batchFailed&&<span className="text-xs text-muted-foreground">Some changes did not save. Remaining songs are still selected; retry when ready.</span>}
    </div>}
    {tracks===null&&refreshing?<div className="py-16 grid place-items-center"><Loader2 className="animate-spin"/></div>:failed&&tracks===null?<button className="playlist-action" onClick={load}>Retry loading uploads</button>:!visible.length?<EmptyState icon={FileAudio} title={tracks?.length?"No matching uploads":"Nothing unfinished here"} description={tracks?.length?"Try another search or filter.":"Files that never reached PUBLIC must be selected again from your device."}/>:<>
      <p className="text-xs text-muted-foreground mb-3">{visible.length} songs · Select drafts to change their genre together.</p>
      <div className="divide-y divide-border">{visible.slice(0,limit).map(t=>{
        const missing=publicSubmitBlockers(t),editable=canEdit(t),isDraft=draft(t);
        return <article key={t.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 py-4 min-w-0">
          {editable&&isDraft&&<input className="shrink-0" style={{width:18,height:18}} type="checkbox" checked={selected.has(t.id)} onChange={()=>toggle(t.id)} disabled={saving} aria-label={`Select ${t.title}`}/>}
          <Artwork source={t.cover_art_url}/>
          <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{t.title||"Untitled"}</p><p className="text-xs text-muted-foreground truncate mt-1">{t.artist||"Add artist"}</p><p className="text-xs text-muted-foreground mt-1">{t.approval_status==="rejected"?"Rejected · check review before resubmitting":t.approval_status==="pending"?"Awaiting review":missing.length?`Needs ${missing.join(", ")}`:needsGenre(t)?"Review genre · Other":"Draft · "+t.genre}</p></div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {editable&&<button className="playlist-action text-xs" disabled={saving} onClick={()=>setEditing(t)}><Pencil size={14}/>Edit details</button>}
            {editable&&isDraft&&<div className="max-w-[180px]"><PublicSubmitButton track={t} onSubmitted={markSubmitted}/></div>}
          </div>
        </article>;
      })}</div>
      {visible.length>limit&&<button className="playlist-action mt-5" onClick={()=>setLimit(n=>n+50)}>Show more ({visible.length-limit} remaining)</button>}
    </>}
    {editing&&<EditTrackModal track={editing} onClose={()=>setEditing(null)} onSaved={updateTrack} onDeleted={()=>{setTracks(prev=>(prev||[]).filter(t=>t.id!==editing.id));setSelected(prev=>new Set([...prev].filter(id=>id!==editing.id)));}}/>}
  </div>;
}
