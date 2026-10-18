import { useEffect, useRef, useState } from "react";
import "./public-notes.css";
import { base44, publicNoteDatabase } from "@/api/base44Client";
import { requestPublicNote, savePublicNote, publicNoteError } from "@/lib/publicNoteActions";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useCoverPalette } from "@/hooks/useCoverPalette";
import MotionGradient from "@/components/MotionGradient";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Image as ImageIcon, Plus, Play, Pause, Loader2 } from "lucide-react";

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
  return <span className="public-note-song-content"><span className="public-note-mini-cover"><Cover url={track.cover_art_url} /></span><span className="public-note-mini-meta"><strong>{track.title}</strong><small>{track.artist || track.uploader_name || "PUBLIC artist"}</small>{caption && <span>{caption}</span>}</span></span>;
}
function bubbleInk(colors) {
  const values=colors.filter(color=>/^#[0-9a-f]{6}$/i.test(color)).slice(0,3);
  const light=values.length?values.reduce((sum,color)=>sum+[.299,.587,.114].reduce((n,weight,i)=>n+weight*parseInt(color.slice(1+i*2,3+i*2),16),0),0)/values.length:110;
  return light>150?"#111111":"#ffffff";
}
export default function PublicNotes({ profileId, isOwn, active = true, userTracks = [] }) {
  const { user } = useAuth(), player = usePlayer();
  const [note, setNote] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editing, setEditing] = useState(false), [picker, setPicker] = useState(false), [draft, setDraft] = useState(null), [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const [viewing, setViewing] = useState(false);
  const [appearance, setAppearance] = useState("classic");
  const [playbackError, setPlaybackError] = useState("");
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
  async function playNote() {
    if (!valid || !note.track || playLock.current) return;
    const trackId = note.track.id;
    playLock.current = true; setPlaybackError("");
    try { await (player.currentTrack?.id === trackId ? player.togglePlay() : player.playTrackAt([note.track])); }
    catch { if (alive.current && noteRef.current?.track_id === trackId) setPlaybackError("Couldn’t play this song. Check your connection and try again."); }
    finally { playLock.current = false; }
  }
  function open() { setViewing(false); setDraft(valid ? note.track : null); setCaption(valid ? note.caption || "" : ""); setAppearance(valid ? note.appearance || "classic" : "classic"); setError(""); setEditing(true); }
  async function save(remove = false, songOnly = false) {
    if (lock.current || !isOwn || !user?.id || user.id !== profileId || (!remove && !draft && !caption.trim())) return;
    lock.current = true; version.current++; setBusy(true); setError("");
    try {
      const saved = remove ? await request("removeNote", [profileId]) : await savePublicNote(base44, profileId, { track_id: draft?.id || "", caption: songOnly ? "" : caption, appearance: draft ? appearance : "classic" }, publicNoteDatabase);
      if (!remove && (!saved?.id || (saved.track_id ? !saved.track : !saved.caption?.trim()) || !saved.expires_at)) throw Error("Note not confirmed");
      if (alive.current) { setNote(remove ? null : saved); setNow(Date.now()); setEditing(false); }
    } catch (e) {
      if (alive.current) setError(publicNoteError(e, remove));
    } finally { lock.current = false; if (alive.current) { setBusy(false); setLoading(false); } }
  }
  if (!user?.id || (!isOwn && !valid)) return null;
  const playing = valid && player.currentTrack?.id === note.track_id && player.isPlaying;
  return <div className={"public-notes public-notes-on-avatar" + (!valid ? " public-notes-empty" : "")} aria-label="PUBLIC Notes">
    {valid ? <button type="button" className={"public-note-avatar-bubble" + (note.track && note.appearance === "cover_flow" ? " is-flow" : "")} style={note.track && note.appearance === "cover_flow" ? {color:bubbleInk(flowColors),"--note-tail":flowColors[0],"--note-shadow":bubbleInk(flowColors)==="#ffffff"?"#000b":"#fffb"} : undefined} aria-label={"View PUBLIC Note: " + (note.track ? note.track.title + " by " + (note.track.artist || note.track.uploader_name || "PUBLIC artist") : note.caption)} onClick={() => { setPlaybackError(""); setViewing(true); }}>
      {note.track && note.appearance === "cover_flow" && <MotionGradient className="public-note-bubble-flow" colors={flowColors} active={active && !viewing && !editing} />}
      {note.track ? <SongNoteContent track={note.track} caption={note.caption} /> : <span className="public-note-text-only">{note.caption}</span>}
    </button> : isOwn ? <button type="button" className="public-note-create-dot" disabled={busy || loading} aria-label="Add a PUBLIC Note" onClick={open}>{loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}</button> : null}
    {viewing && valid && <Dialog open onOpenChange={setViewing}><DialogContent className="public-note-dialog"><DialogHeader><DialogTitle>PUBLIC Note</DialogTitle><DialogDescription>{Math.max(1, Math.ceil((Date.parse(note.expires_at) - now) / 3600000))}h left · Shared on this profile</DialogDescription></DialogHeader>
      <div className="public-note-card">
        {note.track && <div className="public-note-art"><MotionGradient className="public-note-flow" colors={flowColors} motion={note.appearance === "cover_flow" ? "flow" : "still"} active={active && viewing} /><div className="public-note-cover"><Cover url={note.track.cover_art_url} /></div></div>}
        <div className="public-note-copy">{note.caption && <div className="public-note-bubble">{note.caption}</div>}{note.track && <><strong>{note.track.title}</strong><span>{note.track.artist || note.track.uploader_name}</span></>}</div>
        {note.track && <button type="button" className="public-note-play" aria-label={(playing ? "Pause " : "Play ") + note.track.title} onClick={playNote}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>}
      </div>
      {playbackError && <p className="public-note-error" role="alert">{playbackError}</p>}
      {isOwn && <button type="button" className="public-note-post" onClick={open}>Edit note</button>}
    </DialogContent></Dialog>}
    {editing && <Dialog open={!picker} onOpenChange={value => { if (!value && !busy && !picker) { setEditing(false); setPicker(false); } }}><DialogContent className="public-note-dialog"><DialogHeader><DialogTitle>{valid ? "Your PUBLIC Note" : "Leave a PUBLIC Note"}</DialogTitle><DialogDescription>Share a thought, a song, or both. Visible on your profile for 24 hours.</DialogDescription></DialogHeader>
      <button type="button" className="public-note-song-choice" disabled={busy} onClick={() => setPicker(true)}><span className="public-note-choice-art"><Cover url={draft?.cover_art_url} /></span><span><strong>{draft?.title || "Add a song (optional)"}</strong><small>{draft?.artist || "Find something that feels like you."}</small></span><span className="text-xs font-semibold">{draft ? "Change" : "Choose"}</span></button>
      {draft && <><button type="button" className="public-note-clear-song" disabled={busy} onClick={() => setDraft(null)}>Remove song</button>
        <fieldset className="public-note-appearance" disabled={busy}><legend>Song note style</legend><div role="group" aria-label="Song note appearance"><button type="button" aria-pressed={appearance === "classic"} onClick={() => setAppearance("classic")}>Classic</button><button type="button" aria-pressed={appearance === "cover_flow"} onClick={() => setAppearance("cover_flow")}>Cover Flow</button></div></fieldset>
        <div className="public-note-preview-stage" aria-label="Song note preview"><div className={"public-note-avatar-bubble public-note-preview" + (appearance === "cover_flow" ? " is-flow" : "")} style={appearance === "cover_flow" ? {color:bubbleInk(draftFlowColors),"--note-tail":draftFlowColors[0],"--note-shadow":bubbleInk(draftFlowColors)==="#ffffff"?"#000b":"#fffb"} : undefined}>{appearance === "cover_flow" && <MotionGradient className="public-note-bubble-flow" colors={draftFlowColors} active={active && editing && !picker} />}<SongNoteContent track={draft} caption={caption} /></div></div>
      </>}
      <label className="public-note-label" htmlFor="public-note-caption">Add a thought <span>Optional</span></label><textarea id="public-note-caption" maxLength={80} rows={3} placeholder="This one’s on my mind…" value={caption} disabled={busy} onChange={e => setCaption(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); save(); } }} /><div className="public-note-counter">{caption.length}/80</div>
      {error && <p role="alert" className="public-note-error">{error}</p>}
      {error.includes("service limit") && draft && <button type="button" disabled={busy} className="public-note-post" onClick={() => save(false, true)}>Share just the song</button>}
      <div className="public-note-composer-actions">{valid && <button type="button" disabled={busy} onClick={() => save(true)}>Remove note</button>}<button type="button" className="public-note-post" disabled={busy || (!draft && !caption.trim())} onClick={() => save()}>{busy ? <Loader2 size={18} className="animate-spin" /> : valid ? "Replace note" : "Share note"}</button></div>
    </DialogContent></Dialog>}
    {editing && picker && <TrackPickerSheet title="Choose your note’s song" tracks={userTracks.filter(track => track.is_published && track.approval_status === "approved")} selectedIds={draft ? [draft.id] : []} onToggle={(_id, track) => { setDraft(track); setPicker(false); }} onClose={() => setPicker(false)} />}
  </div>;
}
