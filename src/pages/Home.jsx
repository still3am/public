import FollowingReleases from "@/components/home/FollowingReleases";
import {useDismissedRecommendations} from "@/hooks/useDismissedRecommendations";
import ScrollShelf from "@/components/ScrollShelf";
import HomeWeather from '@/components/HomeWeather';
import MadeForYou from '@/components/home/MadeForYou';
import SharedWithYou from '@/components/home/SharedWithYou';
import HomeSpotlight from "@/components/HomeSpotlight";
import { readAllPages } from "@/lib/readPages";
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
  ChevronRight } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
import Avatar from "@/components/Avatar";
import ReleaseList from "@/components/ReleaseList";
import { usePlayer } from "@/context/PlayerContext";
import LoadError from "@/components/LoadError";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import { getUserMusicPreferences, clearUserGenresCache } from "@/lib/userGenres";
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
function CardRow({ tracks, onHide = null, hideBusy = false }) {
  if (!tracks?.length) return null;
  return (
    <ScrollShelf label="Recommended music" className="home-card-shelf flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
      {tracks.map((t) =>
      <div key={t.id} className="home-shelf-card snap-start shrink-0">
          <TrackCard track={t} queue={tracks} />
          {onHide&&<button type="button" disabled={hideBusy} className="recommendation-hide" aria-label={"Hide recommendation "+t.title} onClick={()=>onHide(t)}>Not for me</button>}
        </div>
      )}
    </ScrollShelf>);

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
  const dismissed=useDismissedRecommendations(user?.id);
  const loadVersion = useRef(0);
  const followedIds = useRef({ uid: user?.id, ids: new Set() });
  const [recent, setRecent] = useState(() => getRecentPlays().slice(0, 8));
  const [genreList, setGenreList] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [preferencesError,setPreferencesError]=useState(false);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState(() => [...peekPublishedTracks()].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 10));
  const [newReleases, setNewReleases] = useState(() => peekPublishedTracks().slice(0, 36));
  const [byGenre, setByGenre] = useState([]);
  const [fromFollowing, setFromFollowing] = useState([]);
  const [discover, setDiscover] = useState([]);

  const [personal,setPersonal]=useState({uid:null,catalog:[],genres:[],taste:null});
  const personalCatalog=personal.uid===user?.id?personal.catalog:[];
  const personalGenres=personal.uid===user?.id?personal.genres:[];
  const greeting = greetingByHour();

  useEffect(()=>{const update=event=>{if(event.detail?.uid===user?.id)load().catch(()=>{});};window.addEventListener("preferences:changed",update);return()=>window.removeEventListener("preferences:changed",update);},[user?.id]);

  const onUnpublished = useCallback((id) => {
    setRecent(previous=>previous.filter(track=>track.id!==id));
    setPersonal(previous=>({...previous,catalog:previous.catalog.filter(t=>t.id!==id)}));
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
    setLoadError("");setPreferencesError(false);
    try {
      // The complete catalogue, newest first and ranked by plays, read once and
      // shared with the other discovery screens.
      const [topTracks, published, fols] = await Promise.all([
      getTopTracks(fresh),
      getPublishedTracks(fresh),
      user?.id ?
      readAllPages((opts) => base44.entities.Follow.filter({ follower_id: user.id }, { sort: "-created_date", ...opts })).catch(() => null) :
      Promise.resolve([])]
      );
      if (request !== loadVersion.current) return;
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(topTracks.slice(0, 10));
      setNewReleases(published.slice(0, 36));
      // Every published track by the people you follow, not just the newest page.
      if (fols !== null) {followedIds.current = { uid: user?.id, ids: followed };setFromFollowing(published.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));}
      // Top genres = the ones users actually listen to most, measured by
      // aggregated play_count across the most-played tracks on the platform.
      const genrePlays = {};
      for (const tr of topTracks) {
        if (!tr?.genre) continue;
        genrePlays[tr.genre] = (genrePlays[tr.genre] || 0) + (tr.play_count || 0);
      }
      setGenreList(Object.entries(genrePlays).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name));
      const genres = Object.entries(genrePlays).
      sort((a, b) => b[1] - a[1]).
      slice(0, 6).
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
      const taste = await getUserMusicPreferences(user?.id).catch(()=>{if(request===loadVersion.current)setPreferencesError(true);return {genres:[],favorite_track_ids:[],favorite_artists:[]};});
      const savedGenres=taste.genres;
      if (request !== loadVersion.current) return;
      setPersonal({uid:user?.id,catalog:published,genres:savedGenres,taste});
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
    } catch {if (request === loadVersion.current) {
      const available=peekPublishedTracks();
      if(available.length){setNewReleases(available.slice(0,36));setTrending([...available].sort((a,b)=>(b.play_count||0)-(a.play_count||0)).slice(0,10));}
      setLoadError("Music could not refresh. Please try again shortly.");
    }} finally {
      if (request === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {setFromFollowing([]);setDiscover([]);setRecent(getRecentPlays().slice(0, 8));clearUserGenresCache();load();return () => {loadVersion.current++;};}, [user?.id]);
  useEffect(() => {
    const update = (event) => {
      const change = event.detail;if (!change || change.uid !== user?.id) return;
      if (followedIds.current.uid !== user.id) followedIds.current = { uid: user.id, ids: new Set() };
      const followed = followedIds.current.ids;
      if (change.following) followed.add(change.followingId);else followed.delete(change.followingId);
      setFromFollowing(peekPublishedTracks().filter((track) => followed.has(track.uploader_id)).slice(0, 12));
    };
    window.addEventListener('follows:changed', update);return () => window.removeEventListener('follows:changed', update);
  }, [user?.id]);
  useEffect(() => {const update = () => setRecent(getRecentPlays().slice(0, 8));window.addEventListener("recentplays:change", update);return () => window.removeEventListener("recentplays:change", update);}, []);

  if (loadError && !trending.length && !newReleases.length) return <LoadError message={loadError} onRetry={() => load(true)} />;
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

  const featured = newReleases[0] || trending[0] || byGenre.find((section) => section.tracks.length)?.tracks[0];
  const visibleDiscover=discover.filter(track=>!dismissed.ids.has(track.id));
  const discoveryQueue = (visibleDiscover.length ? visibleDiscover : trending.filter(track=>!dismissed.ids.has(track.id)));
  return (
    <PullToRefresh onRefresh={() => load(true)}>
      <div className="home-page home-redesigned">
        <header className="home-welcome"><div><p className="home-welcome-greeting">{greeting}</p><h1>Home</h1></div><div className="home-header-actions"><HomeWeather/><Link to={user?"/profile":"/login"} aria-label={user?"Your profile":"Sign in"}><Avatar user={user} size={44}/></Link></div></header>
        
        
        {(loadError||preferencesError)&&<div role="alert" className="border border-border rounded-2xl p-4 mb-4 text-sm"><p>{loadError||"Your music preferences could not load. Discovery is using your listening history for now."}</p><button disabled={loading} className="playlist-action mt-2" onClick={()=>load(true)}>Retry</button></div>}
        <HomeSpotlight track={featured} tracks={discoveryQueue.length ? discoveryQueue : newReleases} currentTrackId={p.currentTrack?.id} isPlaying={p.isPlaying} onSelect={(queue,index)=>{if(p.currentTrack?.id===queue[index]?.id)p.togglePlay();else{p.setShuffle(false);p.playTrackAt(queue,index);}}/>
        
        
        {genreList.length > 0 && <nav className="home-genre-links" aria-label="Browse genres">{genreList.map((genre) => <Link key={genre} to={`/search?genre=${encodeURIComponent(genre)}`}>{genre}</Link>)}</nav>}
        <Section title="New on PUBLIC" icon={Sparkles} seeAllTo="/recent"><ReleaseList tracks={newReleases} /></Section>
        <MadeForYou key={"mixes:"+user?.id} catalog={personalCatalog} genres={personalGenres} taste={personal.uid===user?.id?personal.taste:null}/>
        {recent.length>0&&<Section title="Continue Listening"><CardRow tracks={recent}/></Section>}
        <FollowingReleases/>
        <Section title="Trending" icon={TrendingUp} seeAllTo="/top">
          <CardRow tracks={trending} />
        </Section>

        {(visibleDiscover.length > 0||dismissed.last||dismissed.error) &&
        <Section title="Discover" icon={Sparkles}>
            <CardRow tracks={visibleDiscover} onHide={user?.id?dismissed.hide:null} hideBusy={dismissed.busy}/>
            {dismissed.last&&<p className="text-sm mt-3" role="status">Recommendation hidden. <button className="underline" disabled={dismissed.busy} onClick={dismissed.undo}>Undo</button></p>}
            {dismissed.error&&<p role="alert" className="text-sm mt-3">{dismissed.error} <button className="underline" onClick={dismissed.retry}>Retry</button></p>}
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
        <SharedWithYou key={"shared:"+user?.id} catalog={personalCatalog} catalogReady={personal.uid===user?.id}/>
      </div>
    </PullToRefresh>);

}