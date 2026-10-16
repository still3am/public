import {copyText} from '@/lib/shareLink';
import {readAllPages} from "@/lib/readPages";
import {Image} from "@/components/ui/image";
import {coalesce} from "@/lib/coalesce";
import { getPublishedTracks,peekPublishedTracks } from "@/lib/catalogCache";
import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { fetchSessionByCode, parseTrack } from "@/lib/lounge";
import { getRecentPlays } from "@/lib/recentPlays";
import {
  Loader2,
  Speaker,
  Plus,
  Check,
  X,
  ListMusic,
  Search,
  Clock, Copy, Users } from
"lucide-react";

export default function Lounge() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error,setError]=useState(false),[retry,setRetry]=useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const memberVersion=useRef(0),room=useRef({code,uid:user?.id,sid:session?.id});room.current={code,uid:user?.id,sid:session?.id};

  // Resolve session + create-or-fetch my membership record.
  useEffect(() => {
    let cancelled = false;
    memberVersion.current++;setSession(null);setMember(null);setMembers([]);setPickerOpen(false);
    (async () => {
      if (!code || !user?.id) return;
      setLoading(true);setError(false);setNotFound(false);
      try {
        const s = await fetchSessionByCode(code);
        if (cancelled) return;
        if (!s) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setSession(s);
        const mine = await base44.entities.LoungeMember.filter(
          { session_id: s.id, user_id: user.id },
          "created_date",
          50
        );
        if (cancelled) return;
        if (mine.length) {
          setMember(mine[0]);
        } else if (s.host_id === user.id) {
          const m = await base44.entities.LoungeMember.create({
            session_id: s.id,
            user_id: user.id,
            name: user.display_name || user.full_name || "",
            role: "host",
            status: "approved"
          });
          if (!cancelled) setMember(m);
        } else {
          const m = await base44.entities.LoungeMember.create({
            session_id: s.id,
            user_id: user.id,
            name: user.display_name || user.full_name || "",
            role: "guest",
            status: "pending"
          });
          if (!cancelled) setMember(m);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, user?.id,retry]);

  const refreshMember = useCallback(async (sid) => {
    const request=++memberVersion.current,uid=user?.id;
    try {
      const all=await readAllPages(options=>base44.entities.LoungeMember.filter({session_id:sid},{sort:'created_date',...options}));
      if(request!==memberVersion.current||room.current.sid!==sid||room.current.uid!==uid)return;
      setMembers(all);
      setMember(all.find(member=>member.user_id===uid)||null);
    } catch(error) {if((error.status??error.response?.status)===410&&room.current.sid===sid){setNotFound(true);setPickerOpen(false);}}
  }, [user?.id]);

  useEffect(() => {
    if (!session?.id) return;
    refreshMember(session.id);
    const reload=coalesce(()=>refreshMember(session.id),700);
    let unsub;
    try {unsub=base44.entities.LoungeMember.subscribe(reload);} catch {}
    const poll=setInterval(reload,30000);
    return()=>{memberVersion.current++;reload.cancel();unsub?.();clearInterval(poll);};
  }, [session?.id, refreshMember]);

  useEffect(()=>{
    if(!session?.id||member?.status!=="approved")return;
    let active=true,reading=false;
    const refresh=async()=>{
      if(reading||document.hidden)return;
      reading=true;
      try{const current=await base44.entities.LoungeSession.get(session.id);if(active){setSession(current);if(!current.is_active){setNotFound(true);setPickerOpen(false);}}}catch(error){if(active&&(error.status??error.response?.status)===410){setNotFound(true);setPickerOpen(false);}}finally{reading=false;}
    };
    refresh();const timer=setInterval(refresh,15000);
    return()=>{active=false;clearInterval(timer);};
  },[session?.id,member?.status]);
  const approved = member?.status === "approved";
  const isHost = member?.role === "host";
  const rejected = member?.status === "rejected";
  const pending = member?.status === "pending";

  if(error)return <LoadError onRetry={()=>setRetry(n=>n+1)}/>;
  return (
    <div className="min-h-screen pb-10">
      <div className="lounge-layout mx-auto">
        {loading ?
        <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-foreground/50" />
          </div> :
        notFound ?
        <div className="text-center py-24">
            <Speaker size={36} className="mx-auto text-foreground/30 mb-3" />
            <h2 className="text-lg font-extrabold">Lounge not found</h2>
            <p className="text-sm text-foreground/50 mt-1 mb-4">
              The host may have ended the lounge, or the code is wrong.
            </p>
            <Link to="/" className="text-sm font-semibold underline">
              Back home
            </Link>
          </div> :
        !approved ?
        <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-foreground/5 grid place-items-center mx-auto mb-4">
              {pending ? <Clock size={28} className="text-foreground/50" /> : <X size={28} className="text-red-500" />}
            </div>
            {pending ?
          <>
                <h2 className="text-lg font-extrabold">Waiting for approval</h2>
                <p className="text-sm text-foreground/50 mt-1 max-w-xs mx-auto">
                  The host ({session?.host_name || "Host"}) needs to let you in. This page updates automatically.
                </p>
                <div className="inline-flex items-center gap-2 mt-4 text-xs text-foreground/40">
                  <Loader2 size={13} className="animate-spin" /> Listening for the host's decision…
                </div>
              </> :

          <>
                <h2 className="text-lg font-extrabold">Declined by host</h2>
                <p className="text-sm text-foreground/50 mt-1">You weren't let into this lounge.</p>
                <button
              onClick={() => nav("/")}
              className="mt-4 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
              
                  Back home
                </button>
              </>
          }
          </div> :

        <>
            <header className="lounge-hero">
              <div className="eyebrow flex items-center gap-2"><Speaker size={14}/> PUBLIC Lounge</div>
              <h1>{session.name || "Good music. Shared company."}</h1>
              <p>A shared queue, selected by everyone in the room. Hosted by {session.host_name || "Host"}.</p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button className="chrome-button" onClick={async()=>{try{await copyText(window.location.href);toast({title:"Lounge invite copied"});}catch{toast({title:"Couldn’t copy the lounge invite. Please try again.",variant:"destructive"});}}}><Copy size={15}/> Copy invite</button>
                <span className="chip"><Users size={14}/>{members.filter(m=>m.status==="approved").length} approved</span>
                <span className="chip">Code {session.code}</span>
              </div>
            </header>
            <div className="lounge-columns">
            <div>
            <LoungeQueueList key={session.id} sessionId={session.id} isHost={isHost} />

            </div>
            <aside className="lounge-community">
              <div className="eyebrow">In this room</div>
              <h2 className="text-xl font-bold mt-2 mb-4">The listening circle</h2>
              <div className="space-y-3">{members.filter(m=>m.status==="approved").map(m=><div key={m.id} className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-muted grid place-items-center"><Users size={15}/></div><div className="min-w-0"><p className="text-sm font-semibold truncate">{m.name || "Listener"}</p><p className="text-xs text-muted-foreground">{m.role==="host"?"Host":"Guest"}</p></div></div>)}</div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-5 mb-4">Add something you love. The host controls playback; everyone helps shape the queue.</p>
            {/* Add to the shared queue */}
            <button
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-border hover:bg-foreground/[0.04] text-sm font-semibold transition mb-3">
            
              <Plus size={16} /> Add music to the queue
            </button>

            <div className="text-[11px] text-foreground/40 text-center">
              Lounge code <span className="font-bold tracking-widest">{session?.code}</span>
              {!isHost && ` · hosted by ${session?.host_name || "Host"}`}
            </div>
            </aside></div>
          </>
        }
      </div>

      {pickerOpen && session?.id && user?.id &&
      <GuestQueuePicker
        sessionId={session.id}
        user={user}
        onClose={() => setPickerOpen(false)}
        onAdded={(ok) =>
        toast(
          ok === false ?
          { title: "Couldn't add track", variant: "destructive" } :
          { title: "Added to the lounge queue" }
        )
        } />

      }
    </div>);

}

// ---------------- Guest add-to-queue picker ----------------
/** @param {any} props */
function GuestQueuePicker({ sessionId, user, onClose, onAdded }) {
  const { ids } = useLibrary();
  const libraryIds = Array.from(ids || []);
  const [tracks, setTracks] = useState(()=>peekPublishedTracks().length?peekPublishedTracks():null);
  const pickerVersion=useRef(0),pickerAlive=useRef(true);
  const [resultLimit,setResultLimit]=useState(60);
  useEffect(()=>{pickerAlive.current=true;return()=>{pickerAlive.current=false;};},[]);
  const [query, setQuery] = useState("");
  useEffect(()=>setResultLimit(60),[query]);
  const [justAdded, setJustAdded] = useState(new Set());
  const addingRef=useRef(new Set());
  const [adding,setAdding]=useState(new Set());
  const [pickerError,setPickerError]=useState(false);
  useEffect(()=>{const previous=/** @type {HTMLElement|null} */ (document.activeElement);const handler=e=>{if(e.key==="Escape")onClose();if(e.key==="Tab"){const nodes=Array.from(document.querySelectorAll(".lounge-picker button:not(:disabled),.lounge-picker input")).map(node=>/** @type {HTMLElement} */ (node));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener("keydown",handler);return()=>{document.removeEventListener("keydown",handler);previous?.focus?.();};},[onClose]);

  const load = useCallback(async () => {
    const request=++pickerVersion.current;setPickerError(false);
    const recent=getRecentPlays().slice(0,30);
    const [catalogue,library]=await Promise.allSettled([
      getPublishedTracks(),
      (async()=>{const list=[];for(let start=0;start<libraryIds.length;start+=200){list.push(...await readAllPages(opts=>base44.entities.Track.filter({id:{$in:libraryIds.slice(start,start+200)}},{...opts})));}return list;})()
    ]);
    if(request!==pickerVersion.current)return;
    const byId=new Map();
    [...(library.status==="fulfilled"?library.value:[]),...recent,...(catalogue.status==="fulfilled"?catalogue.value:peekPublishedTracks())].forEach(track=>{if(track?.id)byId.set(track.id,track);});
    setTracks([...byId.values()]);setPickerError(catalogue.status==="rejected");
  }, [libraryIds.join(",")]);

  useEffect(()=>{load();return()=>{pickerVersion.current++;};},[load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tracks || [];
    if (!q) return list;
    return list.filter(
      (t) =>
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.uploader_name?.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  const add = async (t) => {
    if(addingRef.current.has(t.id)||justAdded.has(t.id))return;
    addingRef.current.add(t.id);setAdding(new Set(addingRef.current));
    const slim = {
      id: t.id,
      title: t.title,
      artist: t.artist || t.uploader_name || "",
      uploader_id: t.uploader_id,
      uploader_name: t.uploader_name || "",
      cover_art_url: t.cover_art_url || "",
      audio_url: t.audio_url,
      duration_seconds: t.duration_seconds || 0,
      genre: t.genre || "Other",
      explicit: !!t.explicit
    };
    try {
      await base44.entities.LoungeQueueItem.create({
        session_id: sessionId,
        track_id: t.id,
        track: JSON.stringify(slim),
        added_by_id: user?.id,
        added_by_name: user?.display_name || user?.full_name || ""
      });
      if(pickerAlive.current){setJustAdded((prev) => new Set(prev).add(t.id));onAdded?.(true);}
    } catch (e) {
      // Preserve the picker for retry without a failure popup.
    } finally {addingRef.current.delete(t.id);if(pickerAlive.current)setAdding(new Set(addingRef.current));}
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Add music to lounge" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();onClose();}}} className="lounge-picker fixed inset-0 z-[70] bg-card text-foreground backdrop-blur-xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 shrink-0 text-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="opacity-80 shrink-0" />
          <h2 className="text-lg font-bold truncate">Add to the lounge queue</h2>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-90 transition" aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="px-5 pb-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find music for the lounge queue" autoFocus placeholder="Search PUBLIC, your library & recent plays"
            className="w-full pl-10 pr-3 py-2.5 rounded-full bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-accent transition text-foreground" />
          
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground">
        {pickerError&&<button onClick={load} className="p-3 text-sm underline">Refresh music</button>}
        {!tracks ?
        <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div> :
        !filtered.length ?
        <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">{query ? "No matches." : "Add tracks to your library first."}</p>
          </div> :

        <div className="space-y-0.5">
            {filtered.slice(0,resultLimit).map((t) => {
            const added = justAdded.has(t.id);
            return (
              <div key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition">
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                    {t.cover_art_url && <Image src={t.cover_art_url} fittingType="fill" alt="" className="w-full h-full"/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.artist || t.uploader_name || "Unknown"}</div>
                  </div>
                  <button
                  onClick={() => add(t)}
                  disabled={added || adding.has(t.id)}
                  className={`shrink-0 w-9 h-9 rounded-full grid place-items-center active:scale-90 transition ${
                  added ? "bg-accent text-foreground" : "bg-muted hover:bg-accent"}`
                  }
                  aria-label={added ? "Added" : "Add"}>
                  
                    {adding.has(t.id)?<Loader2 size={16} className="animate-spin"/>:added ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>);

          })}
          {resultLimit<filtered.length&&<button onClick={()=>setResultLimit(value=>value+60)} className="playlist-action mx-auto flex mt-4">Show more songs</button>}
          </div>
        }
      </div>
    </div>);

}

// ---------------- Live shared queue ----------------
/** @param {any} props */
function LoungeQueueList({ sessionId, isHost }) {
  const p = usePlayer();
  const {user}=useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [queueError,setQueueError]=useState(false);
  const [removingId, setRemovingId] = useState("");
  const [queueQuery,setQueueQuery]=useState("");
  const queueVersion=useRef(0);

  const load = useCallback(async () => {
    const request=++queueVersion.current;
    try{
      const list=await readAllPages(opts=>base44.entities.LoungeQueueItem.filter({session_id:sessionId},{sort:"created_date",...opts}));
      if(request===queueVersion.current){setQueueError(false);setItems(list);}
    }catch{if(request===queueVersion.current)setQueueError(true);}
    finally{if(request===queueVersion.current)setLoadingQ(false);}
  },[sessionId]);
  useEffect(()=>{
    load();const reload=coalesce(load,500);let unsub;
    try{unsub=base44.entities.LoungeQueueItem.subscribe(reload);}catch{}
    const poll=setInterval(reload,30000);
    return()=>{queueVersion.current++;reload.cancel();if(unsub)unsub();clearInterval(poll);};
  },[load]);

  const parsed = items.
  map((it) => ({ ...parseTrack(it.track), _row: it })).
  filter((x) => x && x.id);

  const visibleQueue=parsed.filter(t=>!queueQuery.trim()||[t.title,t.artist,t._row.added_by_name].some(value=>(value||"").toLowerCase().includes(queueQuery.trim().toLowerCase())));

  const removeItem = async (rowId) => {
    if(removingId)return;
    setRemovingId(rowId);
    try {
      await base44.entities.LoungeQueueItem.delete(rowId);
      await load();
      // The subscription will refresh the list across all devices — no local
      // optimisation needed.
    } catch {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="lounge-queue rounded-2xl border border-border bg-foreground/[0.02] p-3 mb-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/40 mb-2">
        <ListMusic size={12} /> Up next {parsed.length ? `· ${parsed.length}` : ""}
      </div>
      {parsed.length>0&&<div className="lounge-queue-search"><input aria-label="Search lounge queue" placeholder="Find a song in this room" value={queueQuery} onChange={e=>setQueueQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQueueQuery("");}}/>{queueQuery&&<button aria-label="Clear queue search" onClick={()=>setQueueQuery("")}><X size={15}/></button>}</div>}
      {queueError&&<button onClick={load} className="playlist-action text-xs mb-3">Refresh queue</button>}
      {loadingQ ?
      <div className="flex justify-center py-3">
          <Loader2 size={15} className="animate-spin text-foreground/40" />
        </div> :
      parsed.length === 0 ?
      <p className="text-xs text-foreground/40 px-1 py-1">
          The queue is empty. Add a song and it shows up here for everyone.
        </p> :

      <div className="lounge-queue-scroll space-y-1 max-h-[65vh] overflow-y-auto no-scrollbar">
          {!visibleQueue.length&&<p className="text-sm text-muted-foreground p-3">No matching songs in this queue.</p>}
          {visibleQueue.map((t) => {
          const i=parsed.indexOf(t);
          const playing = p.currentTrack?._loungeRowId === t._row.id;
          return (
            <div
              key={t._row.id}
              className="flex items-center gap-3 px-1.5 py-1.5 rounded-lg hover:bg-foreground/[0.04] transition">
              
                <div className="w-7 text-center text-xs text-foreground/40 shrink-0">{i + 1}</div>
                <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0">
                  {t.cover_art_url && <Image src={t.cover_art_url} fittingType="fill" alt="" className="w-full h-full"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${playing ? "text-foreground" : ""}`}>
                    {t.title}
                  </div>
                  <div className="text-xs text-foreground/45 truncate">
                    {t.artist || "Unknown"}
                    {t._row.added_by_name ? ` · added by ${t._row.added_by_name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isHost &&
                <button
                  aria-label={playing&&p.isPlaying?`Pause ${t.title}`:`Play ${t.title}`}
                  onClick={() => playing?p.togglePlay():p.playTrackAt(parsed.map(x=>({...x,_loungeRowId:x._row.id})),i)}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background active:scale-90 transition">
                  
                      {playing&&p.isPlaying ? "Pause" : "Play"}
                    </button>
                }
                  {(isHost || t._row.added_by_id===user?.id) && <button
                  onClick={() => removeItem(t._row.id)}
                  disabled={!!removingId}
                  className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-foreground/40 hover:text-destructive hover:bg-destructive/10 active:scale-90 transition disabled:opacity-40"
                  aria-label="Remove from queue">
                  
                    {removingId === t._row.id ?
                  <Loader2 size={13} className="animate-spin" /> :

                  <X size={14} />
                  }
                  </button>}
                </div>
              </div>);

        })}
        </div>
      }
    </div>);

}