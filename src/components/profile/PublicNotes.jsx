import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useCoverPalette } from "@/hooks/useCoverPalette";
import MotionGradient from "@/components/MotionGradient";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Music2, Plus, Play, Pause, Loader2 } from "lucide-react";

async function request(action, args) {
  const response = await base44.functions.invoke("securityGateway", { entity: "PublicNote", action, args });
  if (!response?.data || !Object.prototype.hasOwnProperty.call(response.data, "result")) throw Error("Note not confirmed");
  return response.data.result;
}
function Cover({ url }) {
  const source = useCoverUrl(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return source && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : <Music2 size={26} />;
}
export default function PublicNotes({ profileId, isOwn, profile, active = true, userTracks = [] }) {
  const { user } = useAuth(), player = usePlayer();
  const [note, setNote] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editing, setEditing] = useState(false), [picker, setPicker] = useState(false), [draft, setDraft] = useState(null), [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const version = useRef(0), lock = useRef(false), alive = useRef(true);
  const cover = useCoverUrl(note?.track?.cover_art_url), { colors } = useCoverPalette(cover);
  const avatar = useCoverUrl(profile?.avatar_url);
  const valid = note && Date.parse(note.expires_at) > now;
  useEffect(() => { alive.current = true; return () => { alive.current = false; version.current++; }; }, []);
  async function load() {
    if (!profileId || !user?.id || !active || lock.current) { setLoading(false); return; }
    const current = ++version.current;
    setLoading(true); setError("");
    try {
      const saved = await request("readNote", [profileId]);
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
  function open() { setDraft(valid ? note.track : null); setCaption(valid ? note.caption || "" : ""); setError(""); setEditing(true); }
  async function save(remove = false) {
    if (lock.current || !isOwn || !user?.id || user.id !== profileId || (!remove && !draft)) return;
    lock.current = true; version.current++; setBusy(true); setError("");
    try {
      const saved = await request(remove ? "removeNote" : "saveNote", remove ? [] : [{ track_id: draft.id, caption }]);
      if (!remove && (!saved?.id || !saved.track || !saved.expires_at)) throw Error("Note not confirmed");
      if (alive.current) { setNote(remove ? null : saved); setNow(Date.now()); setEditing(false); }
    } catch (e) {
      if (alive.current) setError(e?.response?.status === 422 ? e.response.data?.error || "Check your note and try again." : remove ? "Couldn’t remove your note. Please retry." : "Couldn’t save your note. Please retry.");
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  if (!user?.id || (!isOwn && !valid && !error)) return null;
  const playing = valid && player.currentTrack?.id === note.track_id && player.isPlaying;
  return <section className="public-notes" aria-label="PUBLIC Notes">
    <div className="public-notes-heading"><div><p className="eyebrow">PUBLIC Notes</p><h2>Your sound, right now.</h2></div>{isOwn && <button type="button" className="public-note-edit" disabled={busy || loading} onClick={open}>{valid ? "Edit note" : <><Plus size={16} /> Add note</>}</button>}</div>
    {loading && !valid ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Loading note…</p> : valid ? <div className="public-note-card">
      <div className="public-note-art"><MotionGradient colors={colors.length ? colors : ["#111111","#eeeeee","#555555"]} active={active} /><div><Cover url={note.track.cover_art_url} /></div></div>
      <div className="public-note-copy"><div className="public-note-bubble">{note.caption || "This one’s on my mind."}</div><strong>{note.track.title}</strong><span>{note.track.artist || note.track.uploader_name}</span><small>{Math.max(1, Math.ceil((Date.parse(note.expires_at) - now) / 3600000))}h left · Shared on this profile</small></div>
      <button type="button" className="public-note-play" aria-label={(playing ? "Pause " : "Play ") + note.track.title} onClick={() => player.currentTrack?.id === note.track_id ? player.togglePlay() : player.playTrackAt([note.track])}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
    </div> : isOwn && <button type="button" className="public-note-empty" disabled={loading} onClick={open}><span className="public-note-avatar">{avatar ? <img src={avatar} alt="" /> : <Music2 size={24} />}</span><span><strong>What’s on your mind?</strong><small>Share a song and a thought for 24 hours.</small></span><Plus size={20} /></button>}
    {error && !editing && <p className="public-note-error" role="alert">{error} <button type="button" className="underline" onClick={load}>Retry</button></p>}
    {editing && <Dialog open onOpenChange={value => { if (!value && !busy) { setEditing(false); setPicker(false); } }}><DialogContent className="public-note-dialog"><DialogHeader><DialogTitle>{valid ? "Your PUBLIC Note" : "Leave a PUBLIC Note"}</DialogTitle><DialogDescription>One song. A little thought. Visible to members viewing your profile for 24 hours.</DialogDescription></DialogHeader>
      <button type="button" className="public-note-song-choice" disabled={busy} onClick={() => setPicker(true)}><span className="public-note-choice-art"><Cover url={draft?.cover_art_url} /></span><span><strong>{draft?.title || "Choose a song"}</strong><small>{draft?.artist || "Find something that feels like you."}</small></span><span className="text-xs font-semibold">{draft ? "Change" : "Choose"}</span></button>
      <label className="public-note-label" htmlFor="public-note-caption">Add a thought <span>Optional</span></label><textarea id="public-note-caption" maxLength={80} rows={3} placeholder="This one’s on my mind…" value={caption} disabled={busy} onChange={e => setCaption(e.target.value)} /><div className="public-note-counter">{caption.length}/80</div>
      {error && <p role="alert" className="public-note-error">{error}</p>}
      <div className="public-note-composer-actions">{valid && <button type="button" disabled={busy} onClick={() => save(true)}>Remove note</button>}<button type="button" className="public-note-post" disabled={busy || !draft} onClick={() => save()}>{busy ? <Loader2 size={18} className="animate-spin" /> : valid ? "Replace note" : "Share note"}</button></div>
    </DialogContent></Dialog>}
    {editing && picker && <TrackPickerSheet title="Choose your note’s song" tracks={userTracks} selectedIds={draft ? [draft.id] : []} onToggle={(_id, track) => { setDraft(track); setPicker(false); }} onClose={() => setPicker(false)} />}
  </section>;
}
