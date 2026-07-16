import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import BackHeader from "@/components/BackHeader";
import TrackRow from "@/components/TrackRow";
import {
  Loader2,
  Play,
  ListMusic,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";

export default function PlaylistDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cover_art_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nav = useNavigate();

  const isOwner = playlist?.creator_id === user?.id;

  async function load() {
    setLoading(true);
    try {
      const pl = await base44.entities.Playlist.get(id).catch(() => null);
      if (!pl) {
        setPlaylist(null);
        return;
      }
      setPlaylist(pl);
      setForm({
        name: pl.name,
        description: pl.description || "",
        cover_art_url: pl.cover_art_url || "",
      });
      const ids = pl.track_ids || [];
      const fetched = ids.length
        ? await Promise.all(
            ids.map((tid) =>
              base44.entities.Track.get(tid).catch(() => null)
            )
          )
        : [];
      setTracks(fetched.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function uploadCover(file) {
    setUploadingCover(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, cover_art_url: file_url }));
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const updated = await base44.entities.Playlist.update(id, form);
      setPlaylist(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeTrack(tid) {
    const newIds = (playlist.track_ids || []).filter((x) => x !== tid);
    await base44.entities.Playlist.update(id, { track_ids: newIds });
    setPlaylist((prev) => ({ ...prev, track_ids: newIds }));
    setTracks((prev) => prev.filter((t) => t.id !== tid));
  }

  async function deletePlaylist() {
    setDeleting(true);
    try {
      await base44.entities.Playlist.delete(id);
      nav("/library");
    } catch {
      setDeleting(false);
      alert("Could not delete this playlist right now.");
    }
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!playlist) return <EmptyState title="Playlist not found" />;

  return (
    <div>
      <BackHeader title="Playlist" />
      <div className="flex flex-col md:flex-row md:items-end gap-5 mb-8">
        <div className="relative">
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-foreground/10 grid place-items-center text-foreground/40">
            {form.cover_art_url || playlist.cover_art_url ? (
              <img
                src={form.cover_art_url || playlist.cover_art_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <ListMusic size={40} />
            )}
          </div>
          {editing && (
            <label className="absolute inset-0 grid place-items-center cursor-pointer bg-foreground/40 rounded-2xl text-white text-xs font-semibold">
              {uploadingCover ? <Loader2 size={16} className="animate-spin" /> : "Change"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                }}
              />
            </label>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-1">
            Playlist
          </div>
          {editing ? (
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="text-3xl md:text-4xl font-extrabold tracking-tight w-full bg-transparent border-b border-border focus:outline-none"
            />
          ) : (
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {playlist.name}
            </h1>
          )}
          {editing ? (
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-2 w-full max-w-lg px-3 py-2 rounded-lg border border-border bg-white text-sm"
              rows={2}
              placeholder="Description"
            />
          ) : (
            playlist.description && (
              <p className="text-sm text-foreground/60 max-w-lg mt-1">
                {playlist.description}
              </p>
            )
          )}
          <div className="text-sm text-foreground/50 mt-2">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2 mt-4">
            {tracks.length > 0 && (
              <button
                onClick={() => p.playTrackAt(tracks)}
                className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition"
              >
                <Play size={16} /> Play
              </button>
            )}
            {isOwner && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="px-4 py-2 rounded-full border border-red-200 text-sm font-semibold text-red-600 flex items-center gap-2 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
            {isOwner && editing && (
              <>
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                >
                  <X size={14} /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No tracks yet"
          description={
            isOwner
              ? "Add tracks from any upload across PUBLIC."
              : "The owner hasn't added any tracks yet."
          }
        />
      ) : (
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <div key={t.id} className="group relative">
              <TrackRow
                track={t}
                index={i}
                liked={likes.likedIds.has(t.id)}
                onLikeToggle={likes.toggleLike}
                onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)}
              />
              {isOwner && (
                <button
                  onClick={() => removeTrack(t.id)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 text-foreground/50 hover:text-red-500"
                  aria-label="Remove from playlist"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold mb-1">Delete playlist?</h3>
            <p className="text-sm text-foreground/60 mb-4">
              "{playlist.name}" will be permanently removed. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={deletePlaylist}
                disabled={deleting}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ap.modal}
    </div>
  );
}