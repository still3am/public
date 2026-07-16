import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import BackHeader from "@/components/BackHeader";
import PullToRefresh from "@/components/PullToRefresh";
import TrackRow from "@/components/TrackRow";
import { formatNumber } from "@/lib/audio-utils";
import {
  Loader2,
  Pencil,
  Save,
  X,
  Play,
  Music,
  MapPin,
  Calendar,
  Globe,
  AtSign,
  Disc,
  ExternalLink,
  Upload,
  History,
} from "lucide-react";

const EMPTY_FORM = {
  bio: "",
  avatar_url: "",
  cover_art_url: "",
  location: "",
  formed_year: "",
  members: "",
  website: "",
  spotify_url: "",
  apple_music_url: "",
  soundcloud_url: "",
  instagram: "",
  twitter: "",
  youtube: "",
};

export default function Artist() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name || "");
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();

  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const [allArtists, allTracks] = await Promise.all([
        base44.entities.Artist.list("-updated_date", 200).catch(() => []),
        base44.entities.Track.list("-created_date", 300),
      ]);
      const lc = decodedName.toLowerCase();
      const found =
        (allArtists || []).find(
          (a) => (a.name || "").toLowerCase() === lc
        ) || null;
      setArtist(found);
      setForm(
        found
          ? {
              bio: found.bio || "",
              avatar_url: found.avatar_url || "",
              cover_art_url: found.cover_art_url || "",
              location: found.location || "",
              formed_year: found.formed_year || "",
              members: found.members || "",
              website: found.website || "",
              spotify_url: found.spotify_url || "",
              apple_music_url: found.apple_music_url || "",
              soundcloud_url: found.soundcloud_url || "",
              instagram: found.instagram || "",
              twitter: found.twitter || "",
              youtube: found.youtube || "",
            }
          : EMPTY_FORM
      );
      const artistTracks = (allTracks || []).filter(
        (t) =>
          t.is_published !== false &&
          (t.artist || "").toLowerCase() === lc
      );
      setTracks(artistTracks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (decodedName) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedName]);

  async function saveArtist() {
    setSaving(true);
    try {
      const last_updated_by_id = user?.id || "";
      if (artist) {
        const updated = await base44.entities.Artist.update(artist.id, {
          ...form,
          last_updated_by_id,
        });
        setArtist(updated);
      } else {
        const created = await base44.entities.Artist.create({
          name: decodedName,
          ...form,
          last_updated_by_id,
        });
        setArtist(created);
      }
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !tracks.length && !artist)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!decodedName) return <EmptyState title="Artist not found" />;

  const totalPlays = tracks.reduce((s, t) => s + (t.play_count || 0), 0);
  const totalLikes = tracks.reduce((s, t) => s + (t.like_count || 0), 0);
  const cover = editMode ? form.cover_art_url : artist?.cover_art_url;
  const avatar = editMode ? form.avatar_url : artist?.avatar_url;

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-5xl mx-auto">
        <BackHeader title={decodedName} />

        <div className="relative h-40 md:h-56 rounded-2xl bg-gradient-to-br from-foreground/[0.10] to-foreground/[0.03] overflow-hidden mb-4">
          {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
          {editMode && (
            <div className="absolute inset-0 grid place-items-center bg-foreground/40 text-white p-3 text-center">
              <div className="w-full max-w-md">
                <span className="text-sm font-semibold">Cover image URL</span>
                <input
                  value={form.cover_art_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cover_art_url: e.target.value }))
                  }
                  placeholder="https://…"
                  className="block w-full mt-2 px-3 py-1.5 rounded-lg text-foreground text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-20 mb-8">
          <div className="rounded-full bg-white p-1 inline-block w-fit shadow-lg">
            <div className="w-28 h-28 rounded-full bg-foreground/10 overflow-hidden grid place-items-center text-foreground/40 text-4xl font-extrabold border-2 border-border">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                decodedName.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {decodedName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/40 mt-1">
              {!editMode && artist?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {artist.location}
                </span>
              )}
              {!editMode && artist?.formed_year && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> Since {artist.formed_year}
                </span>
              )}
              <span>
                {tracks.length} track{tracks.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex items-center gap-5 sm:gap-6 mt-3 text-sm">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-lg">
                  {formatNumber(totalPlays)}
                </span>
                <span className="text-foreground/50">plays</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-lg">
                  {formatNumber(totalLikes)}
                </span>
                <span className="text-foreground/50">likes</span>
              </div>
            </div>

            {!editMode && artist?.bio && (
              <p className="text-sm text-foreground/70 max-w-lg mt-3 whitespace-pre-wrap">
                {artist.bio}
              </p>
            )}
            {!editMode && artist?.members && (
              <p className="text-xs text-foreground/40 max-w-lg mt-1">
                Members: {artist.members}
              </p>
            )}

            {!editMode && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {tracks.length > 0 && (
                  <button
                    onClick={() => p.playTrackAt(tracks)}
                    className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2"
                  >
                    <Play size={14} /> Play all
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                  >
                    <Pencil size={14} /> {artist ? "Edit info" : "Add info"}
                  </button>
                )}
                {artist?.website && (
                  <a
                    href={artist.website}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
                {artist?.spotify_url && (
                  <a
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <Disc size={12} /> Spotify
                  </a>
                )}
                {artist?.apple_music_url && (
                  <a
                    href={artist.apple_music_url}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <Disc size={12} /> Apple Music
                  </a>
                )}
                {artist?.soundcloud_url && (
                  <a
                    href={artist.soundcloud_url}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <Music size={12} /> SoundCloud
                  </a>
                )}
                {artist?.instagram && (
                  <a
                    href={`https://instagram.com/${artist.instagram.replace(
                      /^@/,
                      ""
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <AtSign size={12} /> {artist.instagram}
                  </a>
                )}
                {artist?.twitter && (
                  <a
                    href={`https://twitter.com/${artist.twitter.replace(
                      /^@/,
                      ""
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <AtSign size={12} /> {artist.twitter}
                  </a>
                )}
                {artist?.youtube && (
                  <a
                    href={artist.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="chip"
                  >
                    <ExternalLink size={12} /> YouTube
                  </a>
                )}
              </div>
            )}

            {editMode && (
              <div className="space-y-2 mt-4 max-w-lg">
                <input
                  value={form.avatar_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, avatar_url: e.target.value }))
                  }
                  placeholder="Avatar image URL (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
                />
                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  placeholder="Bio — who is this artist? History, sound, key tracks…"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  rows={4}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="Location"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.formed_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, formed_year: e.target.value }))
                    }
                    placeholder="Active since"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.members}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, members: e.target.value }))
                    }
                    placeholder="Members"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm col-span-2"
                  />
                  <input
                    value={form.website}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, website: e.target.value }))
                    }
                    placeholder="Website URL"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm col-span-2"
                  />
                  <input
                    value={form.spotify_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, spotify_url: e.target.value }))
                    }
                    placeholder="Spotify URL"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.apple_music_url}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        apple_music_url: e.target.value,
                      }))
                    }
                    placeholder="Apple Music URL"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.soundcloud_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, soundcloud_url: e.target.value }))
                    }
                    placeholder="SoundCloud URL"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.youtube}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtube: e.target.value }))
                    }
                    placeholder="YouTube URL"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.instagram}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, instagram: e.target.value }))
                    }
                    placeholder="Instagram @handle"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    value={form.twitter}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, twitter: e.target.value }))
                    }
                    placeholder="X @handle"
                    className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                </div>
                <p className="text-[11px] text-foreground/40 flex items-center gap-1">
                  <History size={11} /> Anyone on PUBLIC can edit this info,
                  Wikipedia-style. Your account will be recorded as the last
                  editor.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={saveArtist}
                    disabled={saving}
                    className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}{" "}
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
          <Music size={18} /> Tracks
        </h2>
        {tracks.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No tracks yet"
            description={`No tracks on PUBLIC are tagged with "${decodedName}" yet.`}
            action={
              user && (
                <Link
                  to="/upload"
                  className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2"
                >
                  <Upload size={14} /> Upload
                </Link>
              )
            }
          />
        ) : (
          <div className="space-y-0.5 mb-10">
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
        {ap.modal}
      </div>
    </PullToRefresh>
  );
}