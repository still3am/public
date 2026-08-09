import { Loader2, UserPlus, UserCheck, Pencil, Save, X, MapPin, Globe, AtSign, Calendar, Share2, QrCode, Settings, Music, Upload } from "lucide-react";
import Avatar from "@/components/Avatar";
import { formatNumber } from "@/lib/audio-utils";

function safeUrl(u) {
  if (!u) return undefined;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? p.href : undefined;
  } catch {
    return undefined;
  }
}

export default function ProfileHeader({
  profile,
  form,
  setForm,
  editMode,
  setEditMode,
  avatarUrl,
  banner,
  displayName,
  stats,
  isOwn,
  following,
  toggleFollow,
  saving,
  saveProfile,
  uploadingAvatar,
  uploadAvatar,
  uploadingBanner,
  uploadBanner,
  shareProfile,
  copied,
  setShowQR,
  setShowSettings,
}) {
  const pill = "px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition active:scale-95";

  const ActionButtons = ({ mobile = false }) => (
    <div className={`flex items-center gap-2 flex-wrap ${mobile ? "justify-center" : ""}`}>
      {isOwn ? (
        editMode ? (
          <>
            <button onClick={saveProfile} disabled={saving} className={`${pill} bg-foreground text-background disabled:opacity-40 ${mobile ? "flex-1" : ""}`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button onClick={() => setEditMode(false)} className={`${pill} border border-border ${mobile ? "flex-1" : ""}`}>
              <X size={14} /> Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditMode(true)} className={`${pill} border border-border ${mobile ? "flex-1" : ""}`}>
              <Pencil size={14} /> Edit profile
            </button>
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-lg border border-border grid place-items-center shrink-0">
              <Settings size={16} />
            </button>
          </>
        )
      ) : (
        <button onClick={toggleFollow} className={`${pill} ${following ? "border border-border" : "bg-foreground text-background"} ${mobile ? "flex-1" : ""}`}>
          {following ? <UserCheck size={14} /> : <UserPlus size={14} />} {following ? "Following" : "Follow"}
        </button>
      )}
      {!editMode && (
        <>
          <button onClick={shareProfile} className={`${pill} border border-border ${mobile ? "flex-1" : ""}`}>
            <Share2 size={14} /> {copied ? "Copied!" : "Share"}
          </button>
          <button onClick={() => setShowQR(true)} className="w-9 h-9 rounded-lg border border-border grid place-items-center shrink-0">
            <QrCode size={16} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Banner — slim strip, Instagram-style */}
      <div className="relative h-28 sm:h-36 md:h-44 overflow-hidden bg-gradient-to-br from-violet-500/[0.15] via-foreground/[0.05] to-amber-400/[0.15]">
        {banner && <img src={banner} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
        {editMode && (
          <label className="absolute inset-0 z-30 pointer-events-none">
            <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/70 text-white text-xs font-semibold pointer-events-auto cursor-pointer active:scale-95 transition">
              {uploadingBanner ? <Loader2 size={12} className="animate-spin" /> : <><Upload size={12} /> Change banner</>}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); }} />
          </label>
        )}
      </div>

      {/* Header content — flat, Instagram-style */}
      <div className="relative z-10 px-4 md:px-8 -mt-12 md:-mt-16 pb-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          {/* Avatar */}
          <div className="relative shrink-0 mx-auto md:mx-0">
            <div className="rounded-full bg-background p-1 ring-4 ring-background inline-block shadow-lg">
              <Avatar user={{ ...profile, avatar_url: avatarUrl }} size={104} />
            </div>
            {editMode && (
              <label className="absolute bottom-1 right-1 p-2 rounded-full bg-foreground text-background cursor-pointer shadow-lg">
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </label>
            )}
          </div>

          {/* Info column */}
          <div className="flex-1 min-w-0 w-full text-center md:text-left">
            {/* Desktop: name + buttons inline */}
            <div className="hidden md:flex items-center gap-3 flex-wrap mb-3">
              {editMode ? (
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="text-xl font-bold bg-transparent border-b border-border focus:outline-none pb-1 max-w-xs"
                  placeholder="Display name"
                />
              ) : (
                <>
                  <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
                  {profile.pronouns && <span className="text-sm text-foreground/40">{profile.pronouns}</span>}
                </>
              )}
              <ActionButtons />
            </div>

            {/* Mobile: name only */}
            <div className="md:hidden">
              {editMode ? (
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="text-xl font-bold bg-transparent border-b border-border focus:outline-none pb-1 w-full max-w-xs mx-auto text-center"
                  placeholder="Display name"
                />
              ) : (
                <>
                  <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
                  {profile.pronouns && <span className="text-sm text-foreground/40 block">{profile.pronouns}</span>}
                </>
              )}
            </div>

            {/* Stats row */}
            <div className="flex justify-center md:justify-start gap-6 my-3 text-sm">
              <span><span className="font-bold">{formatNumber(stats.followers)}</span> <span className="text-foreground/50">followers</span></span>
              <span><span className="font-bold">{formatNumber(stats.following)}</span> <span className="text-foreground/50">following</span></span>
              {stats.plays > 0 && <span><span className="font-bold">{formatNumber(stats.plays)}</span> <span className="text-foreground/50">plays</span></span>}
              {stats.likes > 0 && <span><span className="font-bold">{formatNumber(stats.likes)}</span> <span className="text-foreground/50">likes</span></span>}
            </div>

            {/* Bio */}
            {editMode ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Add a bio"
                className="w-full max-w-2xl px-3 py-2 rounded-lg border border-border bg-background text-sm mx-auto md:mx-0 block"
                rows={2}
              />
            ) : (
              profile.bio && <p className="text-sm text-foreground/80 max-w-2xl leading-relaxed mx-auto md:mx-0">{profile.bio}</p>
            )}

            {/* Location + joined */}
            {!editMode && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-foreground/40 mt-2">
                {profile.location && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>}
                {profile.created_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> Joined {new Date(profile.created_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}

            {/* Social links */}
            {!editMode && (profile.website || profile.instagram || profile.twitter || profile.soundcloud) && (
              <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                {profile.website && <a href={safeUrl(profile.website)} target="_blank" rel="noreferrer" className="chip"><Globe size={12} /> Website</a>}
                {profile.instagram && <a href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="chip"><AtSign size={12} /> {profile.instagram}</a>}
                {profile.twitter && <a href={`https://twitter.com/${profile.twitter.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="chip"><AtSign size={12} /> {profile.twitter}</a>}
                {profile.soundcloud && <a href={safeUrl(profile.soundcloud)} target="_blank" rel="noreferrer" className="chip"><Music size={12} /> SoundCloud</a>}
              </div>
            )}

            {/* Mobile action buttons */}
            <div className="md:hidden mt-4">
              <ActionButtons mobile />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}