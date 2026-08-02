import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
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
import Podium from "@/components/Podium";
import ReleaseList from "@/components/ReleaseList";
import ScoreboardTrackCount from "@/components/ScoreboardTrackCount";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import PullToRefresh from "@/components/PullToRefresh";
import HeroPlayingTint from "@/components/HeroPlayingTint";

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
  const [discover, setDiscover] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const loadedRef = useRef(false);
  const greeting = greetingByHour();

  const onUnpublished = useCallback((id) => {
    setTrending((p) => p.filter((t) => t.id !== id));
    setNewReleases((p) => p.filter((t) => t.id !== id));
    setFromFollowing((p) => p.filter((t) => t.id !== id));
    setDiscover((p) => p.filter((t) => t.id !== id));
    setByGenre((p) => p.map((s) => ({ ...s, tracks: s.tracks.filter((t) => t.id !== id) })));
    setTotalTracks((c) => Math.max(0, c - 1));
  }, []);
  useUnpublishedSync(onUnpublished);

  useEffect(() => {
    const unsub = base44.entities.Track.subscribe((event) => {
      if (!loadedRef.current) return;
      setTotalTracks((c) => {
        if (event.type === "create" && event.data?.is_published !== false) return c + 1;
        if (event.type === "delete") return Math.max(0, c - 1);
        if (event.type === "update") {
          if (event.data?.is_published === false && c > 0) return c - 1;
          if (event.data?.is_published === true) return c + 1;
        }
        return c;
      });
    });
    return unsub;
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, n, fols, topForGenres] = await Promise.all([
      base44.entities.Track.filter({ is_published: true }, "-play_count", 10),
      base44.entities.Track.filter({ is_published: true }, "-created_date", 50),
      user?.id ?
      base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => []) :
      Promise.resolve([]),
      base44.entities.Track.filter({ is_published: true }, "-play_count", 200).catch(() => [])]
      );
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(t);
      setNewReleases(n.slice(0, 20));
      setFromFollowing(n.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));
      // Counted server-side — downloading every record just to measure the
      // catalog was slow and got silently truncated by the query limit.
      const counted = await base44.functions.invoke("trackCount", {}).catch(() => null);
      const published = counted?.data?.published;
      if (typeof published === "number") {
        setTotalTracks(published);
        loadedRef.current = true;
      }
      // Top genres = the ones users actually listen to most, measured by
      // aggregated play_count across the most-played tracks on the platform.
      const genrePlays = {};
      for (const tr of topForGenres) {
        if (!tr?.genre) continue;
        genrePlays[tr.genre] = (genrePlays[tr.genre] || 0) + (tr.play_count || 0);
      }
      const genres = Object.entries(genrePlays)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g)
        .filter(Boolean);
      const fallback = ["Electronic", "Hip-Hop", "Ambient"];
      const finalGenres = genres.length ? genres : fallback;
      const perGenre = await Promise.all(
        finalGenres.map(async (g) => ({
          genre: g,
          tracks: await base44.entities.Track.filter({ is_published: true, genre: g }, "-play_count", 8)
        }))
      );
      setByGenre(perGenre);

      // Discover: new tracks in the genres this user actually plays, excluding
      // what they've already heard. Falls back to fresh uploads when there's
      // no listening history yet.
      const played = getRecentPlays();
      const playedIds = new Set(played.map((p) => p.id));
      const genreFreq = {};
      for (const p of played) {
        if (!p?.genre) continue;
        genreFreq[p.genre] = (genreFreq[p.genre] || 0) + 1;
      }
      const userGenres = Object.entries(genreFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g);
      let discoverPicks = [];
      if (userGenres.length) {
        const perUserGenre = await Promise.all(
          userGenres.map((g) =>
            base44.entities.Track.filter({ is_published: true, genre: g }, "-created_date", 30).catch(() => [])
          )
        );
        const pool = perUserGenre.flat().filter((tr) => tr && !playedIds.has(tr.id));
        // Shuffle so the row isn't grouped by genre, then take the freshest.
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        discoverPicks = pool.slice(0, 12);
      } else {
        discoverPicks = n.filter((tr) => tr && !playedIds.has(tr.id)).slice(0, 12);
      }
      setDiscover(discoverPicks);
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
          <HeroPlayingTint />
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

        <Section title="Trending" icon={TrendingUp} seeAllTo="/top">
          {trending.length >= 3 ? (
            <>
              <Podium tracks={trending.slice(0, 5)} />
              {trending.length > 5 && (
                <div className="mt-4">
                  <CardRow tracks={trending.slice(5)} />
                </div>
              )}
            </>
          ) : (
            <CardRow tracks={trending} />
          )}
        </Section>
        <Section title="New on PUBLIC" seeAllTo="/recent">
          <ReleaseList tracks={newReleases} />
        </Section>

        {discover.length > 0 &&
        <Section title="Discover" icon={Sparkles}>
            <CardRow tracks={discover} />
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