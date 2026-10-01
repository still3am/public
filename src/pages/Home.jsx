import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCatalogCount, getPublishedTracks } from "@/lib/catalogCache";
import { byGenre as genreShelf, byNewest, shuffleList, topGenres } from "@/lib/catalogSlices";
import { useFollow } from "@/context/FollowContext";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import { useAuth } from "@/lib/AuthContext";
import {
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
import { buildForYouMix } from "@/lib/forYou";
import { getOnRepeat } from "@/lib/playCounts";
import ForYouMix from "@/components/home/ForYouMix";
import PullToRefresh from "@/components/PullToRefresh";
import HeroPlayingTint from "@/components/HeroPlayingTint";

function Section({ title, children, seeAllTo }) {
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

// Only needed when the app-wide follow graph isn't loaded yet — otherwise Home
// reuses that shared copy and adds no read of its own.
function readFollowRows(userId) {
  if (!userId) return Promise.resolve([]);
  return base44.entities.Follow.
  filter({ follower_id: userId }, "-created_date", 200).
  catch(() => []);
}

export default function Home() {
  const { user } = useAuth();
  const { follows, ready: followsReady } = useFollow();
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [byGenre, setByGenre] = useState([]);
  const [fromFollowing, setFromFollowing] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [forYou, setForYou] = useState([]);
  const [onRepeat, setOnRepeat] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const loadedRef = useRef(false);

  const onUnpublished = useCallback((id) => {
    setTrending((p) => p.filter((t) => t.id !== id));
    setNewReleases((p) => p.filter((t) => t.id !== id));
    setFromFollowing((p) => p.filter((t) => t.id !== id));
    setDiscover((p) => p.filter((t) => t.id !== id));
    setByGenre((p) => p.map((s) => ({ ...s, tracks: s.tracks.filter((t) => t.id !== id) })));
    setForYou((p) => p.filter((t) => t.id !== id));
    setOnRepeat((p) => p.filter((t) => t.id !== id));
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
      // Two reads for the whole screen: the platform's true top ranked by
      // plays, and the shared cached catalog every shelf below is sliced from.
      // A query per genre row was the app's heaviest burst of entity traffic.
      const [top, catalog] = await Promise.all([
      base44.entities.Track.filter({ is_published: true }, "-play_count", 100).catch(() => []),
      getPublishedTracks()]
      );
      setTrending(top.slice(0, 10));

      const rows = catalog.length ? catalog : top;
      setNewReleases(byNewest(rows, 36));

      // The follow graph is already held app-wide, so Home only reads it if
      // that shared copy hasn't landed yet.
      const fols = followsReady ? follows : await readFollowRows(user?.id);
      const followed = new Set(
        (fols || []).
        filter((f) => (f.target_type || "user") === "user").
        map((f) => f.following_id)
      );
      setFromFollowing(byNewest(rows.filter((tk) => followed.has(tk.uploader_id)), 12));

      // Counted server-side — downloading every record just to measure the
      // catalog was slow and got silently truncated by the query limit.
      const published = await getCatalogCount();
      if (typeof published === "number") {
        setTotalTracks(published);
        loadedRef.current = true;
      }

      // Top genres = the ones users actually listen to most, measured by
      // aggregated play_count across the most-played tracks on the platform.
      const finalGenres = topGenres(top.length ? top : rows, 3);
      setByGenre(finalGenres.map((g) => ({ genre: g, tracks: genreShelf(rows, g, 8) })));

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
      // Merge saved genre picks with listening history — saved genres seed
      // personalization, recent plays refine it over time.
      const savedGenres = await getUserGenres();
      const genreSet = new Set(savedGenres);
      const userGenres = Object.entries(genreFreq).
      sort((a, b) => b[1] - a[1]).
      map(([g]) => g).
      filter((g) => !genreSet.has(g));
      const allUserGenres = [...savedGenres, ...userGenres].slice(0, 5);
      let discoverPicks = [];
      if (allUserGenres.length) {
        const pool = shuffleList(
          allUserGenres.flatMap((g) => byNewest(rows.filter((t) => t.genre === g), 30))
        ).filter((tr) => tr && !playedIds.has(tr.id));
        discoverPicks = pool.slice(0, 12);
      } else {
        discoverPicks = byNewest(rows, 60).
        filter((tr) => tr && !playedIds.has(tr.id)).
        slice(0, 12);
      }
      setDiscover(discoverPicks);

      // The personalized mix, plus the shelf of songs this device has actually
      // repeated — both read from local state, so they cost no extra queries.
      setOnRepeat(getOnRepeat(12));
      const mix = await buildForYouMix(user, 14, {
        follows: fols,
        savedGenres,
        catalog: rows
      }).catch(() => []);
      setForYou(mix);
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
            

            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-3 max-w-2xl leading-[1.02]">
              {user?.display_name || user?.full_name ? `Hey, ${user.display_name || user.full_name}.` : "Welcome to PUBLIC."}
            </h1>
            <p className="text-foreground/55 max-w-md text-sm md:text-base mb-5 mx-auto">
              Listen, upload, and share — a space for sound, made by the people, for the people.
            </p>
            <div className="mb-7">
              <ScoreboardTrackCount count={totalTracks} />
            </div>
            










            
          </div>
        </div>

        <ForYouMix tracks={forYou} />

        <Section title="Trending" seeAllTo="/top">
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
        <Section title="Discover">
            <CardRow tracks={discover} />
          </Section>
        }
        {fromFollowing.length > 0 &&
        <Section title="From People You Follow">
            <CardRow tracks={fromFollowing} />
          </Section>
        }
        {onRepeat.length > 0 &&
        <Section title="On Repeat">
            <CardRow tracks={onRepeat} />
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