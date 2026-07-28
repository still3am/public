import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import EmptyState from "@/components/EmptyState";
import TrackRow from "@/components/TrackRow";
import PullToRefresh from "@/components/PullToRefresh";
import { Image } from "@/components/ui/image";
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
  BarChart2 } from
"lucide-react";

const splitNames = (str) =>
(str || "").
split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i).
map((s) => s.trim().toLowerCase()).
filter(Boolean);

export default function PublicRecords({ id: propId }) {
  const { id: paramId } = useParams();
  const id = propId || paramId;
  const { toast } = useToast();
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
        filter({ is_published: true }, "-play_count", 500).
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
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }
  if (!artist) return <EmptyState title="Artist not found" icon={Mic2} />;

  const totalPlays = tracks.reduce((s, t) => s + (t.play_count || 0), 0);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-4xl mx-auto">
        <BackHeader title="Public Records" />

        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden border border-border mb-8 bg-card">
          {artist.cover_art_url &&
          <div className="absolute inset-0">
              <img src={artist.cover_art_url} alt="" className="w-full h-full object-cover blur-2xl scale-125 opacity-30" />
              <div className="absolute inset-0 bg-background/70" />
            </div>
          }
          <div className="relative p-6 md:p-10 flex flex-col md:flex-row gap-5 md:gap-8 items-center md:items-end text-center md:text-left">
            





            
            <div className="flex-1 min-w-0">
              

              
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-tight">
                {artist.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-foreground/50 mt-2">
                {artist.location &&
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {artist.location}</span>
                }
                {artist.formed_year &&
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> {artist.formed_year}</span>
                }
                {artist.members &&
                <span className="inline-flex items-center gap-1"><Users size={12} /> {artist.members}</span>
                }
              </div>
              {artist.bio &&
              <p className="text-sm text-foreground/70 mt-3 leading-relaxed max-w-2xl mx-auto md:mx-0">
                  {artist.bio}
                </p>
              }
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {artist.website &&
                <a href={artist.website} target="_blank" rel="noreferrer" className="chip"><Globe size={12} /> Website</a>
                }
                {artist.spotify_url &&
                <a href={artist.spotify_url} target="_blank" rel="noreferrer" className="chip">Spotify</a>
                }
                {artist.soundcloud_url &&
                <a href={artist.soundcloud_url} target="_blank" rel="noreferrer" className="chip">SoundCloud</a>
                }
                {artist.instagram &&
                <a href={`https://instagram.com/${artist.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="chip">
                    {artist.instagram}
                  </a>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        











        

        {/* History (AI) */}
        <div className="mb-8 rounded-2xl border border-border bg-foreground/[0.02] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <Sparkles size={18} /> History
            </h2>
            <button
              onClick={generateHistory}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold disabled:opacity-50 active:scale-95 transition">
              
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ?
              "Generating…" :
              artist.history_text ?
              "Regenerate history" :
              "Generate history"}
            </button>
          </div>
          {artist.history_text ?
          <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
              {artist.history_text}
            </p> :

          <p className="text-sm text-foreground/50 leading-relaxed">
              No history yet. Tap “Generate history” and PUBLIC’s AI will research this
              artist and write an encyclopedia-style summary.
            </p>
          }
        </div>

        {/* Discography */}
        <div className="mb-12">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Music size={18} /> Discography
          </h2>
          {tracks.length === 0 ?
          <EmptyState
            icon={Music}
            title="No tracks yet"
            description="No published tracks are linked to this artist." /> :


          <div className="space-y-0.5">
              {tracks.map((t, i) =>
            <TrackRow key={t.id} track={t} index={i} />
            )}
            </div>
          }
        </div>
      </div>
    </PullToRefresh>);

}