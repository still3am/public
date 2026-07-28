import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import PullToRefresh from "@/components/PullToRefresh";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/components/ui/use-toast";
import { formatTime } from "@/lib/audio-utils";
import {
  Loader2,
  Music,
  Mic2,
  Sparkles,
  Globe,
  Calendar,
  Users,
  MapPin,
  BarChart2,
  FileText,
  Play,
  Pause,
  ExternalLink,
  Disc3,
} from "lucide-react";

const splitNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

function Stamp({ children, tone = "pending" }) {
  const tones = {
    pending: "border-foreground/25 text-foreground/45",
    filed: "border-foreground/50 text-foreground/70",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rotate-[-3deg] border-2 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] font-bold shrink-0 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({ no, title, right }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-foreground/[0.03]">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45">
        Section {no}
      </span>
      <span className="font-mono text-[10px] text-foreground/30">/</span>
      <span className="text-xs font-bold uppercase tracking-wide text-foreground/70">{title}</span>
      <span className="ml-auto flex items-center gap-2">{right}</span>
    </div>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className="flex items-start gap-4 px-5 md:px-10 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45 w-28 sm:w-32 shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-foreground/85 min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

function DocButton({ children, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wide transition active:scale-95 disabled:opacity-50 border ${
        primary
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent text-foreground/70 border-border hover:bg-foreground/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

function DiscographyRow({ track, index }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlaying = isCurrent && p.isPlaying;
  const pad = String(index + 1).padStart(2, "0");
  return (
    <div className="group flex items-center gap-3 px-3 md:px-5 py-2.5 border-b border-dashed border-border/60 last:border-0 hover:bg-foreground/[0.025] transition">
      <button
        onClick={() => p.playTrackAt([track])}
        className="w-7 shrink-0 grid place-items-center"
        aria-label="Play track"
      >
        {isCurrent ? (
          isPlaying ? <Pause size={14} className="text-foreground" /> : <Play size={14} className="text-foreground" />
        ) : (
          <>
            <span className="font-mono text-[11px] tabular-nums text-foreground/45 group-hover:hidden">{pad}</span>
            <Play size={13} className="hidden group-hover:block text-foreground/55" />
          </>
        )}
      </button>
      <Link to={`/track/${track.id}`} className="min-w-0 flex-1">
        <div className={`text-sm font-semibold truncate ${isCurrent ? "text-foreground" : "text-foreground/90"}`}>
          {track.title}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-foreground/40 truncate">
          {track.genre || "Unfiled"} · {formatTime(track.duration_seconds)}
        </div>
      </Link>
      <div className="font-mono text-[11px] tabular-nums text-foreground/50 text-right shrink-0 w-16 sm:w-24">
        {track.play_count || 0}
        <span className="hidden sm:inline text-foreground/35"> plays</span>
      </div>
      <div className="hidden md:block font-mono text-[11px] tabular-nums text-foreground/40 w-12 text-right shrink-0">
        {formatTime(track.duration_seconds)}
      </div>
    </div>
  );
}

export default function PublicRecords({ id: propId }) {
  const { id: paramId } = useParams();
  const id = propId || paramId;
  const { toast } = useToast();
  const p = usePlayer();
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
        const all = await base44.entities.Track
          .filter({ is_published: true }, "-play_count", 500)
          .catch(() => []);
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
        setArtist((prev) => (prev ? { ...prev, history_text: history } : prev));
        toast({ title: "Summary added to file" });
      } else {
        toast({ title: "Couldn't generate history", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e?.response?.data?.error || "Couldn't generate history",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  const totalPlays = useMemo(
    () => tracks.reduce((s, t) => s + (t.play_count || 0), 0),
    [tracks]
  );

  if (loading) {
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-14 h-14 rounded border-2 border-foreground/20 grid place-items-center mx-auto mb-4">
          <FileText size={24} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1 font-mono">FILE NOT FOUND</h2>
        <p className="text-sm text-foreground/50">This Public Record doesn’t exist or was removed.</p>
      </div>
    );
  }

  const fileNo = String(artist.id || "000000").slice(-6).toUpperCase();
  const filed = !!artist.history_text;
  const updated = artist.updated_date
    ? new Date(artist.updated_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
    : "—";

  const socials = [
    artist.website && { href: artist.website, label: "Website" },
    artist.spotify_url && { href: artist.spotify_url, label: "Spotify" },
    artist.soundcloud_url && { href: artist.soundcloud_url, label: "SoundCloud" },
    artist.instagram && {
      href: `https://instagram.com/${artist.instagram.replace(/^@/, "")}`,
      label: artist.instagram,
    },
  ].filter(Boolean);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-3xl mx-auto pb-16">
        <BackHeader title="Public Records" />

        {/* File document */}
        <article className="border border-border rounded-2xl overflow-hidden bg-card mb-6 shadow-sm">
          {/* file header bar */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-foreground/[0.04]">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
              <FileText size={12} /> Public Records
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/40 truncate">
              File No. {fileNo}
            </div>
          </div>

          {/* subject */}
          <div className="p-5 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40 mb-2">
                  Subject — Artist
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.02] break-words">
                  {artist.name}
                </h1>
              </div>
              <Stamp tone={filed ? "filed" : "pending"}>
                {filed ? "On File" : "Pending"}
              </Stamp>
            </div>

            <div className="flex flex-wrap gap-2">
              {tracks.length > 0 && (
                <DocButton primary onClick={() => p.playTrackAt(tracks)}>
                  <Play size={13} className="fill-current" /> Play file
                </DocButton>
              )}
              <DocButton onClick={generateHistory} disabled={generating}>
                {generating ? (
                  <><Loader2 size={13} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={13} /> {filed ? "Regenerate summary" : "Generate summary"}</>
                )}
              </DocButton>
            </div>
          </div>

          {/* metadata */}
          <div className="border-t border-border">
            <dl className="divide-y divide-border/60">
              {artist.location && <MetaRow label="Origin"><span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-foreground/40" />{artist.location}</span></MetaRow>}
              {artist.formed_year && <MetaRow label="Active since"><span className="inline-flex items-center gap-1.5"><Calendar size={12} className="text-foreground/40" />{artist.formed_year}</span></MetaRow>}
              {artist.members && <MetaRow label="Members"><span className="inline-flex items-center gap-1.5"><Users size={12} className="text-foreground/40" />{artist.members}</span></MetaRow>}
              {artist.bio && <MetaRow label="Bio">{artist.bio}</MetaRow>}
              {socials.length > 0 && (
                <MetaRow label="Links">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {socials.map((s, i) => (
                      <a
                        key={i}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground underline underline-offset-2"
                      >
                        {s.label} <ExternalLink size={10} className="text-foreground/40" />
                      </a>
                    ))}
                  </div>
                </MetaRow>
              )}
              <MetaRow label="Last revised"><span className="font-mono text-xs text-foreground/65">{updated}</span></MetaRow>
            </dl>
          </div>

          {/* vital statistics */}
          <div className="grid grid-cols-3 border-t border-border">
            {[
              { icon: Music, value: tracks.length, label: "Tracks" },
              { icon: BarChart2, value: totalPlays, label: "Plays" },
              { icon: Users, value: artist.members ? artist.members.split(/[,&]/).length : "—", label: "Members" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`p-4 text-center ${i < 2 ? "border-r border-border" : ""}`}
              >
                <s.icon size={14} className="mx-auto text-foreground/35 mb-1.5" />
                <div className="text-xl font-extrabold tracking-tight tabular-nums font-mono leading-none">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/40 mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Section 01 — Historical Summary */}
        <section className="border border-border rounded-2xl overflow-hidden bg-card mb-6 shadow-sm">
          <SectionHeader no="01" title="Historical Summary" right={
            <span className="font-mono text-[9px] uppercase tracking-wider text-foreground/35">Prepared by PUBLIC.AI</span>
          } />
          <div className="p-5 md:p-8">
            {filed ? (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{artist.history_text}</p>
            ) : (
              <div className="text-center py-4">
                <div className="w-11 h-11 rounded border-2 border-dashed border-foreground/25 grid place-items-center mx-auto mb-3">
                  <Sparkles size={16} className="text-foreground/40" />
                </div>
                <p className="text-sm text-foreground/55 max-w-sm mx-auto leading-relaxed">
                  No summary on file. Tap “Generate summary” and PUBLIC’s AI will research this
                  artist and file an encyclopedia-style entry.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section 02 — Discography */}
        <section className="border border-border rounded-2xl overflow-hidden bg-card mb-6 shadow-sm">
          <SectionHeader
            no="02"
            title="Discography"
            right={
              <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/45 bg-foreground/[0.06] rounded px-2 py-0.5">
                {tracks.length} entries
              </span>
            }
          />
          {tracks.length === 0 ? (
            <div className="py-10 text-center px-6">
              <Disc3 size={22} className="text-foreground/35 mx-auto mb-2" />
              <p className="text-sm text-foreground/50">No published tracks linked to this file.</p>
            </div>
          ) : (
            <div>
              {tracks.map((t, i) => (
                <DiscographyRow key={t.id} track={t} index={i} />
              ))}
            </div>
          )}
        </section>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/30">
          End of file · {fileNo}
        </p>
      </div>
    </PullToRefresh>
  );
}