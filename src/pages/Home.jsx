import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp,
  Sparkles,
  Upload,
  Music,
  Disc,
  Loader2,
  Lightbulb } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import { getRecentPlays } from "@/lib/recentPlays";
import PullToRefresh from "@/components/PullToRefresh";

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 py-3">
        <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          {Icon && <Icon size={20} />}
          {title}
        </h2>
      </div>
      {children}
    </section>);

}

function CardGrid({ tracks, albumsMap = {} }) {
  if (!tracks?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {tracks.map((t) => {
      const al = albumsMap[t.album_id];
      return (
      <TrackCard key={t.id} track={t}
        albumCover={al?.cover_art_url}
        albumArtist={al?.artisan} />
      );
      })}
    </div>);

}

function Skeleton() {
  return (
    <div className="space-y-8">
      <div className="h-48 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      {[0, 1, 2].map((i) =>
      <div key={i}>
          <div className="h-6 w-32 bg-foreground/[0.05] rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, j) =>
          <div
            key={j}
            className="aspect-square rounded-xl bg-foreground/[0.04] animate-pulse" />

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
  const [albums, setAlbums] = useState([]);
  const [albumsMap, setAlbumsMap] = useState({});

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
      const [t, n, fols, al] = await Promise.all([
      base44.entities.Track.filter(
        { is_published: true },
        "-play_count",
        12
      ),
      base44.entities.Track.filter(
        { is_published: true },
        "-created_date",
        50
      ),
      user?.id ?
      base44.entities.Follow.
      filter({ follower_id: user.id }, "-created_date", 200).
      catch(() => []) :
      Promise.resolve([]),
      base44.entities.Album.list("-created_date", 200).catch(() => [])]
      );
      const followed = new Set(
        (Array.isArray(fols) ? fols : []).map((f) => f.following_id)
      );
      setTrending(t);
      setNewReleases(n.slice(0, 12));
      setAlbums(Array.isArray(al) ? al : []);
      setFromFollowing(
        n.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12)
      );
      const genres = ["Electronic", "Hip-Hop", "Ambient"];
      const perGenre = await Promise.all(
        genres.map((g) =>
          base44.entities.Track
            .filter({ is_published: true, genre: g }, "-play_count", 8)
            .catch(() => [])
            .then((tracks) => ({ genre: g, tracks }))
        )
      );
      setByGenre(perGenre);
      // Build the album lookup from the single batch we already fetched,
      // instead of issuing one Album.get() per track (rate-limit fix).
      const map = {};
      (Array.isArray(al) ? al : []).forEach((a) => {
        if (a?.id) map[a.id] = a;
      });
      setAlbumsMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !trending.length) return <Skeleton />;

  const allEmpty =
  !trending.length &&
  !newReleases.length &&
  !byGenre.some((s) => s.tracks.length);

  if (allEmpty) {
    return (
      <EmptyState
        icon={Music}
        title="Nothing here yet"
        description="Be the first to upload audio to the PUBLIC network."
        action={
        <Link
          to="/upload"
          className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2">
          
            <Upload size={14} /> Upload now
          </Link>
        } />);


  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-2">
        <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-violet-500/10 via-foreground/[0.02] to-amber-400/10 p-6 md:p-12 mb-10">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
              "radial-gradient(circle at 18% 22%, hsl(var(--foreground)) 0, transparent 36%), radial-gradient(circle at 82% 78%, hsl(var(--foreground)) 0, transparent 32%)"
            }} />
          
          <div className="relative flex items-center gap-3 mb-5">
            

            
            

            
          </div>
          <h1 className="relative text-4xl md:text-6xl font-extrabold tracking-tighter mb-3 max-w-2xl leading-[1.05]">
            Made by the people,<br />for the people.
          </h1>
          <p className="relative text-foreground/60 max-w-lg text-sm md:text-base">
            Welcome{user?.display_name ? `, ${user.display_name}` : ""}. Listen,
            upload, share. PUBLIC is yours.
          </p>
          <div className="relative flex items-center gap-2 mt-6 flex-wrap">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] transition">
              
              <Upload size={14} /> Upload music
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-foreground/5 transition">
              
              <Disc size={14} /> Explore genres
            </Link>
          </div>
        </div>

        <Link to="/suggestions" className="block mb-10 rounded-2xl border border-border bg-foreground/[0.02] hover:bg-foreground/[0.05] transition p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
                 Ideas & Suggestions
              </h3>
              <p className="text-sm text-foreground/60 mt-0.5">
                PUBLIC is made by the people, for the people. Tell us what should come next.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold self-start">Share an idea

            </span>
          </div>
        </Link>

        <Section title="Trending" icon={TrendingUp}>
          {CardGrid({ tracks: trending, albumsMap })}
        </Section>
        <Section title="New Releases">
          {CardGrid({ tracks: newReleases, albumsMap })}
        </Section>
        {albums.length > 0 &&
        <Section title="Albums" icon={Disc}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {albums.map((a) =>
            <Link
              key={a.id}
              to={`/album/${a.id}`}
              className="rounded-xl p-3 hover:bg-foreground/[0.03] transition">
              
                  <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                    {a.cover_art_url ?
                <img src={a.cover_art_url} alt="" className="w-full h-full object-cover" /> :

                <Disc size={28} />
                }
                  </div>
                  <div className="font-semibold truncate text-sm">{a.title}</div>
                  <div className="text-xs text-foreground/50 truncate">
                    {a.artisan || a.genre || "Album"}
                  </div>
                </Link>
            )}
            </div>
          </Section>
        }
        {fromFollowing.length > 0 &&
        <Section title="From People You Follow">
            {CardGrid({ tracks: fromFollowing, albumsMap })}
          </Section>
        }
        {recentlyPlayed.length > 0 &&
        <Section title="Recently Played">
            {CardGrid({ tracks: recentlyPlayed, albumsMap })}
          </Section>
        }
        {byGenre.
        filter((sg) => sg.tracks.length > 0).
        map((sg) =>
        <Section key={sg.genre} title={sg.genre}>
              {CardGrid({ tracks: sg.tracks, albumsMap })}
            </Section>
        )}
      </div>
    </PullToRefresh>);

}