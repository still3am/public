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
  Lightbulb,
  ChevronRight } from
"lucide-react";
import TrackCard from "@/components/TrackCard";
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
    <section className="mb-9">
      <div className="flex items-end justify-between mb-3 px-3">
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-2.5">
          {Icon &&
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-foreground/[0.06] text-foreground/70 hidden">
              <Icon size={15} />
            </span>
          }
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
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0">
      {tracks.map((t) =>
      <div key={t.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] sm:w-[180px] md:w-auto">
          <TrackCard track={t} />
        </div>
      )}
    </div>);

}

function Skeleton() {
  return (
    <div className="space-y-8">
      <div className="h-48 rounded-3xl bg-foreground/[0.03] animate-pulse" />
      {[0, 1, 2].map((i) =>
      <div key={i}>
          <div className="h-6 w-32 bg-foreground/[0.05] rounded mb-4" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, j) =>
          <div
            key={j}
            className="aspect-square w-[180px] rounded-xl bg-foreground/[0.04] animate-pulse shrink-0" />

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
  const greeting = greetingByHour();

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
      base44.entities.Track.filter({ is_published: true }, "-play_count", 12),
      base44.entities.Track.filter({ is_published: true }, "-created_date", 50),
      user?.id ?
      base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 200).catch(() => []) :
      Promise.resolve([]),
      base44.entities.Album.list("-created_date", 20).catch(() => [])]
      );
      const followed = new Set((Array.isArray(fols) ? fols : []).map((f) => f.following_id));
      setTrending(t);
      setNewReleases(n.slice(0, 12));
      setAlbums(Array.isArray(al) ? al : []);
      setFromFollowing(n.filter((tk) => followed.has(tk.uploader_id)).slice(0, 12));
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
          className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2">
            <Upload size={14} /> Upload now
          </Link>
        } />);


  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-3">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden border border-foreground/[0.06] bg-foreground/[0.02] p-6 md:p-10 mb-8">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
              "radial-gradient(circle at 15% 20%, hsl(var(--foreground)) 0, transparent 40%), radial-gradient(circle at 85% 85%, hsl(var(--foreground)) 0, transparent 35%)"
            }} />
          
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-16 w-52 h-52 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/[0.05] border border-foreground/[0.06] text-[11px] font-semibold uppercase tracking-wider text-foreground/60 mb-5">
               {greeting}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter mb-3 max-w-2xl leading-[1.05]">
              Made by the people,<br />for the people.
            </h1>
            <p className="text-foreground/60 max-w-lg text-sm md:text-base mb-5">
              {user?.display_name ? `Welcome back, ${user.display_name}.` : "Welcome."} Listen, upload and share — PUBLIC is yours.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] active:scale-95 transition">
                <Upload size={14} /> Upload music
              </Link>
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/15 text-sm font-semibold hover:bg-foreground/5 active:scale-95 transition">
                <Disc size={14} /> Explore genres
              </Link>
            </div>
          </div>
        </div>

        {/* Suggestions banner */}
        <Link
          to="/suggestions"
          className="group block mb-10 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04] transition p-4 md:p-5">
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

        {albums.length > 0 &&
        <Section title="Albums" icon={Disc}>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0">
              {albums.map((a) =>
            <Link
              key={a.id}
              to={`/album/${a.id}`}
              className="snap-start shrink-0 w-[44vw] max-w-[200px] sm:w-[180px] md:w-auto rounded-xl p-3 hover:bg-foreground/[0.03] transition">
                  <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                    {a.cover_art_url ?
                <img src={a.cover_art_url} alt="" className="w-full h-full object-cover" /> :

                <Disc size={28} />
                }
                  </div>
                  <div className="font-semibold truncate text-sm">{a.title}</div>
                  <div className="text-xs text-foreground/50 truncate">{a.artisan || a.genre || "Album"}</div>
                </Link>
            )}
            </div>
          </Section>
        }

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
        <Section key={sg.genre} title={sg.genre} seeAllTo="/discover">
              <CardRow tracks={sg.tracks} />
            </Section>
        )}
      </div>
    </PullToRefresh>);

}