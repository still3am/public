import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import EditTrackModal from "@/components/EditTrackModal";
import ArtistLinks from "@/components/ArtistLinks";
import {
  Loader2,
  Play,
  Pause,
  Download,
  Flag,
  Pencil,
  Music2,
  Share2,
  Music,
  Plus,
  Trash2,
  Sparkles,
  Wand2 } from
"lucide-react";
import TrackRow from "@/components/TrackRow";
import GenerateLyricsModal from "@/components/GenerateLyricsModal";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";

export default function TrackDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploader, setUploader] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [moreTracks, setMoreTracks] = useState([]);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cache = useOfflineCache();
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Track.get(id).catch(() => null);
      setTrack(t);
      if (t?.uploader_id) {
        const u = await base44.entities.User.
        get(t.uploader_id).
        catch(() => null);
        setUploader(u);
      }
      if (t?.artist) {
        const splitNames = (str) =>
        (str || "").
        split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i).
        map((s) => s.trim().toLowerCase()).
        filter(Boolean);
        const names = splitNames(t.artist);
        const all = await base44.entities.Track.list("-play_count", 100).catch(
          () => []
        );
        setMoreTracks(
          all.
          filter(
            (x) =>
            x.id !== t.id &&
            x.is_published === true &&
            splitNames(x.artist).some((n) => names.includes(n))
          ).
          slice(0, 6)
        );
      } else {
        setMoreTracks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function shareLink() {
    if (!track) return;
    navigator.clipboard?.
    writeText(`${window.location.origin}/track/${track.id}`).
    then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      setMenuOpen(false);
    });
  }

  async function nativeShare() {
    if (!track) return;
    const url = `${window.location.origin}/track/${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} on PUBLIC.`, url });
      } catch {}
    } else {
      shareLink();
    }
    setMenuOpen(false);
  }

  async function report() {
    const reason = window.prompt("What's wrong with this track?");
    if (!reason || !track) return;
    setReporting(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        track_id: track.id,
        reason
      });
      alert("Thanks — a report was sent to the PUBLIC admin team.");
    } catch {
      alert("Could not submit report. Try again later.");
    } finally {
      setReporting(false);
      setMenuOpen(false);
    }
  }

  async function detectGenre() {
    if (!track) return;
    setMenuOpen(false);
    setDetecting(true);
    try {
      const res = await base44.functions.invoke("detectGenre", { track_id: track.id });
      const genre = res?.data?.genre;
      if (genre) {
        setTrack((prev) => ({ ...prev, genre }));
        toast({ title: `Genre set to ${genre}` });
      } else {
        toast({ title: "Couldn't detect genre", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e?.response?.data?.error || "Couldn't detect genre", variant: "destructive" });
    } finally {
      setDetecting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }
  if (!track) return <EmptyState title="Track not found" />;

  const isCurrent = p.currentTrack?.id === track.id;
  const isOwner = track.uploader_id === user?.id;
  const isPlaying = isCurrent && p.isPlaying;
  const displayArtist = track.artist || "";

  const menuItems = [];

  menuItems.push({
    icon: cache.downloading[track.id] ? Loader2 : cache.isCached(track.id) ? Trash2 : Download,
    label: cache.downloading[track.id] ?
    "Saving…" :
    cache.isCached(track.id) ?
    "Remove offline" :
    "Save offline",
    onClick: async () => {
      setMenuOpen(false);
      if (cache.isCached(track.id)) {
        await cache.removeTrack(track.id);
        toast({ title: "Removed from downloads" });
      } else {
        const ok = await cache.downloadTrack(track);
        toast(
          ok ?
          { title: "Saved for offline" } :
          { title: "Couldn't save offline", variant: "destructive" }
        );
      }
    }
  });
  if (navigator.share)
  menuItems.push({ icon: Share2, label: "Share", onClick: nativeShare });
  if (track.is_downloadable)
  menuItems.push({
    icon: Download,
    label: "Download",
    onClick: () => {
      if (track.audio_url && /^https?:\/\//i.test(track.audio_url)) window.open(track.audio_url, "_blank");
      setMenuOpen(false);
    }
  });
  if (isOwner)
  menuItems.push({
    icon: Pencil,
    label: "Edit track",
    onClick: () => {
      setEditing(true);
      setMenuOpen(false);
    }
  });
  if (isOwner)
  menuItems.push({
    icon: detecting ? Loader2 : Wand2,
    label: detecting ? "Detecting genre…" : "Detect genre (AI)",
    onClick: detectGenre
  });
  if (isOwner && track.audio_url)
  menuItems.push({
    icon: Sparkles,
    label: track.lyrics_text?.trim() ? "Regenerate lyrics" : "Generate lyrics",
    onClick: () => {
      setGenerating(true);
      setMenuOpen(false);
    }
  });
  if (!isOwner)
  menuItems.push({
    icon: Flag,
    label: "Report",
    danger: true,
    onClick: report
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-border mb-6 md:mb-8">
        {track.cover_art_url &&
        <div className="absolute inset-0">
            <img
            src={track.cover_art_url}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-125 opacity-30" />
          
            <div className="absolute inset-0 bg-background/70" />
          </div>
        }
        <div className="relative p-6 md:p-10 flex flex-col items-center text-center gap-5">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-foreground/10 shrink-0 shadow-lg ring-1 ring-foreground/10">
            {track.cover_art_url &&
            <img
              src={track.cover_art_url}
              alt=""
              className="w-full h-full object-cover" />
            }
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-center w-full">
            <span className="self-center text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-semibold mb-2.5 border border-border rounded-full px-3 py-1">
              {track.genre}
            </span>
            <div className="flex items-center gap-2 flex-wrap mb-1.5 justify-center">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-[1.05]">
                {track.title}
              </h1>
              {track.explicit &&
              <span className="px-1.5 py-0.5 rounded bg-foreground/15 text-[10px] font-extrabold">
                  E
                </span>
              }
            </div>
            {(displayArtist || uploader) &&
            <div className="text-sm text-foreground/60 mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {displayArtist &&
              <ArtistLinks
                artist={displayArtist}
                linkClassName="font-semibold text-foreground/80 px-1 hover:underline" />
              }
                

              
                {uploader &&
              <Link
                to={`/profile/${uploader.id}`}
                className="hover:underline inline-flex items-center gap-1.5">
                
                    {uploader.avatar_url ?
                <img
                  src={uploader.avatar_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover" /> :


                <div className="w-5 h-5 rounded-full bg-foreground/10 grid place-items-center text-[9px] font-semibold">
                        {(uploader.display_name || uploader.full_name || uploader.email || "?").charAt(0)}
                      </div>
                }
                    {uploader.display_name || uploader.full_name || "Unknown"}
                  </Link>
              }
              </div>
            }
            

            
            {track.description &&
            <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {track.description}
              </p>
            }
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => isCurrent ? p.togglePlay() : p.playTrackAt([track])}
          className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition">
          
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause" : "Play"}
        </button>












        
        <div className="relative shrink-0 ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center hover:scale-105 transition"
            aria-label="More actions">
            
            <Plus
              size={18}
              className={menuOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            
          </button>
          {menuOpen &&
          <>
              <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)} />
            
              <div className="absolute right-0 top-full z-20 mt-1 bg-popover border border-border rounded-xl shadow-2xl py-1 min-w-[210px]">
                {menuItems.map((m, i) => {
                const Icon = m.icon;
                return (
                  <button
                    key={i}
                    onClick={m.onClick}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-foreground/[0.04] text-left ${
                    m.danger ? "text-destructive" : ""}`
                    }>
                    
                      <Icon size={15} /> {m.label}
                    </button>);

              })}
              </div>
            </>
          }
        </div>
      </div>

      {track.lyrics_text && track.lyrics_text.trim() &&
      <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
             Lyrics
          </h2>
          <div className="whitespace-pre-line text-sm text-foreground/70 leading-relaxed max-h-96 overflow-y-auto px-1">
            {track.lyrics_text}
          </div>
          {isOwner && track.audio_url &&
        <button
          onClick={() => setGenerating(true)}
          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-foreground/60 hover:text-foreground">
             Regenerate with AI
          </button>}
        </div>
      }

      {isOwner && !track.lyrics_text?.trim() && track.audio_url &&
      <div className="mb-6 rounded-2xl border border-dashed border-border p-5 text-center">
          <Sparkles size={20} className="mx-auto text-foreground/40 mb-2" />
          <p className="text-sm text-foreground/60 mb-3">No lyrics yet. Let AI transcribe them from this track's audio.</p>
          <button
          onClick={() => setGenerating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
            <Sparkles size={14} /> Generate lyrics
          </button>
        </div>
      }

      {moreTracks.length > 0 &&
      <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
             More from {track.artist}
          </h2>
          <div className="space-y-0.5">
            {moreTracks.map((t, i) =>
          <TrackRow
            key={t.id}
            track={t}
            index={i} />

          )}
          </div>
        </div>
      }

      {editing &&
      <EditTrackModal
        track={track}
        onClose={() => setEditing(false)}
        onSaved={(updated) => setTrack((prev) => ({ ...prev, ...updated }))}
        onDeleted={() => nav("/profile", { replace: true })} />

      }

      {generating &&
      <GenerateLyricsModal
        track={track}
        onClose={() => setGenerating(false)}
        onSaved={(updated) => {
          setTrack((prev) => ({ ...prev, ...updated }));
          setGenerating(false);
        }} />

      }
    </div>);

}