import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks, getTopTracks, peekPublishedTracks } from "@/lib/catalogCache";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp,
  Sparkles,
  Music,
  Upload,
  Play,
  Pause,
  Compass,
  ListMusic,
  ChevronRight } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
import Podium from "@/components/Podium";
import ReleaseList from "@/components/ReleaseList";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import { getUserGenres, clearUserGenresCache } from "@/lib/userGenres";
import PullToRefresh from "@/components/PullToRefresh";

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/** @param {any} props */
function Section({ title, icon: Icon, children, seeAllTo }) {
  return (
    <section className="home-section mb-10 md:mb-12">
      <div className="flex items-end justify-between mb-4 px-1 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2.5">
          
          {Icon && <Icon size={17} className="text-muted-foreground" />}{title}
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
  const p = usePlayer();
  const loadVersion = useRef(0);
  const [recent, setRecent] = useState(() => getRecentPlays().slice(0, 8));
  const [genreList, setGenreList] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState(() => [...peekPublishedTracks()].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 10));
  const [newReleases, setNewReleases] = useState(() => peekPublishedTracks().slice(0, 36));
  const [byGenre, setByGenre] = useState([]);
  const [fromFollowing, setFromFollowing] = useState([]);
  const [discover, setDiscover] = useState([]);

  const greeting = greetingByHour();

  const onUnpublished = useCallback((id) => {
    setTrending((p) => p.filter((t) => t.id !== id));
    setNewReleases((p) => p.filter((t) => t.id !== id));
    setFromFollowing((p) => p.filter((t) => t.id !== id));
    setDiscover((p) => p.filter((t) => t.id !== id));
    setByGenre((p) => p.map((s) => ({ ...s, tracks: s.tracks.filter((t) => t.id !== id) })));

  }, []);
  useUnpublishedSync(onUnpublished);

  useEffect(() => {const handler = () => load(true).catch(() => {});window.addEventListener('catalog:invalidate', handler);return () => window.removeEventListener('catalog:invalidate', handler);}, [user?.id]);

  async function load(fresh = false) {
    const request = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      // The complete catalogue, newest first and ranked by plays, read once and
      // shared with the other discovery screens.
      const [topTracks, published, fols] = await Promise.all([
      getTopTracks(fresh),
      getPublishedTracks(fresh),
      user?.id ?
      base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => []) :
      Promise.resolve([])]
      );
      if (request !== loadVersion.current) return;
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(topTracks.slice(0, 10));
      setNewReleases(published.slice(0, 36));
      // Every published track by the people you follow, not just the newest page.
      setFromFollowing(published.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));
      // Top genres = the ones users actually listen to most, measured by
      // aggregated play_count across the most-played tracks on the platform.
      const genrePlays = {};
      for (const tr of topTracks) {
        if (!tr?.genre) continue;
        genrePlays[tr.genre] = (genrePlays[tr.genre] || 0) + (tr.play_count || 0);
      }
      setGenreList(Object.entries(genrePlays).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name));
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
      if (request !== loadVersion.current) return;
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
    } catch {if (request === loadVersion.current) setLoadError("The music catalog could not load. Check your connection and retry.");} finally {
      if (request === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {clearUserGenresCache();load();return () => {loadVersion.current++;};}, [user?.id]);
  useEffect(() => {const update = () => setRecent(getRecentPlays().slice(0, 8));window.addEventListener("recentplays:change", update);return () => window.removeEventListener("recentplays:change", update);}, []);

  if (loadError && !trending.length) return <div className="p-8 text-center"><button className="playlist-action" onClick={() => load(true)}>Refresh music</button></div>;
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

  const featured = newReleases[0] || trending[0];
  const discoveryQueue = discover.length ? discover : trending;
  const featuredPlaying = p.currentTrack?.id === featured?.id && p.isPlaying;
  const playFeatured = () => {if (!featured) return;if (p.currentTrack?.id === featured.id) p.togglePlay();else {p.setShuffle(false);p.playTrackAt(newReleases.length ? newReleases : [featured], 0);}};
  return (
    <PullToRefresh onRefresh={() => load(true)}>
      <div className="home-page">
        <header className="home-welcome"><div><p className="eyebrow">{greeting}</p><h1>{user?.display_name || user?.full_name ? `Made for ${user.display_name || user.full_name}.` : "Find your sound."}</h1></div><Link to="/search" className="home-browse-link" aria-label="Explore music"><Compass size={17} /><span>Explore music</span><ChevronRight size={14} /></Link></header>
        <section className="home-feature">
          <div className="home-feature-copy"><p className="eyebrow">Independent music. Open to everyone.</p><h2>Your next favorite<br />starts here.</h2><p>Fresh releases, familiar favorites, and music worth sharing.</p><div className="home-feature-actions"><button disabled={!discoveryQueue.length} onClick={() => {p.setShuffle(false);p.playTrackAt(discoveryQueue, 0);}} className="chrome-button"><Play size={15} fill="currentColor" />Play discovery</button><Link className="playlist-action" to="/recent">Latest music<ChevronRight size={14} /></Link></div></div>
          {featured && <div className="home-spotlight"><div className="home-spotlight-art">{featured.cover_art_url ? <Image src={featured.cover_art_url} fittingType="fill" alt="" className="w-full h-full" /> : <Music size={42} />}<button className="home-spotlight-play" onClick={playFeatured} aria-label={featuredPlaying ? `Pause ${featured.title}` : `Play ${featured.title}`}>{featuredPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button><div className="home-spotlight-menu"><TrackOptionsMenu track={featured} /></div></div><div className="home-spotlight-meta"><div><p className="eyebrow">Featured release</p><Link to={`/track/${featured.id}`} className="font-semibold text-sm block truncate mt-1">{featured.title}</Link><p className="text-xs text-muted-foreground truncate mt-1">{featured.artist || featured.uploader_name}</p></div></div></div>}
        </section>
        <nav className="home-shortcuts hidden" aria-label="Explore PUBLIC"><Link to="/library"><ListMusic size={17} /><span>Your library</span><ChevronRight size={14} /></Link><Link to="/top"><TrendingUp size={17} /><span>Top tracks</span><ChevronRight size={14} /></Link><Link to="/upload"><Upload size={17} /><span>Share music</span><ChevronRight size={14} /></Link></nav>
        {genreList.length > 0 && <div className="home-genre-rail" aria-label="Browse genres">{genreList.map((genre) => <Link key={genre} className="chip hidden" to={`/search?genre=${encodeURIComponent(genre)}`}>{genre}</Link>)}</div>}
        <Section title="New on PUBLIC" icon={Sparkles} seeAllTo="/recent"><ReleaseList tracks={newReleases} /></Section>
        {recent.length > 0 && <Section title="Recently played"><CardRow tracks={recent} /></Section>}
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