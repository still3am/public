import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import TrackRow from "@/components/TrackRow";
import PullToRefresh from "@/components/PullToRefresh";
import { Image } from "@/components/ui/image";
import { usePlayer } from "@/context/PlayerContext";
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
  BarChart2,
  Disc3,
  Headphones,
  Play,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const splitNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3 gap-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
        {children}
      </div>
      {right}
    </div>
  );
}

function Stamp({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/70 border-2 border-foreground/55 rounded-sm px-2 py-1 -rotate-3 ${className}`}
    >
      {children}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/40 truncate">
        {label}
      </dt>
      <dd className="text-foreground/85 mt-0.5 text-sm truncate">{value || "—"}</dd>
    </div>
  );
}

function SocialRef({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/60 hover:text-foreground bg-foreground/[0.04] hover:bg-foreground/[0.08] rounded-sm px-2.5 py-1.5 transition active:scale-95 border border-border/60"
    >
      <Icon size={12} /> {label}
      <ExternalLink size={9} className="text-foreground/30" />
    </a>
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
        toast({ title: "History compiled" });
      } else {
        toast({ title: "Couldn't compile history", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e?.response?.data?.error || "Couldn't compile history",
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
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
          <Mic2 size={28} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1">File not found</h2>
        <p className="text-sm text-foreground/50">This Public Record doesn’t exist or was removed.</p>
      </div>
    );
  }

  const socials = [
    artist.website && { href: artist.website, icon: Globe, label: "Website" },
    artist.spotify_url && { href: artist.spotify_url, icon: Disc3, label: "Spotify" },
    artist.soundcloud_url && { href: artist.soundcloud_url, icon: Headphones, label: "SoundCloud" },
    artist.instagram && {
      href: `https://instagram.com/${artist.instagram.replace(/^@/, "")}`,
      icon: Globe,
      label: artist.instagram,
    },
  ].filter(Boolean);

  const fileNo = `PR-${String(id || "").slice(0, 6).toUpperCase()}`;
  const filedOn = artist.created_date ? moment(artist.created_date).format("YYYY.MM.DD") : "—";

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-4xl mx-auto pb-16">
        <BackHeader title="Public Records" />

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Letterhead */}
          <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-3 border-b border-border bg-foreground/[0.025]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full border-2 border-foreground/35 grid place-items-center text-foreground/40 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/65 truncate">
                  Public Records Bureau
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/35 truncate">
                  Subject File · Open Record
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/45 shrink-0">
              File No. <span className="text-foreground/70">{fileNo}</span>
              <div className="text-foreground/35 normal-case tracking-normal text-[10px]">Filed {filedOn}</div>
            </div>
          </div>

          {/* Subject profile */}
          <div className="p-5 md:p-6 grid md:grid-cols-[auto_1fr] gap-5 items-start border-b border-border">
            <div className="relative shrink-0 mx-auto md:mx-0">
              <div className="w-24 h-28 rounded-sm overflow-hidden border border-border bg-foreground/[0.05] grid place-items-center shadow-sm">
                {artist.avatar_url ? (
                  <Image src={artist.avatar_url} alt="" fittingType="fill" className="w-full h-full" />
                ) : (
                  <Mic2 size={26} className="text-foreground/30" />
                )}
              </div>
              <span className="absolute -top-1.5 left-2 font-mono text-[8px] uppercase tracking-[0.15em] text-foreground/40 bg-card px-1">
                Photo
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/40 mb-1">
                    Name of Subject
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight break-words">
                    {artist.name}
                  </h1>
                </div>
                <Stamp>On File</Stamp>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                <Field label="Location" value={artist.location} />
                <Field label="Active since" value={artist.formed_year} />
                <Field label="Members" value={artist.members} />
                <Field label="Known works" value={tracks.length} />
              </dl>

              {artist.bio && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/40 mb-1">
                    Subject narrative
                  </div>
                  <p className="text-sm text-foreground/75 leading-relaxed">{artist.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* External references + actions */}
          {(socials.length > 0 || tracks.length > 0) && (
            <div className="px-5 md:px-6 py-4 flex flex-wrap items-center gap-2 border-b border-border">
              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:mr-auto">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40 mr-1 hidden md:inline">
                    External references
                  </span>
                  {socials.map((s, i) => (
                    <SocialRef key={i} href={s.href} icon={s.icon} label={s.label} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                {tracks.length > 0 && (
                  <button
                    onClick={() => p.playTrackAt(tracks)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-foreground text-background text-[11px] font-bold active:scale-95 transition shadow-sm"
                  >
                    <Play size={12} className="fill-current" /> Play all works
                  </button>
                )}
                <button
                  onClick={generateHistory}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-foreground/30 hover:bg-foreground/[0.05] text-foreground/75 text-[11px] font-semibold active:scale-95 transition disabled:opacity-50"
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {generating ? "Compiling…" : artist.history_text ? "Recompile history" : "Compile history"}
                </button>
              </div>
            </div>
          )}

          {/* File summary (ledger) */}
          <div className="grid grid-cols-3 gap-px bg-border border-b border-border">
            {[
              { label: "Recorded works", value: tracks.length, icon: Music },
              { label: "Total plays", value: totalPlays, icon: BarChart2 },
              { label: "Members", value: artist.members || "—", icon: Users },
            ].map((s) => (
              <div key={s.label} className="bg-card p-4 text-center">
                <s.icon size={13} className="text-foreground/35 mx-auto mb-1" />
                <div className="text-xl font-extrabold tracking-tight tabular-nums leading-none truncate">
                  {s.value}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/40 mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* History narrative */}
          <section className="p-5 md:p-6 border-b border-border">
            <SectionLabel
              right={artist.history_text ? <Stamp><Sparkles size={9} /> AI-Compiled</Stamp> : null}
            >
              History · Narrative
            </SectionLabel>
            {artist.history_text ? (
              <div className="border-l-2 border-foreground/15 pl-4">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {artist.history_text}
                </p>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="w-11 h-11 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-3">
                  <Sparkles size={18} className="text-foreground/40" />
                </div>
                <p className="text-sm text-foreground/55 max-w-sm mx-auto leading-relaxed">
                  No narrative on file. Tap “Compile history” and PUBLIC’s AI will research this
                  subject and assemble an encyclopedia-style record.
                </p>
              </div>
            )}
          </section>

          {/* Recorded works ledger */}
          <section className="p-5 md:p-6 border-b border-border">
            <SectionLabel
              right={
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/40">
                  {tracks.length} entries
                </span>
              }
            >
              Recorded Works
            </SectionLabel>
            {tracks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center px-6">
                <Disc3 size={20} className="text-foreground/35 mx-auto mb-2" />
                <p className="text-sm text-foreground/50">No published works on record.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-background/40 overflow-hidden">
                {tracks.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={i}
                    className={i !== tracks.length - 1 ? "border-b border-border/50" : ""}
                  />
                ))}
              </div>
            )}
          </section>

          {/* File footer */}
          <div className="px-5 md:px-6 py-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/35">
            <span>End of file</span>
            <Stamp>Public Record</Stamp>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}