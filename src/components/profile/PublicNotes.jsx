import {useNoteHighlights} from "@/hooks/useNoteHighlights";
import Avatar from "@/components/Avatar";
import OverflowText from "@/components/OverflowText";
import { useEffect, useRef, useState } from "react";
import "./public-notes.css";
import "./notes-studio.css";
import { base44, publicNoteDatabase } from "@/api/base44Client";
import { requestPublicNote, savePublicNote, publicNoteError } from "@/lib/publicNoteActions";
import { useAuth } from "@/lib/AuthContext";
import { useNotePreview } from "@/hooks/useNotePreview";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useCoverPalette } from "@/hooks/useCoverPalette";
import MotionGradient from "@/components/MotionGradient";
import NoteEmojiPicker from "./NoteEmojiPicker";
import NoteReactions from "./NoteReactions";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Image as ImageIcon, Music2, Plus, Play, Pause, Loader2 } from "lucide-react";

async function request(action, args) {
  return requestPublicNote(base44, action, args, publicNoteDatabase);
}
function Cover({ url }) {
  const source = useCoverUrl(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return source && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : <ImageIcon size={18} />;
}
function SongNoteContent({track,caption}) {
  return <span className="public-note-song-content"><span className="public-note-mini-cover"><Cover url={track.cover_art_url} /></span><span className="public-note-mini-meta"><strong><OverflowText text={track.title}/></strong><small><OverflowText text={track.artist || track.uploader_name || "PUBLIC artist"}/></small>{caption && <span>{caption}</span>}</span></span>;
}
function bubbleInk(colors) {
  const values=colors.filter(color=>/^#[0-9a-f]{6}$/i.test(color)).slice(0,3);
  const light=values.length?values.reduce((sum,color)=>sum+[.299,.587,.114].reduce((n,weight,i)=>n+weight*parseInt(color.slice(1+i*2,3+i*2),16),0),0)/values.length:110;
  return light>150?"#111111":"#ffffff";
}
export default function PublicNotes({ profileId, isOwn, active = true, userTracks = [], presentation = "avatar", onView = undefined }) {
  const { user } = useAuth();
  const [note, setNote] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editing, setEditing] = useState(false), [picker, setPicker] = useState(false), [draft, setDraft] = useState(null), [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const [viewing, setViewing] = useState(false);
  const [appearance, setAppearance] = useState("classic");
  const [playbackError, setPlaybackError] = useState("");
  const [emoji,setEmoji]=useState(""),[emojiOpen,setEmojiOpen]=useState(false);
  const [draftPlaybackError,setDraftPlaybackError]=useState("");
  const [playbackMode,setPlaybackMode]=useState("full"),[clipStart,setClipStart]=useState(0),[clipLength,setClipLength]=useState(30);
  const [measuredDuration,setMeasuredDuration]=useState({trackId:"",seconds:0});
  const preview=useNotePreview({active:active&&(viewing||editing)&&(!viewing||!!(note&&Date.parse(note.expires_at)>now)),accountId:user?.id,scope:profileId});
  const highlights=useNoteHighlights({track:draft,accountId:user?.id,active:active&&editing&&!picker&&!!draft&&playbackMode==="clip",length:clipLength});
  const emojiTrigger = useRef(null);
  const editingRef = useRef(false), playLock = useRef(false), noteRef = useRef(null);
  editingRef.current = editing; noteRef.current = note;
  const version = useRef(0), lock = useRef(false), alive = useRef(true);
  const cover = useCoverUrl(note?.track?.cover_art_url), { colors } = useCoverPalette(cover);
  const draftCover = useCoverUrl(draft?.cover_art_url), { colors: draftColors } = useCoverPalette(draftCover);
  const valid = note && Date.parse(note.expires_at) > now;
  const flowColors = colors.length ? colors : ["#111111","#eeeeee","#555555"];
  const draftFlowColors = draftColors.length ? draftColors : ["#111111","#eeeeee","#555555"];
  useEffect(() => { alive.current = true; return () => { alive.current = false; version.current++; }; }, []);
  async function load() {
    if (!profileId || !user?.id || !active || lock.current || editingRef.current) { setLoading(false); return; }
    const current = ++version.current;
    setLoading(true); setError("");
    try {
      const saved = await request("readNote", [profileId]);
      if (saved && ((saved.track_id ? !saved.track?.id : !saved.caption?.trim()) || !Number.isFinite(Date.parse(saved.expires_at)))) throw Error("Invalid note");
      if (alive.current && current === version.current) { setNote(saved); setNow(Date.now()); }
    } catch { if (alive.current && current === version.current) setError("Couldn’t load this note."); }
    finally { if (alive.current && current === version.current) setLoading(false); }
  }
  useEffect(() => {
    load();
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { version.current++; clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, user?.id, active]);
  useEffect(() => {
    if (!active || !valid) setViewing(false);
    if (!active) { setEditing(false); setPicker(false); }
  }, [active, valid]);
  useEffect(() => {
    if (!active || !note?.expires_at) return;
    const remaining = Date.parse(note.expires_at) - Date.now();
    if (!Number.isFinite(remaining)) return;
    if (remaining <= 0) { setNow(Date.now()); return; }
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining + 20, 2147483647));
    return () => clearTimeout(timer);
  }, [active, note?.expires_at]);
  async function playNote(ensurePlaying = false) {
    if (!valid || Date.parse(note.expires_at)<=Date.now() || !note.track || playLock.current) return;
    const trackId = note.track.id;
    if(ensurePlaying && preview.trackId === trackId && preview.playing)return;
    playLock.current = true; setPlaybackError("");
    try { await preview.play(note.track,ensurePlaying,note); }
    catch { if (alive.current && noteRef.current?.track_id === trackId) setPlaybackError("Couldn’t play this song. Check your connection and try again."); }
    finally { playLock.current = false; }
  }
  async function viewNote() {
    if(!valid || Date.parse(note.expires_at)<=Date.now())return;
    onView?.();setPlaybackError("");setViewing(true);
    if(!isOwn && note.track)await playNote(true);
  }
  async function playDraft() {
    if(!draft||playLock.current)return;
    playLock.current=true;setDraftPlaybackError("");
    try{await preview.play(draft,false,{playback_mode:playbackMode,clip_start:Math.min(clipStart,maxStart),clip_length:selectedLength});}
    catch{if(alive.current)setDraftPlaybackError("Couldn’t preview this song. Try again.");}
    finally{playLock.current=false;}
  }
  async function selectMoment(seconds) {
    if(!draft||busy)return;
    const start=Math.max(0,Math.min(seconds,maxStart));
    preview.pause();setClipStart(start);setDraftPlaybackError("");
    try{await preview.play(draft,true,{playback_mode:"clip",clip_start:start,clip_length:selectedLength});}
    catch{if(alive.current)setDraftPlaybackError("Couldn’t preview this moment. Tap play to retry.");}
  }
  function open() { setPlaybackMode(valid ? note.playback_mode || "full" : "full");setClipStart(valid ? note.clip_start || 0 : 0);setClipLength(valid ? note.clip_length || 30 : 30);setDraftPlaybackError(""); setEmoji(valid ? note.emoji || "" : ""); setEmojiOpen(false); setViewing(false); setDraft(valid ? note.track : null); setCaption(valid ? note.caption || "" : ""); setAppearance(valid ? note.appearance || "classic" : "classic"); setError(""); setEditing(true); }
  async function save(remove = false, songOnly = false) {
    if (lock.current || !isOwn || !user?.id || user.id !== profileId || (!remove && !draft && !caption.trim())) return;
    lock.current = true; version.current++; setBusy(true); setError("");
    try {
      const saved = remove ? await request("removeNote", [profileId]) : await savePublicNote(base44, profileId, { emoji, track_id: draft?.id || "", caption: songOnly ? "" : caption, appearance: draft ? appearance : "classic",playback_mode:draft?playbackMode:"full",clip_start:Math.min(clipStart,maxStart),clip_length:selectedLength }, publicNoteDatabase);
      if (!remove && (!saved?.id || (saved.track_id ? !saved.track : !saved.caption?.trim()) || !saved.expires_at)) throw Error("Note not confirmed");
      if (alive.current) { setNote(remove ? null : saved); setNow(Date.now()); setEditing(false); }
    } catch (e) {
      if (alive.current) setError(publicNoteError(e, remove));
    } finally { lock.current = false; if (alive.current) { setBusy(false); setLoading(false); } }
  }
  useEffect(()=>{if(preview.trackId&&Number(preview.duration)>0)setMeasuredDuration({trackId:preview.trackId,seconds:Number(preview.duration)});},[preview.trackId,preview.duration]);
  const draftDuration=Number(highlights.profile?.duration)||Number(draft?.duration_seconds)||(measuredDuration.trackId===draft?.id?measuredDuration.seconds:0)||0;
  const selectedLength=draftDuration>0?Math.min(clipLength,draftDuration):clipLength;
  const maxStart=draftDuration>0?Math.max(0,draftDuration-selectedLength):clipStart;
  const timeLabel=value=>{const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");};
  if (!user?.id || (!isOwn && !valid && !(presentation === "popup" && (loading || error)))) return null;
  const playing = valid && preview.trackId === note.track_id && preview.playing;
  return <div className={"public-notes " + (presentation === "popup" ? "public-notes-in-popup" : "public-notes-on-avatar") + (!valid ? " public-notes-empty" : "")} aria-label="PUBLIC Notes">
    {presentation === "popup" && valid && <p className="public-note-popup-label">PUBLIC Note</p>}
    {presentation === "popup" && loading && user?.id && <p className="public-note-popup-status" role="status">Loading note…</p>}
    {presentation === "popup" && error && !editing && <p className="public-note-error" role="alert">{error} <button type="button" className="underline" onClick={load}>Retry</button></p>}
    {valid ? <button type="button" className={"public-note-avatar-bubble" + (note.track && note.appearance === "cover_flow" ? " is-flow" : "")} style={note.track && note.appearance === "cover_flow" ? {color:bubbleInk(flowColors),"--note-tail":flowColors[0],"--note-shadow":bubbleInk(flowColors)==="#ffffff"?"#000b":"#fffb"} : undefined} aria-label={"View PUBLIC Note: " + (note.emoji ? note.emoji+" " : "") + (note.track ? note.track.title + " by " + (note.track.artist || note.track.uploader_name || "PUBLIC artist") + (note.caption ? ". "+note.caption : "") : note.caption)} onClick={viewNote}>
      {note.track && note.appearance === "cover_flow" && <MotionGradient className="public-note-bubble-flow" colors={flowColors} active={active && !viewing && !editing} />}
      {note.emoji && <span className="public-note-emoji-badge" aria-hidden="true">{note.emoji}</span>}
      {note.track ? <SongNoteContent track={note.track} caption={note.caption} /> : <span className="public-note-text-only">{note.caption}</span>}
    </button> : isOwn && presentation !== "popup" ? <button type="button" className="public-note-create-dot" disabled={busy || loading} aria-label="Add a PUBLIC Note" onClick={open}>{loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}</button> : null}
    {viewing && valid && <Dialog open onOpenChange={setViewing}><DialogContent className="public-note-dialog public-note-viewer"><DialogHeader><DialogTitle>PUBLIC Note</DialogTitle><DialogDescription>{Date.parse(note.expires_at)-now<3600000 ? Math.max(1,Math.ceil((Date.parse(note.expires_at)-now)/60000))+"m left" : Math.ceil((Date.parse(note.expires_at)-now)/3600000)+"h left"} · PUBLIC Notes</DialogDescription></DialogHeader>
      <div className="public-note-card">
        {note.track && <div className="public-note-art"><MotionGradient className="public-note-flow" colors={flowColors} motion={note.appearance === "cover_flow" ? "flow" : "still"} active={active && viewing} /><div className="public-note-cover"><Cover url={note.track.cover_art_url} /></div></div>}
        <div className="public-note-copy">{note.emoji && <span className="public-note-viewer-emoji">{note.emoji}</span>}{note.caption && <div className="public-note-bubble">{note.caption}</div>}{note.track && <><strong>{note.track.title}</strong><span>{note.track.artist || note.track.uploader_name}</span></>}</div>
        {note.track && <button type="button" className="public-note-play" aria-label={(playing ? "Pause " : "Play ") + note.track.title} onClick={() => playNote()}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>}
      </div>
      {note.track && <p className="public-note-listening-hint">{note.playback_mode === "clip" ? timeLabel(note.clip_start) + "–" + timeLabel((note.clip_start||0)+(note.clip_length||30)) + " · Selected clip" : "Full song"} · Your music resumes when you close.</p>}
      {(playbackError||preview.error) && <p className="public-note-error" role="alert">{playbackError||preview.error}</p>}
      <NoteReactions key={[user.id,note.id,note.expires_at].join(":")} profileId={profileId} note={note} canReact={!isOwn} active={active && viewing}/>
      {isOwn && <button type="button" className="public-note-post" onClick={open}>Edit note</button>}
    </DialogContent></Dialog>}
    {editing && <Dialog open={!picker} onOpenChange={value => { if (!value && !busy && !picker) { setEditing(false); setPicker(false); } }}><DialogContent className="public-note-dialog public-note-composer public-note-studio" onOpenAutoFocus={event=>{event.preventDefault();event.target?.querySelector?.(":scope > button:last-child")?.focus();}} onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onInteractOutside={event=>{if(busy)event.preventDefault();}}>
      <DialogHeader className="note-studio-heading"><DialogTitle>Your note</DialogTitle><DialogDescription>A little moment. Shared for 24 hours.</DialogDescription></DialogHeader>
      <div className="note-studio-scroll">
        <div className="note-studio-stage">
          <div className="note-studio-bubble">
            {emoji && <span className="note-studio-emoji" aria-hidden="true">{emoji}</span>}
            <label className="sr-only" htmlFor="public-note-caption">Your note</label>
            <textarea id="public-note-caption" maxLength={80} rows={2} placeholder="What’s on your mind?" value={caption} disabled={busy} aria-describedby="public-note-caption-count" onChange={e=>setCaption(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();save();}}}/>
            <span id="public-note-caption-count" className="note-studio-count">{caption.length}/80</span>
          </div>
          <Avatar user={user} size={88} active={active && !picker}/>
          <div className="note-studio-tools">
            <button type="button" disabled={busy} onClick={()=>{preview.stop();setPicker(true);}} aria-label={draft?"Change note song":"Add a song"}><Music2 size={17}/><span>{draft?"Change song":"Add music"}</span></button>
            <button type="button" ref={emojiTrigger} disabled={busy} aria-expanded={emojiOpen} aria-label="Choose note emoji" onClick={()=>setEmojiOpen(!emojiOpen)}><span aria-hidden="true">{emoji||"☺"}</span><span>Emoji</span></button>
          </div>
        </div>
        {emojiOpen && <div className="note-studio-emoji-panel"><div><strong>Make it yours</strong>{emoji&&<button type="button" disabled={busy} onClick={()=>{setEmoji("");setEmojiOpen(false);}}>Remove emoji</button>}</div><NoteEmojiPicker selected={emoji} disabled={busy} onSelect={value=>{setEmoji(value);setEmojiOpen(false);emojiTrigger.current?.focus();}}/></div>}
        {draft && <section className="note-studio-song" aria-label="Song and clip selection">
          <div className="note-studio-song-top"><span>YOUR SOUNDTRACK</span><button type="button" className="public-note-clear-song" disabled={busy} onClick={()=>{preview.stop();setDraft(null);setDraftPlaybackError("");}}>Remove</button></div>
          <div className="note-studio-song-info"><span className="public-note-choice-art"><Cover url={draft.cover_art_url}/></span><div><strong><OverflowText text={draft.title}/></strong><small><OverflowText text={draft.artist||draft.uploader_name||"PUBLIC artist"}/></small></div><button type="button" className="public-note-preview-play" disabled={busy||preview.loading} aria-label={(preview.trackId===draft.id&&preview.playing?"Pause preview of ":"Preview ")+draft.title} onClick={playDraft}>{preview.loading?<Loader2 size={20} className="animate-spin"/>:preview.trackId===draft.id&&preview.playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button></div>
          <div className="public-note-audio-modes" role="group" aria-label="Note playback"><button type="button" disabled={busy} aria-pressed={playbackMode==="full"} onClick={()=>{preview.pause();setPlaybackMode("full");}}>Full song</button><button type="button" disabled={busy} aria-pressed={playbackMode==="clip"} onClick={()=>{preview.pause();setPlaybackMode("clip");setClipStart(Math.min(clipStart,maxStart));}}>Choose a clip</button></div>
          {playbackMode==="clip" && <div className="note-studio-trimmer">
            <div className="note-studio-durations" role="group" aria-label="Note clip length">{[15,30,60].map(length=><button type="button" key={length} disabled={busy} aria-pressed={clipLength===length} onClick={()=>{preview.pause();setClipLength(length);setClipStart(Math.min(clipStart,Math.max(0,draftDuration-length)));}}>{length}s</button>)}</div>
            {highlights.moments.length>0 && <div className="note-studio-moments" aria-label="Suggested clip starts"><span>Suggested moments</span><div className="note-studio-moment-rail">{highlights.moments.map(seconds=><button key={seconds} type="button" disabled={busy} style={{left:"clamp(12px, "+(seconds/draftDuration*100)+"%, calc(100% - 12px))"}} aria-label={"Preview suggested moment at "+timeLabel(seconds)} aria-pressed={Math.abs(clipStart-seconds)<.5} onClick={()=>selectMoment(seconds)}><span/></button>)}</div><small>Based on the song’s energy. Tap a dot to listen.</small></div>}
            <div className="note-studio-timeline">
              {highlights.profile?.waveform?.length ? <div className="note-studio-waveform" aria-hidden="true">{highlights.profile.waveform.map((level,index)=><i key={index} style={{height:Math.max(3,level*38)+"px"}}/>)}</div> : <div className="note-studio-ticks" aria-hidden="true"/>}
              <div className="note-studio-selection" aria-hidden="true" style={{left:(draftDuration>0?Math.min(clipStart,maxStart)/draftDuration*100:0)+"%",width:(draftDuration>0?selectedLength/draftDuration*100:100)+"%"}}/>
              <input type="range" min="0" max={maxStart} step="0.1" value={Math.min(clipStart,maxStart)} disabled={!draftDuration||busy} aria-label="Choose clip start" aria-valuetext={"From "+timeLabel(clipStart)+" to "+timeLabel(clipStart+selectedLength)} onChange={event=>{preview.pause();setClipStart(Number(event.target.value));}}/>
            </div>
            <div className="note-studio-time"><strong>{timeLabel(Math.min(clipStart,maxStart))} — {timeLabel(Math.min(clipStart,maxStart)+selectedLength)}</strong><span>{draftDuration>0?timeLabel(draftDuration):"Tap play to load timing"}</span></div>
            <p>{highlights.loading?"Finding suggested moments…":"Slide to your favorite part. Tap play to preview."}</p>
            {highlights.error&&<p className="note-studio-analysis-error" role="status">Suggestions unavailable. You can still choose a clip. <button type="button" disabled={busy} onClick={highlights.retry}>Retry suggestions</button></p>}
            {!highlights.loading&&!highlights.error&&highlights.profile&&!highlights.moments.length&&<p>No clear highlights found. Choose the part you like.</p>}
          </div>}
          {playbackMode==="full" && <p className="note-studio-full-hint">Listeners hear the whole song from the beginning.</p>}
          {(draftPlaybackError||preview.error)&&<p className="public-note-error" role="alert">{draftPlaybackError||preview.error}</p>}
          <details className="note-studio-style"><summary>Bubble style <span>{appearance==="cover_flow"?"Cover Flow":"Classic"}</span></summary><div className="public-note-appearance" role="group" aria-label="Song note appearance"><button type="button" disabled={busy} aria-pressed={appearance==="classic"} onClick={()=>setAppearance("classic")}>Classic</button><button type="button" disabled={busy} aria-pressed={appearance==="cover_flow"} onClick={()=>setAppearance("cover_flow")}>Cover Flow</button></div><div className={"public-note-avatar-bubble public-note-preview"+(appearance==="cover_flow"?" is-flow":"")} style={appearance==="cover_flow"?{color:bubbleInk(draftFlowColors),background:draftFlowColors[0]}:undefined}><SongNoteContent track={draft} caption={caption}/></div></details>
        </section>}
        {error&&<p role="alert" className="public-note-error">{error}</p>}
        {error.includes("service limit")&&draft&&<button type="button" disabled={busy} className="note-studio-song-only" onClick={()=>save(false,true)}>Share just the song</button>}
      </div>
      <div className="public-note-composer-actions">{valid?<button type="button" className="public-note-remove" disabled={busy} onClick={()=>save(true)}>Remove note</button>:<button type="button" className="public-note-cancel" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button>}<button type="button" className="public-note-post" disabled={busy||(!draft&&!caption.trim())} onClick={()=>save()}>{busy?<Loader2 size={18} className="animate-spin"/>:valid?"Update note":"Share note"}</button></div>
    </DialogContent></Dialog>}
    {editing && picker && <TrackPickerSheet title="Choose your note’s song" tracks={userTracks.filter(track => track.is_published && track.approval_status === "approved")} selectedIds={draft ? [draft.id] : []} onToggle={(_id, track) => { preview.stop();setDraft(track);setClipStart(0); setDraftPlaybackError(""); setPicker(false); }} onClose={() => setPicker(false)} />}
  </div>;
}