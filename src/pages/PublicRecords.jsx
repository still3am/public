import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import TrackCard from "@/components/TrackCard";
import PullToRefresh from "@/components/PullToRefresh";
import ArtistNameEditor from "@/components/ArtistNameEditor";
import ArtistColorTint from "@/components/ArtistColorTint";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Music,
  Mic2,
  Sparkles,
  Globe,
  Calendar,
  Users,
  MapPin,
  Disc3,
  Headphones,
  Play,
  ExternalLink } from
"lucide-react";

const splitNames = (str) =>
(str || "").
split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i).
map((s) => s.trim().toLowerCase()).
filter(Boolean);

function safeUrl(u) {
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ?
    parsed.href :
    undefined;
  } catch {
    return undefined;
  }
}

const mkSocial = (url, icon, label) => {
  const href = safeUrl(url);
  return href ? { href, icon, label } : null;
};

function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/55 bg-foreground/[0.05] rounded-full px-2.5 py-1">
      {Icon && <Icon size={12} />}
      <span className="truncate max-w-[160px]">{children}</span>
    </span>);

}

function SocialChip({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground bg-foreground/[0.05] hover:bg-foreground/[0.09] rounded-full px-3 py-1.5 transition active:scale-95">
      
      <Icon size={13} /> {label}
      <ExternalLink size={10} className="text-foreground/35" />
    </a>);

}

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
        <Icon size={17} className="text-foreground/60" />
        {children}
      </h2>
      {right}
    </div>);

}

export default function PublicRecords({ id: propId }) {
  const { id: paramId } = useParams();
  const id = propId || paramId;
  const { toast } = useToast();
  const p = usePlayer();
  const { user } = useAuth();
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const a = await base44.entities.Artist.get(id).catch(() => null);
      setArtist(a);
      if (a?.name) {
        const all = await base44.entities.Track.
        filter({ is_published: true }, "-created_date", 10000).
        catch(() => []);
        const names = splitNames(a.name);
        const matched = (Array.isArray(all) ? all : []).filter((t) =>
        splitNames(t.artist).some((n) => names.includes(n))
        );
        setTracks(matched);
      } else {
        setTracks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function generateHistory() {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateArtistHistory", { artist_id: id });
      const history = res?.data?.history;
      if (history) {
        setArtist((prev) => prev ? { ...prev, history_text: history } : prev);
        toast({ title: "Artist history generated" });
      } else {
        toast({ title: "Couldn't generate history", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e?.response?.data?.error || "Couldn't generate history",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/40" />
      </div>);

  }

  if (!artist) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
          <Mic2 size={28} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1">Artist not found</h2>
        <p className="text-sm text-foreground/50">This Public Record doesn’t exist or was removed.</p>
      </div>);

  }

  const socials = [
  mkSocial(artist.website, Globe, "Website"),
  mkSocial(artist.spotify_url, Disc3, "Spotify"),
  mkSocial(artist.soundcloud_url, Headphones, "SoundCloud"),
  artist.instagram && {
    href: `https://instagram.com/${artist.instagram.replace(/^@/, "")}`,
    icon: Globe,
    label: artist.instagram
  }].
  filter(Boolean);

  const meta = [
  artist.location && { icon: MapPin, label: artist.location },
  artist.formed_year && { icon: Calendar, label: artist.formed_year },
  artist.members && { icon: Users, label: artist.members }].
  filter(Boolean);

  const topCover = [...tracks].
  sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).
  find((t) => t.cover_art_url)?.cover_art_url;

  const isAdmin = !!user && user.role === "admin";
  const playAll = () => p.playTrackAt(tracks);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-4xl mx-auto pb-16">
        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden border border-border bg-card mb-6">
          <div className="relative h-36 md:h-52">
            {artist.cover_art_url ?
            <img
              src={artist.cover_art_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" /> :


            <div className="absolute inset-0 bg-gradient-to-br from-foreground/20 via-foreground/[0.07] to-transparent" />
            }
            <ArtistColorTint coverUrl={topCover} />
            
          </div>

          <div className="relative px-5 md:px-10 pb-6 md:pb-8 flex flex-col items-center text-center -mt-16 md:-mt-20">
            <div className="flex-1 min-w-0">
              <ArtistNameEditor
                artist={artist}
                canEdit={!!user}
                onSaved={(name) => setArtist((prev) => prev ? { ...prev, name } : prev)} />
              {meta.length > 0 &&
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                  {meta.map((m, i) =>
                <Pill key={i} icon={m.icon}>{m.label}</Pill>
                )}
                </div>
              }
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                {tracks.length > 0 &&
                <button
                  onClick={playAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold active:scale-95 transition shadow-sm">
                  
                    <Play size={13} className="fill-current" /> Play all
                  </button>
                }
                {isAdmin && (generating ?
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground/[0.06] text-foreground/60 text-xs font-semibold">
                    <Loader2 size={13} className="animate-spin" /> Generating…
                  </span> :

                <button
                  onClick={generateHistory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/70 text-xs font-semibold active:scale-95 transition">
                  
                    <Sparkles size={13} /> {artist.history_text ? "Regenerate history" : "Generate history"}
                  </button>)
                }
              </div>
            </div>
          </div>

          {(artist.bio || socials.length > 0) &&
          <div className="px-5 md:px-10 pb-6 md:pb-8 border-t border-border/60 pt-5 flex flex-col md:flex-row gap-4 md:items-center">
              {artist.bio &&
            <p className="text-sm text-foreground/70 leading-relaxed flex-1 min-w-0">
                  {artist.bio}
                </p>
            }
              {socials.length > 0 &&
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                  {socials.map((s, i) =>
              <SocialChip key={i} href={s.href} icon={s.icon} label={s.label} />
              )}
                </div>
            }
            </div>
          }
        </section>

        {/* History (AI) */}
        <section className="mb-8">
          <SectionTitle icon={Sparkles}>
            History
          </SectionTitle>
          <div className="rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.04] to-transparent p-5 md:p-6">
            {artist.history_text ?
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {artist.history_text}
              </p> :

            <div className="text-center py-4">
                <div className="w-11 h-11 rounded-full bg-foreground/[0.06] grid place-items-center mx-auto mb-3">
                  <Sparkles size={18} className="text-foreground/40" />
                </div>
                <p className="text-sm text-foreground/55 max-w-sm mx-auto leading-relaxed">
                  No history yet. Tap “Generate history” and PUBLIC’s AI will research this
                  artist and write an encyclopedia-style summary.
                </p>
              </div>
            }
          </div>
        </section>

        {/* Discography */}
        <section className="mb-12">
          <SectionTitle icon={Disc3} right={
          <span className="text-xs font-semibold text-foreground/40 bg-foreground/[0.05] rounded-full px-2.5 py-1">
              {tracks.length}
            </span>
          }>
            Discography
          </SectionTitle>
          {tracks.length === 0 ?
          <div className="rounded-2xl border border-dashed border-border py-10 text-center px-6">
              <Music size={22} className="text-foreground/35 mx-auto mb-2" />
              <p className="text-sm text-foreground/50">No published tracks linked to this artist yet.</p>
            </div> :

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {tracks.map((t) =>
            <TrackCard key={t.id} track={t} />
            )}
            </div>
          }
        </section>
      </div>
    </PullToRefresh>);

}