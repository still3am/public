import { shareLink } from '@/lib/shareLink';
import LoadError from '@/components/LoadError';
import { useRef } from 'react';
import { readAllPages } from '@/lib/readPages';
import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUsersByIds } from "@/lib/userLookup";
import SafetyControls from '@/components/SafetyControls';
import { clearPersonalData } from '@/lib/clearPersonalData';
import EmptyState from "@/components/EmptyState";
import TrackCard from "@/components/TrackCard";
import Avatar from "@/components/Avatar";
import PullToRefresh from "@/components/PullToRefresh";
import ProfileQRModal from "@/components/ProfileQRModal";
import { formatNumber } from "@/lib/audio-utils";
import {
  Loader2,
  UserPlus,
  UserCheck,
  Pencil,
  Save,
  Music,
  X,
  MapPin,
  Globe,
  AtSign,
  Calendar,
  Share2,
  QrCode,
  BarChart2,
  Palette,
  Settings } from
"lucide-react";
import SettingsSheet from "@/components/profile/SettingsSheet";
import ProfilePlaylists from "@/components/profile/ProfilePlaylists";
import ProfileSong from "@/components/profile/ProfileSong";
import TopTracks from "@/components/profile/TopTracks";
import ProfileComments from "@/components/profile/ProfileComments";
import FollowListModal from "@/components/profile/FollowListModal";
import StatusMessage from "@/components/profile/StatusMessage";
import { useCoverPalette, profileGradient } from "@/hooks/useCoverPalette";
import ProfileColorPicker from "@/components/profile/ProfileColorPicker";
import ProfileBadge from "@/components/profile/AdminProfileBadge";
import MotionGradient from "@/components/MotionGradient";
import { useCoverUrl } from "@/hooks/useCoverUrl";

function safeUrl(u) {
  if (!u) return undefined;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? p.href : undefined;
  } catch {
    return undefined;
  }
}

// One mapping from a stored profile to the editable form, shared by the first
// load and by Cancel so discarded edits can never resurface on a later save.
function formFromProfile(prof) {
  return {
    display_name: prof.display_name || prof.full_name || "",
    bio: prof.bio || "",
    avatar_url: prof.avatar_url || "",
    banner_url: prof.banner_url || "",
    location: prof.location || "",
    pronouns: prof.pronouns || "",
    website: prof.website || "",
    instagram: prof.instagram || "",
    twitter: prof.twitter || "",
    soundcloud: prof.soundcloud || "",
    status_message: prof.status_message || "",
    featured_track_id: prof.featured_track_id || "",
    top_track_ids: prof.top_track_ids || []
  };
}

export default function Profile({ ownProfileTab = false }) {
  const { id: routeId } = useParams();
  const id = ownProfileTab ? undefined : routeId;
  const { pathname } = useLocation();
  const { user: me, checkUserAuth } = useAuth();
  const isOwn = !id || id === me?.id;
  // This page can stay mounted in the background as a kept-alive tab.
  const isCurrentPage = pathname === (id ? `/profile/${id}` : "/profile");
  const targetId = isOwn ? me?.id : id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followReady, setFollowReady] = useState(false);
  const identity = useRef("");identity.current = [me?.id, targetId].join(":");
  const [stats, setStats] = useState({ followers: null, following: null, plays: 0, likes: 0 });
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [backgroundDraft, setBackgroundDraft] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarVersion = useRef(0),avatarBusy = useRef(false);
  useEffect(() => {avatarVersion.current++;avatarBusy.current = false;setUploadingAvatar(false);return () => {avatarVersion.current++;};}, [targetId]);
  const [followList, setFollowList] = useState(null);

  const [form, setForm] = useState(() => formFromProfile({}));

  const [featuredCoverUrl, setFeaturedCoverUrl] = useState("");
  const chosenProfileSong = useRef(null);
  const profileSongSaving = useRef(false);
  useEffect(() => {
    const tid = profile?.featured_track_id;
    if (!tid) {setFeaturedCoverUrl("");return;}
    if (chosenProfileSong.current?.id === tid) {setFeaturedCoverUrl(chosenProfileSong.current.cover_art_url || "");return;}
    setFeaturedCoverUrl("");
    let cancelled = false;
    base44.entities.Track.filter({ id: tid }, "-created_date", 1).then((page) => {
      const rows = Array.isArray(page) ? page : page?.items || [];
      if (!cancelled) setFeaturedCoverUrl(rows[0]?.cover_art_url || "");
    }).catch(() => {if (!cancelled) setFeaturedCoverUrl("");});
    return () => {cancelled = true;};
  }, [profile?.featured_track_id]);

  const coverUrl = useCoverUrl(featuredCoverUrl);
  const bannerUrl = useCoverUrl(profile?.banner_url);
  const { colors: coverColors, loading: colorsLoading } = useCoverPalette(coverUrl);

  const loadVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [followingBusy, setFollowingBusy] = useState(false);
  const followBusyRef = useRef(false);
  async function load() {
    const request = ++loadVersion.current;request === loadVersion.current && setLoadError(false);setSectionError("");
    request === loadVersion.current && setLoading(true);
    try {
      // Another member's profile comes from the public-profiles endpoint: the
      // built-in User rules only let admins read other users, so a direct
      // User.get left every other profile showing as "not found".
      let prof = isOwn ? await base44.auth.me() : (await getUsersByIds([targetId]))[0] || null;
      if (!prof) {
        request === loadVersion.current && setProfile(null);
        return;
      }
      request === loadVersion.current && setProfile(prof);
      request === loadVersion.current && setForm(formFromProfile(prof));
      // Owners see all their own tracks (pending/private/approved); others only see approved ones.
      const trackFilter = isOwn ?
      { uploader_id: targetId } :
      { uploader_id: targetId, is_published: true };
      // The track list is one page (it fills the grids); the totals are counted on
      // the server so they stay right for artists with more than a page of
      // uploads, and the follower numbers never pull a thousand rows to measure.
      const responses = await Promise.allSettled([
      readAllPages((opts) => base44.entities.Track.filter(trackFilter, { sort: "-created_date", ...opts })),
      base44.entities.Track.aggregate({ query: trackFilter, sum: ["play_count", "like_count"] }),
      base44.entities.Follow.count({ following_id: targetId }),
      base44.entities.Follow.count({ follower_id: targetId }),
      !isOwn && me?.id ? base44.entities.Follow.filter({ follower_id: me.id, following_id: targetId }, "-created_date", 1) : Promise.resolve([])]
      );
      if (request !== loadVersion.current) return;
      const result = (response) => response.status === "fulfilled" ? response.value : null;
      const t = result(responses[0]),totals = result(responses[1]),followersCount = result(responses[2]),followingCount = result(responses[3]),relToUser = result(responses[4]);
      if (t) {setTracks(t);setTopTracks([...t].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5));}
      const totalsRow = totals?.rows?.[0];
      setStats((previous) => ({
        followers: typeof followersCount === "number" ? followersCount : previous.followers,
        following: typeof followingCount === "number" ? followingCount : previous.following,
        plays: totalsRow ? totalsRow.sum_play_count || 0 : t ? t.reduce((sum, x) => sum + (x.play_count || 0), 0) : previous.plays,
        likes: totalsRow ? totalsRow.sum_like_count || 0 : t ? t.reduce((sum, x) => sum + (x.like_count || 0), 0) : previous.likes
      }));
      if (relToUser) {setFollowing((Array.isArray(relToUser) ? relToUser : relToUser.items || []).length > 0);setFollowReady(true);}
      if (responses.some((r, i) => i !== 1 && r.status === "rejected")) setSectionError("Some profile information could not refresh. Saved music and follows have not been removed.");
    } catch {request === loadVersion.current && setLoadError(true);
    } finally {
      request === loadVersion.current && setLoading(false);
    }
  }

  useEffect(() => {
    setProfile(null);setTracks([]);setTopTracks([]);setFollowing(false);setFollowReady(false);setStats({ followers: null, following: null, plays: 0, likes: 0 });
    if (targetId) load();
    return () => {loadVersion.current++;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  // Hide the mobile tab bar when any modal/sheet is open so it doesn't overlap
  // the bottom of the sheet content (z-index alone can't fix this because the
  // framer-motion opacity wrapper creates a stacking context that traps the
  // modal's z-index inside it).
  useEffect(() => {
    // This page stays mounted in the background, so only hold the class while
    // it is the page on screen.
    const anyModal = (showSettings || showDelete || showQR || showColors || !!followList) && isCurrentPage;
    if (anyModal) document.documentElement.classList.add("modal-open");
    return () => document.documentElement.classList.remove("modal-open");
  }, [showSettings, showDelete, showQR, showColors, followList, isCurrentPage]);

  useEffect(() => {
    if (isOwn && me?.id === targetId) setProfile((previous) => previous ? { ...previous, is_artist: !!me.is_artist } : previous);
  }, [isOwn, targetId, me?.id, me?.is_artist]);

  async function toggleFollow() {
    if (!profile || !me?.id || !followReady || followBusyRef.current) return;
    followBusyRef.current = true;setFollowingBusy(true);const started = identity.current;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setStats((s) => ({
      ...s,
      followers: s.followers === null ? null : Math.max(0, s.followers + (wasFollowing ? -1 : 1))
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
      if (identity.current === started) window.dispatchEvent(new CustomEvent('follows:changed', { detail: { uid: me.id, followingId: profile.id, following: !wasFollowing } }));
    } catch {
      if (identity.current !== started) return;
      setSectionError("Your follow change could not save. Please retry.");
      setFollowing(wasFollowing);
      setStats((s) => ({
        ...s,
        followers: s.followers === null ? null : Math.max(0, s.followers + (wasFollowing ? 1 : -1))
      }));
    } finally {followBusyRef.current = false;setFollowingBusy(false);}
  }

  async function uploadAvatar(file) {
    if (avatarBusy.current || !isOwn || !file?.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    avatarBusy.current = true;const version = ++avatarVersion.current;
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url && version === avatarVersion.current) setForm((f) => ({ ...f, avatar_url: file_url }));
    } catch {


      // Keep the current profile image if upload does not complete.
    } finally {if (version === avatarVersion.current) {avatarBusy.current = false;setUploadingAvatar(false);}}
  }

  async function saveProfileSong(id, chosen) {
    if (!isOwn || profileSongSaving.current) return false;
    profileSongSaving.current = true;
    try {
      const update = { featured_track_id: id };
      await base44.auth.updateMe(update);
      const confirmed = await base44.auth.me();
      if ((confirmed.featured_track_id || "") !== id) return false;
      chosenProfileSong.current = chosen?.id === id ? chosen : null;
      if (chosen) setFeaturedCoverUrl(chosen.cover_art_url || "");
      setProfile((previous) => ({ ...previous, ...update }));
      setForm((previous) => ({ ...previous, featured_track_id: id }));
      setBackgroundDraft(null);
      window.dispatchEvent(new Event("profiles:changed"));
      await checkUserAuth({ silent: true });
      return true;
    } catch {return false;} finally {profileSongSaving.current = false;}
  }

  async function saveProfile() {
    if (saving || profileSongSaving.current) return;
    const baseline = formFromProfile(profile);
    const changes = Object.fromEntries(Object.entries(form).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(baseline[key])));
    if (!Object.keys(changes).length) {setEditMode(false);return;}
    setSaving(true);
    try {
      await base44.auth.updateMe(changes);
      const confirmed = await base44.auth.me();
      setProfile(confirmed);setForm(formFromProfile(confirmed));
      await checkUserAuth({ silent: true });
      setEditMode(false);
    } catch {window.dispatchEvent(new Event("public:error"));} finally {setSaving(false);}
  }

  function cancelEdit() {
    avatarVersion.current++;avatarBusy.current = false;setUploadingAvatar(false);
    // Reopening the editor must start from what is actually saved.
    if (profile) setForm(formFromProfile(profile));
    setEditMode(false);
  }

  async function shareProfile() {
    try {
      const result = await shareLink({ title: displayName, url: window.location.origin + '/profile/' + encodeURIComponent(targetId) });
      if (result === 'copied') {setCopied(true);setTimeout(() => setCopied(false), 1500);}
    } catch {/* Keep the profile available if the system share controls fail. */}
  }

  async function confirmDelete() {
    if (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    try {
      const result = await base44.functions.invoke("deleteMyAccount", {});
      if (result.data?.deleted !== true) throw new Error("Deletion incomplete");
      await clearPersonalData();
      base44.auth.logout(window.location.origin + "/login");
    } catch {
      setDeleting(false);
      // Keep the confirmation open so the user can retry or use Support.
    }
  }

  if (loadError && !profile) return <LoadError onRetry={load} />;
  if (loading && !profile)
  return (
    <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  if (!profile) return <EmptyState title="User not found" />;

  const isAdminProfile = isOwn ? me?.role === "admin" : profile.is_public_admin === true;
  const displayName = profile.display_name || profile.full_name || "Unnamed";
  const avatarUrl = editMode ? form.avatar_url : profile.avatar_url;
  const backgroundValue = { mode: profile.profile_background_mode || "auto", motion: profile.profile_background_motion === "still" ? "still" : "flow", speed: Math.max(.35, Math.min(1.6, Number(profile.profile_background_speed) || 1)), colors: (profile.profile_background_colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3) };
  const currentBackground = backgroundDraft || backgroundValue;
  const backgroundColors = currentBackground.mode === "off" ? [] : currentBackground.mode === "custom" ? currentBackground.colors : coverColors.slice(0, 3);
  const closeColors = () => {setShowColors(false);setBackgroundDraft(null);};
  const saveColors = async (value) => {
    if (!isOwn) return;
    const update = { profile_background_mode: value.mode, profile_background_colors: value.colors, profile_background_motion: value.motion, profile_background_speed: value.speed };
    await base44.auth.updateMe(update);
    const confirmed = await base44.auth.me();
    const actualColors = confirmed.profile_background_colors || [];
    if (confirmed.profile_background_mode !== value.mode || actualColors.join(",").toLowerCase() !== value.colors.join(",").toLowerCase() || confirmed.profile_background_motion !== value.motion || Number(confirmed.profile_background_speed) !== value.speed) throw new Error("Colors have not saved yet");
    setProfile((previous) => ({ ...previous, ...update, profile_background_colors: actualColors }));
    window.dispatchEvent(new Event("profiles:changed"));
    await checkUserAuth({ silent: true });
  };




  return (
    <PullToRefresh onRefresh={load} disabled={editMode || saving || uploadingAvatar || showSettings || showDelete || showQR || showColors || !!followList}>

    {backgroundColors.length > 0 && <MotionGradient colors={backgroundColors} motion={currentBackground.motion} speed={currentBackground.speed} active={isCurrentPage && !showColors && !showSettings && !showQR && !showDelete && !followList} pauseWhenCovered className="profile-artwork-background fixed inset-0 pointer-events-none z-0" style={{ opacity: .72 }} />}
    {!backgroundColors.length && currentBackground.mode === "auto" && coverUrl && <div aria-hidden="true" className="profile-artwork-background fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(45px) saturate(1.35)", transform: "scale(1.12)", opacity: .6 }} />}
    <div className={`profile-page profile-redesigned max-w-6xl mx-auto relative z-10 ${editMode ? "profile-is-editing" : ""}`}>
      {sectionError && <button disabled={loading || editMode || saving || uploadingAvatar} onClick={load} className="playlist-action text-xs mb-4">Refresh profile</button>}
      <div className="profile-overview flex flex-col md:flex-row gap-4 md:gap-6 mb-8">
      <div className="profile-identity relative rounded-2xl overflow-hidden ring-1 ring-inset ring-foreground/10 bg-card flex-1 min-w-0">
        <div className="profile-cover-stage" aria-hidden="true" style={backgroundColors.length ? { backgroundImage: profileGradient(backgroundColors) } : undefined}>
          {(bannerUrl || currentBackground.mode === "auto" && coverUrl) && <img key={bannerUrl || coverUrl} src={bannerUrl || coverUrl} alt="" onError={(event) => {event.currentTarget.style.visibility = "hidden";}} />}
          <div className="profile-cover-fade" />
        </div>
        {!editMode && isAdminProfile && <ProfileBadge variant="admin" />}
        {!editMode && !isAdminProfile && profile.is_artist && <ProfileBadge variant="artist" />}
        
        {/* Identity, stats, actions */}
        <div className="profile-details relative z-10 px-5 md:px-10 pb-5 md:pb-8 pt-5 md:pt-8">
          <div className="profile-identity-row flex flex-col items-center md:flex-row md:items-center md:justify-center gap-4 md:gap-8">
            <div className="relative shrink-0">
              





                  
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

            <div className="profile-info flex-1 min-w-0 w-full md:w-auto text-center md:text-left">
              <div className="flex items-baseline gap-2 flex-wrap justify-center md:justify-start">
                {editMode ?
                    <input
                      value={form.display_name}
                      onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                      className="text-2xl md:text-4xl font-extrabold tracking-tight w-full max-w-2xl bg-transparent border-b border-border focus:outline-none pb-1"
                      placeholder="Display name" /> :


                    <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
                    {displayName}
                  </h1>
                    }
                {!editMode && profile.pronouns &&
                    <span className="text-sm text-foreground/40">{profile.pronouns}</span>
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

              <div className="profile-stats flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-2.5 text-sm md:text-base">
                <button onClick={() => setFollowList("followers")} className="hover:underline transition">
                  <span className="font-bold">{stats.followers === null ? "—" : formatNumber(stats.followers)}</span> <span className="text-foreground/50">followers</span>
                </button>
                <button onClick={() => setFollowList("following")} className="hover:underline transition">
                  <span className="font-bold">{stats.following === null ? "—" : formatNumber(stats.following)}</span> <span className="text-foreground/50">following</span>
                </button>
                {(profile.is_artist || stats.plays > 0) && <span><span className="font-bold">{formatNumber(stats.plays)}</span> <span className="text-foreground/50">plays</span></span>}
                {stats.likes > 0 && <span><span className="font-bold">{formatNumber(stats.likes)}</span> <span className="text-foreground/50">likes</span></span>}
              </div>

              {editMode ?
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Add a bio"
                    className="mt-3 w-full max-w-2xl px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    rows={2} /> :


                  profile.bio &&
                  <p className="selectable-content text-sm md:text-base text-foreground/70 max-w-2xl mt-2.5 leading-relaxed mx-auto md:mx-0">
                    {profile.bio}
                  </p>

                  }

              {editMode ?
                  <StatusMessage
                    value={form.status_message}
                    editMode
                    onChange={(v) => setForm((f) => ({ ...f, status_message: v }))} /> :

                  <StatusMessage value={profile.status_message} />
                  }



              {!editMode && (
                  profile.website || profile.instagram || profile.twitter || profile.soundcloud) &&

                  <div className="flex flex-wrap gap-2 mt-2.5 justify-center md:justify-start">
                  {profile.website &&
                    <a href={safeUrl(profile.website)} target="_blank" rel="noreferrer" className="chip">
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
                    <a href={safeUrl(profile.soundcloud)} target="_blank" rel="noreferrer" className="chip">
                      <Music size={12} /> SoundCloud
                    </a>
                    }
                </div>
                  }

              <div className="profile-actions flex items-center gap-2 md:gap-3 mt-3 flex-wrap justify-center md:justify-start">
                {isOwn ?
                    editMode ?
                    <>
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        title="Save"
                        aria-label="Save changes"
                        className="profile-primary-action chrome-button disabled:opacity-40">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}<span>{saving ? "Saving…" : "Save changes"}</span>
                      </button>
                      <button
                        onClick={cancelEdit}
                        title="Cancel"
                        aria-label="Cancel editing"
                        className="profile-primary-action playlist-action">
                        <X size={16} /><span>Cancel</span>
                      </button>
                    </> :
                    <button
                      onClick={() => setEditMode(true)}
                      title="Edit profile"
                      aria-label="Edit profile"
                      className="profile-primary-action playlist-action">
                    <Pencil size={16} /><span>Edit profile</span>
                  </button> :
                    <button
                      disabled={followingBusy || !followReady} onClick={toggleFollow}
                      title={following ? "Following (click to unfollow)" : "Follow"}
                      aria-label={following ? "Unfollow" : "Follow"}
                      className={`profile-primary-action playlist-action transition ${
                      following ? "border border-border" : "bg-foreground text-background"}`}>
                    {followingBusy ? <Loader2 size={16} className="animate-spin" /> : following ? <UserCheck size={16} /> : <UserPlus size={16} />}<span>{following ? "Following" : "Follow"}</span>
                  </button>
                    }
                {!editMode &&
                    <button
                      onClick={shareProfile}
                      title={copied ? "Copied!" : "Share"}
                      aria-label="Share profile"
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border grid place-items-center">
                    <Share2 size={16} />
                  </button>
                    }
                {!editMode &&
                    <button
                      onClick={() => setShowQR(true)}
                      title="QR code"
                      aria-label="Show QR code"
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border grid place-items-center">
                    <QrCode size={16} />
                  </button>
                    }
                  {isOwn && !editMode &&
                    <button
                      onClick={() => setShowSettings(true)}
                      title="Settings"
                      aria-label="Settings"
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border grid place-items-center">
                    <Settings size={16} />
                  </button>
                    }
                  {isOwn && !editMode && <button onClick={() => setShowColors(true)} aria-label="Customize profile colors" title="Profile colors" className="w-10 h-10 rounded-full border border-border grid place-items-center"><Palette size={16} /></button>}
                  {isOwn && !editMode && profile.is_artist &&
                    <Link
                      to="/artist-dashboard"
                      title="Artist Dashboard"
                      aria-label="Artist Dashboard"
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border grid place-items-center">
                    <BarChart2 size={16} />
                  </Link>
                    }
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <div className="profile-song-spotlight">
      <ProfileSong
            trackId={editMode ? form.featured_track_id : profile?.featured_track_id}
            editMode={editMode}
            userTracks={tracks}
            onChange={saveProfileSong} />
          
      </div>

      <div className="profile-content"><section className="profile-music">
      <TopTracks
              trackIds={editMode ? form.top_track_ids : profile?.top_track_ids || []}
              editMode={editMode}
              userTracks={tracks}
              onChange={(ids) => setForm((f) => ({ ...f, top_track_ids: ids }))} />
        

      {!editMode && !isOwn && topTracks.length > 0 && !(profile?.top_track_ids?.length > 0) &&
            <div className="mb-8">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <BarChart2 size={18} /> Top Tracks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {topTracks.map((t) =>
                <TrackCard key={t.id} track={t} />
                )}
          </div>
        </div>
            }

      <ProfilePlaylists userId={targetId} active={isCurrentPage} />
      </section><aside className="profile-conversation"><ProfileComments profileId={targetId} isOwn={isOwn} active={isCurrentPage} /><SafetyControls type="user" id={targetId} userId={targetId} label="profile" /></aside></div>

      {showColors && isOwn && <ProfileColorPicker coverUrl={coverUrl} colors={coverColors} loading={colorsLoading} value={backgroundValue} onPreview={setBackgroundDraft} onSave={saveColors} onClose={closeColors} />}

      {showSettings && isOwn &&
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onDeleteAccount={() => setShowDelete(true)} />

        }

      {showDelete &&
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold mb-1">Delete your account</h3>
            <p className="text-sm text-foreground/60 mb-4">
              This will permanently remove your profile and uploads. To confirm, type{" "}
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

      {followList &&
        <FollowListModal
          userId={targetId}
          type={followList}
          onClose={() => setFollowList(null)} />
        }
    </div>
    </PullToRefresh>);

}