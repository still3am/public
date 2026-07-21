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
import PullToRefresh from "@/components/PullToRefresh";
import BackHeader from "@/components/BackHeader";
import ProfileQRModal from "@/components/ProfileQRModal";
import ThemeToggle from "@/components/ThemeToggle";
import { formatNumber } from "@/lib/audio-utils";
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
  MapPin,
  Globe,
  AtSign,
  Calendar,
  Share2,
  QrCode,
  Play,
  BarChart2,
  Trash2,
  Disc } from
"lucide-react";

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
  const [topTracks, setTopTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, plays: 0, likes: 0 });
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",
    location: "",
    pronouns: "",
    website: "",
    instagram: "",
    twitter: "",
    soundcloud: ""
  });

  async function load() {
    setLoading(true);
    try {
      let prof = isOwn ?
      me :
      await base44.entities.User.get(targetId).catch(() => null);
      if (!prof) {
        setProfile(null);
        return;
      }
      setProfile(prof);
      setForm({
        display_name: prof.display_name || prof.full_name || "",
        bio: prof.bio || "",
        avatar_url: prof.avatar_url || "",
        banner_url: prof.banner_url || "",
        location: prof.location || "",
        pronouns: prof.pronouns || "",
        website: prof.website || "",
        instagram: prof.instagram || "",
        twitter: prof.twitter || "",
        soundcloud: prof.soundcloud || ""
      });
      const trackFilter = { uploader_id: targetId, is_published: true };
      const [t, pl, al, followsToMe, followsFromMe, relToUser] = await Promise.all([
      base44.entities.Track.filter(trackFilter, "-created_date", 100),
      base44.entities.Playlist.filter(
        { creator_id: targetId, is_public: true },
        "-created_date",
        50
      ),
      base44.entities.Album.filter({ creator_id: targetId }, "-created_date", 50),
      base44.entities.Follow.filter({ following_id: targetId }, "-created_date", 1000),
      base44.entities.Follow.filter({ follower_id: targetId }, "-created_date", 1000),
      !isOwn ?
      base44.entities.Follow.filter(
        { follower_id: me.id, following_id: targetId },
        "-created_date",
        1
      ) :
      Promise.resolve([])]
      );
      setTracks(t);
      setTopTracks(
        [...t].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5)
      );
      setPlaylists(pl);
      setAlbums(al);
      setStats({
        followers: followsToMe.length,
        following: followsFromMe.length,
        plays: t.reduce((s, x) => s + (x.play_count || 0), 0),
        likes: t.reduce((s, x) => s + (x.like_count || 0), 0)
      });
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
      followers: Math.max(0, s.followers + (wasFollowing ? -1 : 1))
    }));
    try {
      if (wasFollowing) {
        await base44.entities.Follow.deleteMany({
          follower_id: me.id,
          following_id: profile.id
        });
      } else {
        await base44.entities.Follow.create({
          follower_id: me.id,
          following_id: profile.id
        });
        try {
          await base44.entities.Notification.create({
            user_id: profile.id,
            type: "new_follower",
            actor_id: me.id
          });
        } catch {}
      }
    } catch {
      setFollowing(wasFollowing);
      setStats((s) => ({
        ...s,
        followers: Math.max(0, s.followers + (wasFollowing ? 1 : -1))
      }));
    }
  }

  async function uploadAvatar(file) {
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, avatar_url: file_url }));
    } catch {
      alert(
        "Profile image uploads are temporarily unavailable. Please try again later."
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function uploadBanner(file) {
    setUploadingBanner(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, banner_url: file_url }));
    } catch {
      alert(
        "Profile image uploads are temporarily unavailable. Please try again later."
      );
    } finally {
      setUploadingBanner(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: form.display_name,
        bio: form.bio,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
        location: form.location,
        pronouns: form.pronouns,
        website: form.website,
        instagram: form.instagram,
        twitter: form.twitter,
        soundcloud: form.soundcloud
      });
      setEditMode(false);
      setProfile((prev) => ({
        ...prev,
        ...form,
        full_name: form.display_name || prev?.full_name
      }));
    } finally {
      setSaving(false);
    }
  }

  function shareProfile() {
    const url = `${window.location.origin}/profile/${targetId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function confirmDelete() {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteMyAccount", {});
      await base44.auth.logout();
      window.location.href = "/login";
    } catch {
      setDeleting(false);
      alert(
        "Could not delete your account right now. Please try again or contact support."
      );
    }
  }

  if (loading && !profile)
  return (
    <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  if (!profile) return <EmptyState title="User not found" />;

  const displayName = profile.display_name || profile.full_name || "Unnamed";
  const banner = editMode ? form.banner_url : profile.banner_url;
  const avatarUrl = editMode ? form.avatar_url : profile.avatar_url;
  const standaloneTracks = tracks.filter((t) => !t.album_id);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="max-w-5xl mx-auto">
      {!isOwn && <BackHeader title={displayName} />}
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-inset ring-foreground/10 mb-8 bg-card">
        {/* Banner as background */}
        <div className="absolute inset-x-0 top-0 h-40 sm:h-48 md:h-60 bg-gradient-to-br from-violet-500/[0.15] via-foreground/[0.05] to-amber-400/[0.15]">
          {banner && <img src={banner} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          {editMode &&
            <label className="absolute inset-0 grid place-items-center cursor-pointer bg-foreground/40 text-white text-sm font-semibold z-10">
              {uploadingBanner ?
              <Loader2 size={16} className="animate-spin" /> :

              <span className="inline-flex items-center gap-1.5">
                  <Upload size={14} /> Change banner
                </span>
              }
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadBanner(f);
                }} />

            </label>
            }
        </div>

        {/* Identity, stats, actions */}
        <div className="relative z-10 px-4 md:px-8 pb-6 md:pb-8 pt-20 sm:pt-24 md:pt-28">
          <div className="flex flex-col items-center md:flex-row md:items-end gap-4 md:gap-6">
            <div className="relative shrink-0">
              <div className="rounded-full bg-background p-1.5 inline-block ring-1 ring-foreground/10 shadow-sm">
                <Avatar
                    user={{ ...profile, avatar_url: avatarUrl }}
                    size={150} />
                  
              </div>
              {editMode &&
                <label className="absolute bottom-1 right-1 p-2 rounded-full bg-foreground text-background cursor-pointer shadow-lg">
                  {uploadingAvatar ?
                  <Loader2 size={14} className="animate-spin" /> :

                  <Pencil size={14} />
                  }
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAvatar(f);
                    }} />
                  
                </label>
                }
            </div>

            <div className="flex-1 min-w-0 w-full md:w-auto text-center md:text-left py-5">
              <div className="flex items-baseline gap-2 flex-wrap justify-center md:justify-start">
                {editMode ?
                  <input
                    value={form.display_name}
                    onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                    className="text-2xl md:text-4xl font-extrabold tracking-tight w-full max-w-2xl bg-transparent border-b border-border focus:outline-none pb-1"
                    placeholder="Display name" /> :


                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                    {displayName}
                  </h1>
                  }
                {!editMode && profile.pronouns &&
                  <span className="text-sm text-foreground/40">{profile.pronouns}</span>
                  }
                {editMode &&
                  <input
                    value={form.pronouns}
                    onChange={(e) => setForm((f) => ({ ...f, pronouns: e.target.value }))}
                    placeholder="Pronouns"
                    className="text-sm text-foreground/40 bg-transparent border-b border-border focus:outline-none w-32 px-1 pb-0.5" />

                  }
              </div>

              {!editMode &&
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-foreground/40 mt-1.5">
                  {profile.location &&
                  <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {profile.location}
                    </span>
                  }
                  {profile.created_date &&
                  <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> Joined{" "}
                      {new Date(profile.created_date).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric"
                    })}
                    </span>
                  }
                </div>
                }

              <div className="flex items-center justify-center md:justify-start divide-x divide-foreground/10 mt-3 text-sm overflow-x-auto no-scrollbar">
                <div className="pr-4 sm:pr-5 shrink-0">
                  <span className="font-bold text-base">{formatNumber(stats.followers)}</span>{" "}
                  <span className="text-foreground/50">followers</span>
                </div>
                


                  
                <div className="px-4 sm:px-5 shrink-0">
                  <span className="font-bold text-base">{formatNumber(stats.plays)}</span>{" "}
                  <span className="text-foreground/50">plays</span>
                </div>
                <div className="pl-4 sm:pl-5 shrink-0">
                  <span className="font-bold text-base">{formatNumber(stats.likes)}</span>{" "}
                  <span className="text-foreground/50">likes</span>
                </div>
              </div>

              {editMode ?
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Add a bio"
                  className="mt-3 w-full max-w-2xl px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  rows={2} /> :


                profile.bio &&
                <p className="text-sm text-foreground/70 max-w-2xl mt-3 leading-relaxed mx-auto md:mx-0">
                    {profile.bio}
                  </p>

                }

              {editMode &&
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto md:mx-0">
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Location"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  
                  <input
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="Website URL"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  
                  <input
                    value={form.instagram}
                    onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                    placeholder="Instagram @handle"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  
                  <input
                    value={form.twitter}
                    onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))}
                    placeholder="X / Twitter @handle"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  
                </div>
                }

              {!editMode && (
                profile.website || profile.instagram || profile.twitter || profile.soundcloud) &&

                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  {profile.website &&
                  <a href={profile.website} target="_blank" rel="noreferrer" className="chip">
                      <Globe size={12} /> Website
                    </a>
                  }
                  {profile.instagram &&
                  <a
                    href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="chip">
                    
                      <AtSign size={12} /> {profile.instagram}
                    </a>
                  }
                  {profile.twitter &&
                  <a
                    href={`https://twitter.com/${profile.twitter.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="chip">
                    
                      <AtSign size={12} /> {profile.twitter}
                    </a>
                  }
                  {profile.soundcloud &&
                  <a href={profile.soundcloud} target="_blank" rel="noreferrer" className="chip">
                      <Music size={12} /> SoundCloud
                    </a>
                  }
                </div>
                }

              <div className="flex items-center gap-2 mt-4 flex-wrap justify-center md:justify-start">
                {isOwn ?
                  editMode ?
                  <>
                      <button
                      onClick={saveProfile}
                      disabled={saving}
                      title="Save"
                      aria-label="Save changes"
                      className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                      <button
                      onClick={() => setEditMode(false)}
                      title="Cancel"
                      aria-label="Cancel editing"
                      className="w-10 h-10 rounded-full border border-border grid place-items-center">
                        <X size={16} />
                      </button>
                    </> :
                  <button
                    onClick={() => setEditMode(true)}
                    title="Edit profile"
                    aria-label="Edit profile"
                    className="w-10 h-10 rounded-full border border-border grid place-items-center">
                    <Pencil size={16} />
                  </button> :
                  <button
                    onClick={toggleFollow}
                    title={following ? "Following (click to unfollow)" : "Follow"}
                    aria-label={following ? "Unfollow" : "Follow"}
                    className={`w-10 h-10 rounded-full grid place-items-center transition ${
                    following ? "border border-border" : "bg-foreground text-background"}`}>
                    {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  </button>
                  }
                {!editMode &&
                  <button
                    onClick={shareProfile}
                    title={copied ? "Copied!" : "Share"}
                    aria-label="Share profile"
                    className="w-10 h-10 rounded-full border border-border grid place-items-center hidden">
                    <Share2 size={16} />
                  </button>
                  }
                {!editMode &&
                  <button
                    onClick={() => setShowQR(true)}
                    title="QR code"
                    aria-label="Show QR code"
                    className="w-10 h-10 rounded-full border border-border grid place-items-center">
                    <QrCode size={16} />
                  </button>
                  }
                







                  
                {isOwn && !editMode &&
                  <Link
                    to="/upload"
                    title="Upload a track"
                    aria-label="Upload a track"
                    className="w-10 h-10 rounded-full border border-border grid place-items-center">
                    <Upload size={16} />
                  </Link>
                  }
              </div>
            </div>
          </div>
        </div>
      </div>

      {!editMode && topTracks.length > 0 &&
        <div className="mb-8">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <BarChart2 size={18} /> Top Tracks
          </h2>
          <div className="space-y-0.5">
            {topTracks.map((t, i) =>
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              liked={likes.likedIds.has(t.id)}
              onLikeToggle={likes.toggleLike}
              onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)} />

            )}
          </div>
        </div>
        }

      {albums.length > 0 &&
        <>
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Disc size={18} /> Albums
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-10">
            {albums.map((a) =>
            <Link
              key={a.id}
              to={`/album/${a.id}`}
              className="rounded-xl p-3 hover:bg-foreground/[0.03] transition">
            
                <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                  {a.cover_art_url ?
                <img src={a.cover_art_url} alt="" className="w-full h-full object-cover" /> :

                <Disc size={28} />
                }
                </div>
                <div className="font-semibold truncate text-sm">{a.title}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {a.artisan || a.genre || "Album"}
                </div>
              </Link>
            )}
          </div>
        </>
        }

      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <Music size={18} /> Tracks
      </h2>
      {standaloneTracks.length === 0 && albums.length === 0 ?
        <EmptyState
          icon={Music}
          title={isOwn ? "You haven't uploaded anything" : "No uploads yet"}
          description={isOwn ? "Share your first track with the PUBLIC network." : ""}
          action={
          isOwn ?
          <Link
            to="/upload"
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2">
          
                <Upload size={14} /> Upload
              </Link> :
          null
          } /> :

        standaloneTracks.length === 0 && albums.length > 0 ?
        <p className="text-sm text-foreground/50 mb-10">
          All uploads are part of the albums above.
        </p> :

        <div className="space-y-0.5 mb-10">
          {standaloneTracks.map((t, i) =>
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            liked={likes.likedIds.has(t.id)}
            onLikeToggle={likes.toggleLike}
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)} />

          )}
        </div>
        }

      {playlists.length > 0 &&
        <>
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <ListMusic size={18} /> Playlists
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {playlists.map((pl) =>
            <Link
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className="rounded-xl p-3 hover:bg-foreground/[0.03] transition">
            
                <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                  {pl.cover_art_url ?
                <img src={pl.cover_art_url} alt="" className="w-full h-full object-cover" /> :

                <ListMusic size={28} />
                }
                </div>
                <div className="font-semibold truncate text-sm">{pl.name}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {pl.track_ids?.length || 0} track{(pl.track_ids?.length || 0) === 1 ? "" : "s"}
                </div>
              </Link>
            )}
          </div>
        </>
        }
      {isOwn && !editMode &&
        <div className="mt-10 p-5 rounded-2xl border border-border bg-foreground/[0.02]">
          <h2 className="text-base font-extrabold tracking-tight mb-1 text-foreground">
            Appearance
          </h2>
          <p className="text-sm text-foreground/60 mb-4">
            Choose how PUBLIC looks for you. Dark mode applies across every page.
          </p>
          <ThemeToggle />
        </div>
        }
      {isOwn && !editMode &&
        <div className="mt-10 p-5 rounded-2xl border border-red-200 bg-red-50/30">
          <h2 className="text-base font-extrabold tracking-tight mb-1 text-red-700">
            Danger Zone
          </h2>
          <p className="text-sm text-foreground/60 mb-4">
            Permanently delete your account and all data you've contributed to
            PUBLIC. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold flex items-center gap-2">
          
            <Trash2 size={14} /> Delete account
          </button>
        </div>
        }

      {showDelete &&
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold mb-1">Delete your account</h3>
            <p className="text-sm text-foreground/60 mb-4">
              This will permanently remove your profile, uploads, likes,
              follows, and playlists. To confirm, type{" "}
              <strong>DELETE</strong> below.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm mb-3 font-mono uppercase tracking-widest" />
          
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm("");
                }}
                className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
                disabled={deleting}>
              
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
              
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
        }

      {showQR &&
        <ProfileQRModal
          url={`${window.location.origin}/profile/${targetId}`}
          name={displayName}
          avatar={profile.avatar_url}
          onClose={() => setShowQR(false)} />

        }
      {ap.modal}
    </div>
    </PullToRefresh>);

}