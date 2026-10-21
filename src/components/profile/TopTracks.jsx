import "./profile-edit-controls.css";
import "./profile-rotation.css";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Music2, Play, Pause, X, Plus, RefreshCw, ArrowLeftRight } from "lucide-react";
import { reorderTopTracks } from "@/lib/profileEditing";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import TrackPickerSheet from "./TrackPickerSheet";
import HoverTrackMenu from "@/components/track/HoverTrackMenu";
import { useLongPressMenu } from "@/hooks/useLongPressMenu";

function Cover({ url = "", className = "" }) {
  const source = useCoverUrl(url),[broken, setBroken] = useState("");
  return <div className={"rotation-cover " + className}>{source && broken !== source ? <img src={source} alt="" loading="lazy" onError={() => setBroken(source)} /> : <Music2 size={26} aria-hidden="true" />}</div>;
}
function PinnedTrackCard({ track, queue, index, position, onError }) {
  const p = usePlayer(),current = p.currentTrack?.id === track.id,playing = current && p.isPlaying;
  const lp = useLongPressMenu(false, { allowButtons: true });
  async function play(e) {e.stopPropagation();if (lp.consumeLongPress()) return;try {if (current) await p.togglePlay();else await p.playTrackAt(queue, index);} catch {onError("Couldn’t play this song. Please retry.");}}
  return <article ref={lp.ref} {...lp.handlers} className={"rotation-card song-menu-surface" + (playing ? " is-playing" : "")}>
 <div className="rotation-art"><Cover url={track.cover_art_url} /><span className="rotation-position">{String(position + 1).padStart(2, "0")}</span>
 <button type="button" className="rotation-play" onClick={play} aria-label={(playing ? "Pause " : "Play ") + (track.title || "song")}><span>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</span></button>
 <HoverTrackMenu track={track} lp={lp} size={18} className="rotation-menu" buttonClassName="rotation-menu-button" />
 </div><div className="rotation-caption"><strong title={track.title}>{track.title || "Untitled song"}</strong><span title={track.artist || track.uploader_name}>{track.artist || track.uploader_name || "Unknown artist"}</span></div>
 </article>;
}
export default function TopTracks({ trackIds = [], editMode, userTracks, onChange, label, onLabelChange, onEdit, disabled = false }) {
  const p = usePlayer(),[loaded, setLoaded] = useState({ key: "", tracks: [] }),[pickerOpen, setPickerOpen] = useState(false),[replaceId, setReplaceId] = useState(""),[error, setError] = useState(""),[revision, setRevision] = useState(0),[pending, setPending] = useState(false);
  const idsKey = trackIds.join(",");
  useEffect(() => {let active = true;setPending(true);
    Promise.all(trackIds.map((id) => base44.entities.Track.get(id).catch(() => null))).then((results) => {if (active) {setLoaded({ key: idsKey, tracks: results.filter((t) => t?.id) });setPending(false);}});
    return () => {active = false;};}, [idsKey, revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = pending || loaded.key !== idsKey,byId = new Map(loaded.key === idsKey ? loaded.tracks.map((t) => [t.id, t]) : []);
  const pinnedTracks = trackIds.map((id) => byId.get(id)).filter(Boolean),missing = loading ? [] : trackIds.filter((id) => !byId.has(id));
  function toggle(id) {
    if (disabled) return;
    if (replaceId) {if (trackIds.includes(id)) throw Error("Choose a different song.");onChange(trackIds.map((old) => old === replaceId ? id : old));setReplaceId("");setPickerOpen(false);return;}
    onChange(trackIds.includes(id) ? trackIds.filter((t) => t !== id) : trackIds.length < 8 ? [...trackIds, id] : trackIds);
  }
  function replace(id) {setReplaceId(id);setPickerOpen(true);}
  async function playAll() {setError("");try {p.setShuffle(false);await p.playTrackAt(pinnedTracks, 0);} catch {setError("Couldn’t play these songs. Please retry.");}}
  if (!editMode && !trackIds.length) return null;
  return <section className="profile-pinned-section profile-rotation mb-8">
 <div className="profile-top8-heading"><div><h2>{editMode ? "Your Top 8" : label || "My rotation"}</h2><p className="rotation-subtitle hidden">{editMode ? "Your songs, in your order." : trackIds.length + " of your favorites"}</p></div><div className="rotation-heading-actions">{!editMode && pinnedTracks.length > 0 && <button type="button" onClick={playAll}><Play size={14} fill="currentColor" />Play all</button>}</div></div>
 {editMode && <><label className="profile-top8-label">Section title<input aria-label="Top 8 section title" maxLength={40} disabled={disabled} placeholder="My rotation" value={label || ""} onChange={(e) => onLabelChange?.(e.target.value)} /></label><p className="text-xs text-muted-foreground mb-3">Choose up to eight songs. Drag a handle to reorder, or focus it and press Space to use the arrow keys. Save changes when you’re done.</p>
 <DragDropContext onDragEnd={({ source, destination }) => {if (destination && !disabled) onChange(reorderTopTracks(trackIds, source.index, destination.index));}}>
 <Droppable droppableId="profile-top-eight">{(provided) => <div className="profile-top8-edit-list" ref={provided.innerRef} {...provided.droppableProps}>{trackIds.map((id, index) => {const t = byId.get(id);return <Draggable key={id} draggableId={id} index={index} isDragDisabled={disabled}>{(drag) => <div ref={drag.innerRef} {...drag.draggableProps} className="profile-top8-edit-row"><div className="profile-top8-handle" aria-label={"Move " + (t?.title || "unavailable song")} {...drag.dragHandleProps}><GripVertical size={19} /></div><Cover url={t?.cover_art_url} className="rotation-edit-cover" /><div className="profile-top8-edit-meta"><strong>{index + 1}. {t?.title || (loading ? "Loading song…" : "Unavailable song")}</strong><small>{t?.artist || (loading ? "Finding this song…" : "This spot can be replaced or removed")}</small></div><div className="rotation-edit-actions"><button type="button" disabled={disabled || loading} className="rotation-replace" aria-label={"Replace " + (t?.title || "unavailable song")} onClick={() => replace(id)}><ArrowLeftRight size={16} /><span>Replace</span></button><button type="button" disabled={disabled} className="profile-edit-circle profile-edit-circle-small" aria-label={"Remove " + (t?.title || "unavailable song")} onClick={() => onChange(trackIds.filter((tid) => tid !== id))}><X size={16} /></button></div></div>}</Draggable>;})}{provided.placeholder}</div>}</Droppable></DragDropContext>
 <button type="button" disabled={disabled || trackIds.length >= 8} onClick={() => {setReplaceId("");setPickerOpen(true);}} className="playlist-action"><Plus size={16} />Add songs · {trackIds.length}/8</button></>}
 {!editMode && <div className="rotation-grid" aria-busy={loading}>{trackIds.map((id, position) => {const track = byId.get(id);return track ? <PinnedTrackCard key={id} track={track} queue={pinnedTracks} index={pinnedTracks.findIndex((t) => t.id === id)} position={position} onError={setError} /> : <article key={id} className={"rotation-card rotation-unavailable" + (loading ? " is-loading" : "")}><div className="rotation-art"><Cover /><span className="rotation-position">{String(position + 1).padStart(2, "0")}</span><span className="rotation-status">{loading ? "Loading…" : "Unavailable"}</span></div><div className="rotation-caption"><strong>{loading ? "Finding your song…" : "Song unavailable"}</strong><span>{loading ? "Please wait" : onEdit ? "Edit to replace or remove" : "Try again later"}</span></div>{!loading && onEdit && <button type="button" className="rotation-manage" onClick={onEdit}>Manage song</button>}</article>;})}</div>}
 {missing.length > 0 && <div className="rotation-feedback" role="status"><span>{missing.length} {missing.length === 1 ? "song couldn’t" : "songs couldn’t"} load. {onEdit || editMode ? "You can retry, replace or remove them." : "Try again later."}</span><button type="button" disabled={pending} onClick={() => setRevision((v) => v + 1)}><RefreshCw size={14} />Retry</button></div>}
 {error && <p role="alert" className="profile-editor-error">{error}</p>}
 {pickerOpen && <TrackPickerSheet title={replaceId ? "Replace this song" : "Choose your Top 8"} description={replaceId ? "Choose a different song. Your replacement stays in the same spot until you save." : undefined} selectedIds={trackIds} max={replaceId ? 1 : 8} tracks={userTracks} onToggle={toggle} onClose={() => {setPickerOpen(false);setReplaceId("");}} />}
 </section>;
}