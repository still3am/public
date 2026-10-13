import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCatalogCount, getPublishedTracks, getTopTracks } from "@/lib/catalogCache";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp,
  Sparkles,
  Music,
  Upload,
  ChevronRight } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
import Podium from "@/components/Podium";
import ReleaseList from "@/components/ReleaseList";
import ScoreboardTrackCount from "@/components/ScoreboardTrackCount";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import { getUserGenres } from "@/lib/userGenres";
import PullToRefresh from "@/components/PullToRefresh";
import HeroPlayingTint from "@/components/HeroPlayingTint";

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/** @param {any} props */
function Section({ title, icon: Icon, children, seeAllTo }) {
  return (
    <section className="mb-10 md:mb-12">
      <div className="flex items-end justify-between mb-4 px-1 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2.5">
          
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

/** @param {any} props */
function CardRow({ tracks }) {
  if (!tracks?.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-5 sm:px-5 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:gap-4">
      {tracks.map((t) =>
      <div key={t.id} className="snap-start shrink-0 w-[46vw] max-w-[210px] sm:w-[200px] md:w-auto">
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
  const [loadError, setLoadError] = useState("");
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

  }, []);
  useUnpublishedSync(onUnpublished);

  useEffect(() => {const handler = () => load().catch(() => {});window.addEventListener('catalog:invalidate', handler);return () => window.removeEventListener('catalog:invalidate', handler);}, [user?.id]);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      // The complete catalogue, newest first and ranked by plays, read once and
      // shared with the other discovery screens.
      const [topTracks, published, fols] = await Promise.all([
      getTopTracks(true),
      getPublishedTracks(true),
      user?.id ?
      base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => []) :
      Promise.resolve([])]
      );
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(topTracks.slice(0, 10));
      setNewReleases(published.slice(0, 36));
      // Every published track by the people you follow, not just the newest page.
      setFromFollowing(published.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));
      // The hero total is counted server-side, so it stays exact and costs one
      // call instead of another pass over the catalogue.
      const publishedCount = await getCatalogCount(true);
      if (typeof publishedCount === "number") {
        setTotalTracks(publishedCount);
        loadedRef.current = true;
      }
      // Top genres = the ones users actually listen to most, measured by
      // aggregated play_count across the most-played tracks on the platform.
      const genrePlays = {};
      for (const tr of topTracks) {
        if (!tr?.genre) continue;
        genrePlays[tr.genre] = (genrePlays[tr.genre] || 0) + (tr.play_count || 0);
      }
      const genres = Object.entries(genrePlays).
      sort((a, b) => b[1] - a[1]).
      slice(0, 3).
      map(([g]) => g).
      filter(Boolean);
      const fallback = ["Electronic", "Hip-Hop", "Ambient"];
      const finalGenres = genres.length ? genres : fallback;
      // Top tracks per genre, taken from the ranked catalogue itself.
      setByGenre(
        finalGenres.map((g) => ({
          genre: g,
          tracks: topTracks.filter((tr) => tr.genre === g).slice(0, 8)
        }))
      );

      // Discover: tracks in the genres this user actually plays, excluding what
      // they've already heard. Falls back to the newest uploads when there's no
      // listening history yet.
      const played = getRecentPlays();
      const playedIds = new Set(played.map((p) => p.id));
      const genreFreq = {};
      for (const p of played) {
        if (!p?.genre) continue;
        genreFreq[p.genre] = (genreFreq[p.genre] || 0) + 1;
      }
      // Merge saved genre picks with listening history — saved genres seed
      // personalization, recent plays refine it over time.
      const savedGenres = await getUserGenres();
      const genreSet = new Set(savedGenres);
      const userGenres = Object.entries(genreFreq).
      sort((a, b) => b[1] - a[1]).
      map(([g]) => g).
      filter((g) => !genreSet.has(g));
      const allUserGenres = [...savedGenres, ...userGenres].slice(0, 5);
      // Drawn from the whole catalogue — the genres this user plays, minus what
      // they've already heard — shuffled so the row isn't grouped by genre.
      const pool = published.filter(
        (tr) => tr && !playedIds.has(tr.id) && (!allUserGenres.length || allUserGenres.includes(tr.genre))
      );
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setDiscover(pool.slice(0, 12));
    } catch {setLoadError("The music catalog could not load. Check your connection and retry.");} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loadError && !trending.length) return <div className="p-8 text-center space-y-4"><p role="alert">{loadError}</p><button className="border p-3 rounded-xl" onClick={load}>Retry</button></div>;
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
      <div>
        {/* Hero */}
        <div className="home-hero relative rounded-3xl overflow-hidden border border-border/60 p-6 sm:p-9 md:p-12 mb-9 md:mb-12 text-left flex flex-col items-start">
          <div className="opacity-40"><HeroPlayingTint /></div>
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
              "radial-gradient(circle at 15% 15%, hsl(var(--foreground)) 0, transparent 40%), radial-gradient(circle at 85% 85%, hsl(var(--foreground)) 0, transparent 38%)"
            }} />
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02] pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-foreground/[0.06] blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-20 w-64 h-64 rounded-full bg-foreground/[0.04] blur-3xl pointer-events-none" />

          <div className="relative w-full">
            
            

            
            <h1 className="text-[36px] sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 max-w-2xl leading-[1.08] break-words text-left">
              {user?.display_name || user?.full_name ? `Hey, ${user.display_name || user.full_name}.` : "Welcome to PUBLIC."}
            </h1>
            <p className="text-muted-foreground max-w-md text-sm md:text-base leading-relaxed mb-6 text-left">
              Independent music. Open to everyone. Find your next favorite sound.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-1">
              
              <ScoreboardTrackCount count={totalTracks} />
            </div>
            










            
          </div>
        </div>

        <nav aria-label="Explore music genres" className="discovery-genres">
          <Link to="/search" className="chip active">All sounds</Link>
          {byGenre.filter(s=>s.tracks.length).map(s=><Link key={s.genre} to={`/search?genre=${encodeURIComponent(s.genre)}`} className="chip">{s.genre}</Link>)}
          <Link to="/recent" className="chip">Fresh releases</Link>
          <Link to="/library" className="chip">Your collection</Link>
        </nav>
        <Section title="Trending" icon={TrendingUp} seeAllTo="/top">
          {trending.length >= 3 ?
          <>
              <Podium tracks={trending.slice(0, 5)} />
              {trending.length > 5 &&
            <div className="mt-4">
                  <CardRow tracks={trending.slice(5)} />
                </div>
            }
            </> :

          <CardRow tracks={trending} />
          }
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
        <Section key={sg.genre} title={sg.genre} seeAllTo={`/search?genre=${encodeURIComponent(sg.genre)}`}>
              <CardRow tracks={sg.tracks} />
            </Section>
        )}
      </div>
    </PullToRefresh>);

}