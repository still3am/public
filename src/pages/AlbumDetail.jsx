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
  Disc,
  Pencil,
  Save,
  X,
  Trash2,
  Share2,
} from "lucide-react";

export default function AlbumDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    cover_art_url: "",
    artisan: "",
    genre: "Other",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = album?.creator_id === user?.id;

  function shareLink() {
    if (!album) return;
    navigator.clipboard
      ?.writeText(`${window.location.origin}/album/${album.id}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  }

  async function load() {
    setLoading(true);
    try {
      const al = await base44.entities.Album.get(id).catch(() => null);
      if (!al) {
        setAlbum(null);
        return;
      }
      setAlbum(al);
      setForm({
        title: al.title || "",
        description: al.description || "",
        cover_art_url: al.cover_art_url || "",
        artisan: al.artisan || "",
        genre: al.genre || "Other",
      });
      const t = await base44.entities.Track
        .filter({ album_id: id }, "track_number", 200)
        .catch(() => []);
      setTracks(Array.isArray(t) ? t : []);
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
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const updated = await base44.entities.Album.update(id, form);
      setAlbum(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlbum() {
    setDeleting(true);
    try {
      await base44.entities.Track
        .updateMany(
          { album_id: id },
          { $unset: { album_id: "", track_number: "" } }
        )
        .catch(() => {});
      await base44.entities.Album.delete(id);
      nav("/library");
    } catch {
      setDeleting(false);
      alert("Could not delete this album right now.");
    }
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!album) return <EmptyState title="Album not found" />;

  const totalDur = tracks.reduce((s, t) => s + (t.duration_seconds || 0), 0);
  const totalMin = Math.round(totalDur / 60);

  return (
    <div className="max-w-5xl mx-auto">
      <BackHeader title="Album" />
      <div className="flex flex-col md:flex-row md:items-end gap-5 mb-8">
        <div className="relative shrink-0">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-foreground/10 grid place-items-center text-foreground/40">
            {form.cover_art_url || album.cover_art_url ? (
              <img
                src={form.cover_art_url || album.cover_art_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Disc size={48} />
            )}
          </div>
          {editing && (
            <label className="absolute inset-0 grid place-items-center cursor-pointer bg-foreground/40 rounded-2xl text-white text-xs font-semibold">
              {uploadingCover ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Change"
              )}
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
          {editing && (
            <input
              value={form.cover_art_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, cover_art_url: e.target.value }))
              }
              placeholder="…or paste cover URL"
              className="block mt-2 w-40 md:w-48 text-xs px-2 py-1.5 rounded-lg border border-border bg-white"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-1">
            Album
          </div>
          {editing ? (
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="text-3xl md:text-4xl font-extrabold tracking-tight w-full max-w-md bg-transparent border-b border-border focus:outline-none"
              placeholder="Album title"
            />
          ) : (
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 break-words">
              {album.title}
            </h1>
          )}
          {editing ? (
            <input
              value={form.artisan}
              onChange={(e) =>
                setForm((f) => ({ ...f, artisan: e.target.value }))
              }
              placeholder="Artist name"
              className="mt-1 w-full max-w-md px-3 py-1.5 rounded-lg border border-border bg-white text-sm"
            />
          ) : (
            <div className="text-sm text-foreground/60 mt-1">
              {album.artisan ? (
                <Link
                  to={`/artist/${encodeURIComponent(album.artisan)}`}
                  className="hover:underline font-semibold text-foreground/80"
                >
                  {album.artisan}
                </Link>
              ) : (
                "Unknown artist"
              )}
            </div>
          )}
          {editing ? (
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Description"
              className="mt-2 w-full max-w-lg px-3 py-2 rounded-lg border border-border bg-white text-sm"
              rows={2}
            />
          ) : (
            album.description && (
              <p className="text-sm text-foreground/60 max-w-lg mt-1">
                {album.description}
              </p>
            )
          )}
          <div className="text-sm text-foreground/50 mt-2 flex items-center gap-2 flex-wrap">
            <span>
              {tracks.length} track{tracks.length === 1 ? "" : "s"}
            </span>
            {totalMin > 0 && <span>· {totalMin} min</span>}
            {album.genre && album.genre !== "Other" && (
              <span>· {album.genre}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {tracks.length > 0 && (
              <button
                onClick={() => p.playTrackAt(tracks)}
                className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition"
              >
                <Play size={16} /> Play
              </button>
            )}
            <button
              onClick={shareLink}
              className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
            >
              <Share2 size={14} /> {copied ? "Copied!" : "Share"}
            </button>
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
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
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
          icon={Disc}
          title="No tracks in this album"
          description={
            isOwner
              ? "Add tracks to this album from the Upload page."
              : "The owner hasn't added any tracks yet."
          }
        />
      ) : (
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              liked={likes.likedIds.has(t.id)}
              onLikeToggle={likes.toggleLike}
              onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)}
            />
          ))}
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold mb-1">Delete album?</h3>
            <p className="text-sm text-foreground/60 mb-4">
              "{album.title}" will be removed. Its tracks stay on your profile as
              standalone uploads. This cannot be undone.
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
                onClick={deleteAlbum}
                disabled={deleting}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting…" : "Delete album"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ap.modal}
    </div>
  );
}