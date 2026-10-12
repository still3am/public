import {readAllPages} from '@/lib/readPages';
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import {
  ChevronLeft,
  Loader2,
  Play,
  Pencil,
  Trash2,
  Plus,
  X,
  ListMusic,
  Globe,
  Lock,
  Check,
} from "lucide-react";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import AddToPlaylistPicker from "@/components/playlist/AddToPlaylistPicker";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";

export default function PlaylistDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const p = usePlayer();
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingSaved, setSavingSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pl = await base44.entities.Playlist.get(id).catch(() => null);
      if (!pl) {
        setPlaylist(null);
        return;
      }
      setPlaylist(pl);
      setForm({ name: pl.name || "", description: pl.description || "", is_public: pl.is_public !== false });
      const ids = pl.track_ids || [];
      if (ids.length) {
        const list = await readAllPages(opts=>base44.entities.Track.filter({id:{$in:ids}},{sort:"-created_date",...opts}));
        const order = new Map(ids.map((tid, i) => [tid, i]));
        const sorted = (list || [])
          .slice()
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setTracks(sorted);
      } else {
        setTracks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Whether this playlist already sits in the visitor's library — only playlists
  // by other people need saving, since your own live in your library already.
  useEffect(() => {
    let alive = true;
    if (!user?.id || !id) return;
    base44.entities.SavedPlaylist
      .filter({ user_id: user.id, playlist_id: id }, "-created_date", 1)
      .then((rows) => {
        if (alive) setSaved(!!(rows || []).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, user?.id]);

  const isOwn = playlist?.creator_id === user?.id;

  const coverUrl = useMemo(() => {
    if (playlist?.cover_art_url) return playlist.cover_art_url;
    return tracks.find((t) => t.cover_art_url)?.cover_art_url || "";
  }, [playlist, tracks]);

  async function saveEdit() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await base44.entities.Playlist.update(playlist.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        is_public: form.is_public,
      });
      setPlaylist(updated);
      setEditing(false);
    } catch {
      toast({ title: "Couldn't save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!confirm("Delete this playlist? This can't be undone.")) return;
    try {
      await base44.entities.Playlist.delete(playlist.id);
      toast({ title: "Playlist deleted" });
      nav("/library");
    } catch {
      toast({ title: "Couldn't delete playlist", variant: "destructive" });
    }
  }

  async function removeTrack(trackId) {
    const newIds = (playlist.track_ids || []).filter((tid) => tid !== trackId);
    const updated = await base44.entities.Playlist.update(playlist.id, { track_ids: newIds });
    setPlaylist(updated);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  async function toggleSaved() {
    if (savingSaved) return;
    if(!user){nav("/login?returnTo="+encodeURIComponent(window.location.pathname));return;}
    setSavingSaved(true);
    try {
      if (saved) {
        await base44.entities.SavedPlaylist.deleteMany({
          user_id: user.id,
          playlist_id: playlist.id,
        });
        setSaved(false);
        toast({ title: "Removed from your library" });
      } else {
        await base44.entities.SavedPlaylist.create({
          user_id: user.id,
          playlist_id: playlist.id,
        });
        setSaved(true);
        toast({ title: "Added to your library" });
      }
    } catch {
      toast({ title: "Couldn't update your library", variant: "destructive" });
    } finally {
      setSavingSaved(false);
    }
  }

  function playAll() {
    if (!tracks.length) return;
    p.playTrackAt(tracks, 0);
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!playlist) return <EmptyState title="Playlist not found" />;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <button
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-foreground/60 hover:text-foreground transition"
      >
        <ChevronLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-6 mb-8">
        <div className="relative w-40 h-40 md:w-52 md:h-52 shrink-0 mx-auto md:mx-0">
          <div className="w-full h-full rounded-2xl overflow-hidden bg-foreground/[0.06] shadow-lg ring-1 ring-inset ring-foreground/10">
            {coverUrl ? (
              <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.03]">
                <ListMusic size={40} className="text-foreground/25" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-end text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Playlist</span>
            {playlist.is_public ? (
              <Globe size={12} className="text-foreground/40" />
            ) : (
              <Lock size={12} className="text-foreground/40" />
            )}
          </div>

          {editing ? (
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="text-2xl md:text-4xl font-extrabold tracking-tight w-full bg-transparent border-b border-border focus:outline-none pb-1 mb-2"
              placeholder="Playlist name"
            />
          ) : (
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2">{playlist.name}</h1>
          )}

          {editing ? (
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add a description…"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm mb-3 max-w-xl resize-none"
              rows={2}
            />
          ) : (
            playlist.description && (
              <p className="selectable-content text-sm text-foreground/60 max-w-xl mb-3">{playlist.description}</p>
            )
          )}

          <div className="text-sm text-foreground/50 mb-4">
            {tracks.length} {tracks.length === 1 ? "song" : "songs"}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            {tracks.length > 0 && (
              <button
                onClick={playAll}
                className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 active:scale-95 transition"
              >
                <Play size={16} fill="currentColor" /> Play
              </button>
            )}
            {!isOwn && (
              <button
                onClick={toggleSaved}
                disabled={savingSaved}
                className={`h-11 px-5 rounded-full text-sm font-bold flex items-center gap-2 active:scale-95 transition disabled:opacity-60 ${
                  saved
                    ? "bg-foreground text-background"
                    : "border border-border hover:bg-foreground/[0.04]"
                }`}
              >
                {savingSaved ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saved ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {saved ? "In your library" : "Add to library"}
              </button>
            )}
            {isOwn && !editing && (
              <button
                onClick={() => setShowAdd(true)}
                className="h-11 px-5 rounded-full border border-border text-sm font-semibold flex items-center gap-2 hover:bg-foreground/[0.04] transition"
              >
                <Plus size={16} /> Add songs
              </button>
            )}
            {isOwn && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="w-11 h-11 rounded-full border border-border grid place-items-center hover:bg-foreground/[0.04] transition"
                aria-label="Edit playlist"
              >
                <Pencil size={16} />
              </button>
            )}
            {isOwn && editing && (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving || !form.name.trim()}
                  className="h-11 px-5 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 disabled:opacity-40 transition"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({ name: playlist.name, description: playlist.description, is_public: playlist.is_public });
                  }}
                  className="w-11 h-11 rounded-full border border-border grid place-items-center"
                  aria-label="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            )}
            {isOwn && !editing && (
              <button
                onClick={deletePlaylist}
                className="w-11 h-11 rounded-full border border-border grid place-items-center text-destructive hover:bg-destructive/10 transition"
                aria-label="Delete playlist"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      {!tracks.length ? (
        <EmptyState
          icon={ListMusic}
          title={isOwn ? "No songs yet" : "This playlist is empty"}
          description={isOwn ? "Tap \"Add songs\" to fill it with music." : undefined}
          action={isOwn && !editing ? (
            <button
              onClick={() => setShowAdd(true)}
              className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2"
            >
              <Plus size={16} /> Add songs
            </button>
          ) : undefined}
        />
      ) : (
        <div>
          {tracks.map((t, i) => (
            <div key={t.id} className="relative group">
              <TrackRow track={t} index={i} showArt />
              {isOwn && !editing && (
                <button
                  onClick={() => removeTrack(t.id)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full grid place-items-center text-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                  aria-label="Remove from playlist"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddToPlaylistPicker
          playlist={playlist}
          onClose={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}