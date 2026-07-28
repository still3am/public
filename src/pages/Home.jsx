import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp,
  Sparkles,
  Music,
  Disc,
  Upload,
  Lightbulb,
  ChevronRight } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
import ScoreboardTrackCount from "@/components/ScoreboardTrackCount";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import PullToRefresh from "@/components/PullToRefresh";

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

function Section({ title, icon: Icon, children, seeAllTo }) {
  return (
    <section className="mb-10 md:mb-12">
      <div className="flex items-end justify-between mb-3.5 px-3 md:px-0">
        <h2 className="text-lg md:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
          



          
          {title}
        </h2>
        {seeAllTo &&
        <Link to={seeAllTo} className="text-xs font-semibold text-foreground/50 hover:text-foreground transition shrink-0 inline-flex items-center gap-0.5">
            See all <ChevronRight size={13} />
          </Link>
        }
      </div>
      {children}
    </section>);

}

function CardRow({ tracks }) {
  if (!tracks?.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-3 px-3 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:gap-4">
      {tracks.map((t) =>
      <div key={t.id} className="snap-start shrink-0 w-[60vw] max-w-[210px] sm:w-[200px] md:w-auto">
          <TrackCard track={t} />
        </div>
      )}
    </div>);

}

function Skeleton() {
  return (
    <div className="space-y-10">
      <div className="h-52 rounded-3xl bg-foreground/[0.03] animate-pulse" />
      {[0, 1, 2].map((i) =>
      <div key={i}>
          <div className="h-7 w-32 bg-foreground/[0.05] rounded mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, j) =>
          <div
            key={j}
            className="aspect-square w-[180px] md:w-[calc(20%-1rem)] rounded-xl bg-foreground/[0.04] animate-pulse shrink-0" />

          )}
          </div>
        </div>
      )}
    </div>);

}

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [byGenre, setByGenre] = useState([]);
  const [fromFollowing, setFromFollowing] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const greeting = greetingByHour();

  useEffect(() => {
    const unsub = base44.entities.Track.subscribe((event) => {
      setTotalTracks((c) => {
        if (event.type === "create" && event.data?.is_published !== false) return c + 1;
        if (event.type === "delete") return Math.max(0, c - 1);
        if (event.type === "update") {
          if (event.data?.is_published === false) return Math.max(0, c - 1);
          if (event.data?.is_published === true) return c + 1;
        }
        return c;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = () => setRecentlyPlayed(getRecentPlays());
    handler();
    window.addEventListener("recentplays:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("recentplays:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, n, fols] = await Promise.all([
      base44.entities.Track.filter({ is_published: true }, "-play_count", 12),
      base44.entities.Track.filter({ is_published: true }, "-created_date", 50),
      user?.id ?
      base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => []) :
      Promise.resolve([])]
      );
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(t);
      setNewReleases(n.slice(0, 12));
      setFromFollowing(n.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));
      const counted = await base44.entities.Track.filter({ is_published: true }, "-created_date", 1000).catch(() => []);
      setTotalTracks(Array.isArray(counted) ? counted.length : 0);
      const genres = ["Electronic", "Hip-Hop", "Ambient"];
      const perGenre = await Promise.all(
        genres.map(async (g) => ({
          genre: g,
          tracks: await base44.entities.Track.filter({ is_published: true, genre: g }, "-play_count", 8)
        }))
      );
      setByGenre(perGenre);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !trending.length) return <Skeleton />;

  const allEmpty =
  !trending.length && !newReleases.length && !byGenre.some((s) => s.tracks.length);

  if (allEmpty) {
    return (
      <EmptyState
        icon={Music}
        title="Nothing here yet"
        description="Be the first to upload audio to the PUBLIC network."
        action={
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold active:scale-95 transition">
            <Upload size={15} /> Upload music
          </Link>
        } />);



  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-3">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden border border-foreground/[0.06] p-7 md:p-14 mb-8 md:mb-10 text-center flex flex-col items-center">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
              "radial-gradient(circle at 15% 15%, hsl(var(--foreground)) 0, transparent 40%), radial-gradient(circle at 85% 85%, hsl(var(--foreground)) 0, transparent 38%)"
            }} />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-amber-400/8 pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-violet-500/12 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-20 w-64 h-64 rounded-full bg-amber-400/12 blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground/[0.05] border border-foreground/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60 mb-6">
               {greeting}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-3 max-w-2xl leading-[1.02]">
              {user?.display_name ? `Hey, ${user.display_name}.` : "Welcome to PUBLIC."}
            </h1>
            <p className="text-foreground/55 max-w-md text-sm md:text-base mb-5 mx-auto">
              Listen, upload, and share — a space for sound, made by the people, for the people.
            </p>
            <div className="mb-7">
              <ScoreboardTrackCount count={totalTracks} />
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-95 transition">
                <Upload size={15} /> Upload music
              </Link>
              <Link
                to="/top"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-foreground/15 text-sm font-semibold hover:bg-foreground/5 active:scale-95 transition">
                <Disc size={15} /> Top charts
              </Link>
            </div>
          </div>
        </div>

        {/* Suggestions banner */}
        <Link
          to="/suggestions"
          className="group block mb-10 md:mb-12 mx-3 md:mx-0 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04] transition p-4 md:p-5">
          <div className="flex items-center gap-4">
            

            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-extrabold tracking-tight">Ideas & Suggestions</h3>
              <p className="text-xs md:text-sm text-foreground/55 truncate">
                Tell us what should come next on PUBLIC.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shrink-0 group-hover:gap-2 transition-all">
              Share <ChevronRight size={14} />
            </span>
          </div>
        </Link>

        <Section title="Trending" icon={TrendingUp} seeAllTo="/top">
          <CardRow tracks={trending} />
        </Section>
        <Section title="New Releases" seeAllTo="/recent">
          <CardRow tracks={newReleases} />
        </Section>

        {recentlyPlayed.length > 0 &&
        <Section title="Recently Played">
            <CardRow tracks={recentlyPlayed} />
          </Section>
        }
        {fromFollowing.length > 0 &&
        <Section title="From People You Follow">
            <CardRow tracks={fromFollowing} />
          </Section>
        }
        {byGenre.
        filter((sg) => sg.tracks.length > 0).
        map((sg) =>
        <Section key={sg.genre} title={sg.genre} seeAllTo="/top">
              <CardRow tracks={sg.tracks} />
            </Section>
        )}
      </div>
    </PullToRefresh>);

}