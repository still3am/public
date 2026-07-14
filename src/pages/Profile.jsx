import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import TrackRow from "@/components/TrackRow";
import Avatar from "@/components/Avatar";
import {
  Loader2,
  UserPlus,
  UserCheck,
  Pencil,
  Save,
  Music,
  ListMusic,
  Shield,
  Upload,
  X,
} from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const likes = useLikes(me);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const isOwn = !id || id === me?.id;
  const targetId = isOwn ? me?.id : id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let prof = isOwn
        ? me
        : await base44.entities.User.get(targetId).catch(() => null);
      if (!prof) {
        setProfile(null);
        return;
      }
      setProfile(prof);
      setForm({
        display_name: prof.display_name || prof.full_name || "",
        bio: prof.bio || "",
        avatar_url: prof.avatar_url || "",
      });
      const [t, pl, followsToMe, followsFromMe, relToUser] = await Promise.all([
        base44.entities.Track.filter(
          { uploader_id: targetId, is_published: true },
          "-created_date",
          50
        ),
        base44.entities.Playlist.filter(
          { creator_id: targetId, is_public: true },
          "-created_date",
          50
        ),
        base44.entities.Follow.filter(
          { following_id: targetId },
          "-created_date",
          1000
        ),
        base44.entities.Follow.filter(
          { follower_id: targetId },
          "-created_date",
          1000
        ),
        !isOwn
          ? base44.entities.Follow.filter(
              { follower_id: me.id, following_id: targetId },
              "-created_date",
              1
            )
          : Promise.resolve([]),
      ]);
      setTracks(t);
      setPlaylists(pl);
      setStats({ followers: followsToMe.length, following: followsFromMe.length });
      setFollowing(relToUser.length > 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (targetId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  async function toggleFollow() {
    if (!profile) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setStats((s) => ({
      ...s,
      followers: Math.max(0, s.followers + (wasFollowing ? -1 : 1)),
    }));
    try {
      if (wasFollowing) {
        await base44.entities.Follow.deleteMany({
          follower_id: me.id,
          following_id: profile.id,
        });
      } else {
        await base44.entities.Follow.create({
          follower_id: me.id,
          following_id: profile.id,
        });
        try {
          await base44.entities.Notification.create({
            user_id: profile.id,
            type: "new_follower",
            actor_id: me.id,
          });
        } catch {}
      }
    } catch {
      setFollowing(wasFollowing);
      setStats((s) => ({
        ...s,
        followers: Math.max(0, s.followers + (wasFollowing ? 1 : -1)),
      }));
    }
  }

  async function uploadAvatar(file) {
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, avatar_url: file_url }));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: form.display_name,
        bio: form.bio,
        avatar_url: form.avatar_url,
      });
      setEditMode(false);
      setProfile((prev) => ({
        ...prev,
        ...form,
        full_name: form.display_name || prev?.full_name,
      }));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!profile) return <EmptyState title="User not found" />;

  const displayName = profile.display_name || profile.full_name || "Unnamed";
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end gap-5 mb-8">
        <div className="relative">
          <Avatar
            user={editMode ? form : profile}
            size={128}
            className="border-2 border-border"
          />
          {editMode && (
            <label className="absolute inset-0 grid place-items-center cursor-pointer bg-foreground/40 rounded-full text-white text-xs font-semibold">
              {uploadingAvatar ? (
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
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {profile.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-foreground/60 mb-1">
              <Shield size={12} /> Verified
            </span>
          )}
          {editMode ? (
            <input
              value={form.display_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              className="text-3xl md:text-4xl font-extrabold tracking-tight w-full bg-transparent border-b border-border focus:outline-none mb-1"
              placeholder="Display name"
            />
          ) : (
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {displayName}
            </h1>
          )}
          <div className="text-sm text-foreground/50 flex items-center gap-3 mb-2">
            <span>{stats.followers} followers</span>
            <span>·</span>
            <span>{stats.following} following</span>
            {profile.can_upload && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-foreground/[0.06]">
                <Upload size={10} /> uploader
              </span>
            )}
          </div>
          {editMode ? (
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Add a bio"
              className="mt-2 w-full max-w-lg px-3 py-2 rounded-lg border border-border bg-white text-sm"
              rows={2}
            />
          ) : (
            profile.bio && (
              <p className="text-sm text-foreground/70 max-w-lg mt-2">
                {profile.bio}
              </p>
            )
          )}
          <div className="flex items-center gap-2 mt-4">
            {isOwn ? (
              editMode ? (
                <>
                  <button
                    onClick={saveProfile}
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
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                  >
                    <X size={14} /> Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-2"
                >
                  <Pencil size={14} /> Edit profile
                </button>
              )
            ) : (
              <button
                onClick={toggleFollow}
                className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  following
                    ? "border border-border"
                    : "bg-foreground text-background"
                }`}
              >
                {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                {following ? "Following" : "Follow"}
              </button>
            )}
            {tracks.length > 0 && (
              <button
                onClick={() => p.playTrackAt(tracks)}
                className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
              >
                Play
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <Music size={18} /> Tracks
      </h2>
      {tracks.length === 0 ? (
        <EmptyState
          icon={Music}
          title={isOwn ? "You haven't uploaded anything" : "No uploads yet"}
          description={
            isOwn && me?.can_upload
              ? "Share your first track with the PUBLIC network."
              : ""
          }
          action={
            isOwn && me?.can_upload ? (
              <Link
                to="/upload"
                className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2"
              >
                <Upload size={14} /> Upload
              </Link>
            ) : null
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

      {playlists.length > 0 && (
        <>
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <ListMusic size={18} /> Playlists
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="rounded-xl p-3 hover:bg-foreground/[0.03] transition"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                  {pl.cover_art_url ? (
                    <img
                      src={pl.cover_art_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ListMusic size={28} />
                  )}
                </div>
                <div className="font-semibold truncate text-sm">{pl.name}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {pl.track_ids?.length || 0} track
                  {(pl.track_ids?.length || 0) === 1 ? "" : "s"}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {ap.modal}
    </div>
  );
}