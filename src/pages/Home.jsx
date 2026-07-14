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
} from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import Logo, { LOGO_URL } from "@/components/Logo";
import { getRecentPlays } from "@/lib/recentPlays";

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          {Icon && <Icon size={20} />}
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function CardGrid({ tracks }) {
  if (!tracks?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {tracks.map((t) => (
        <TrackCard key={t.id} track={t} />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8">
      <div className="h-48 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="h-6 w-32 bg-foreground/[0.05] rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="aspect-square rounded-xl bg-foreground/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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

  useEffect(() => {
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
          user?.id
            ? base44.entities.Follow
                .filter({ follower_id: user.id }, "-created_date", 200)
                .catch(() => [])
            : Promise.resolve([]),
          base44.entities.Album.list("-created_date", 20).catch(() => []),
        ]);
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
          genres.map(async (g) => ({
            genre: g,
            tracks: await base44.entities.Track.filter(
              { is_published: true, genre: g },
              "-play_count",
              8
            ),
          }))
        );
        setByGenre(perGenre);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Skeleton />;

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
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2"
          >
            <Upload size={14} /> Upload now
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-white to-foreground/[0.03] p-6 md:p-10 mb-10">
        <img
          src={LOGO_URL}
          alt=""
          className="absolute -right-6 -top-6 opacity-20 h-40 pointer-events-none select-none"
          style={{ width: "auto" }}
        />
        <div className="flex items-center gap-3 mb-4">
          <Logo size={28} />
          <span className="text-sm font-bold tracking-[0.2em] uppercase text-foreground/60">
            PUBLIC
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter mb-2 max-w-2xl">
          Made by the people, for the people.
        </h1>
        <p className="text-foreground/60 max-w-md">
          Welcome{user?.display_name ? `, ${user.display_name}` : ""}. Listen,
          upload, share. PUBLIC is yours.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 mt-5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] transition"
        >
          <Upload size={14} /> Upload music
        </Link>
      </div>

      <Section title="Trending" icon={TrendingUp}>
        {CardGrid({ tracks: trending })}
      </Section>
      <Section title="New Releases">
        {CardGrid({ tracks: newReleases })}
      </Section>
      {albums.length > 0 && (
        <Section title="Albums" icon={Disc}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {albums.map((a) => (
              <Link
                key={a.id}
                to={`/playlist/album-${a.id}`}
                className="rounded-xl p-3 hover:bg-foreground/[0.03] transition"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                  {a.cover_art_url ? (
                    <img src={a.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Disc size={28} />
                  )}
                </div>
                <div className="font-semibold truncate text-sm">{a.title}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {a.artisan || a.genre || "Album"}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {fromFollowing.length > 0 && (
        <Section title="From People You Follow">
          {CardGrid({ tracks: fromFollowing })}
        </Section>
      )}
      {recentlyPlayed.length > 0 && (
        <Section title="Recently Played">
          {CardGrid({ tracks: recentlyPlayed })}
        </Section>
      )}
      {byGenre
        .filter((sg) => sg.tracks.length > 0)
        .map((sg) => (
          <Section key={sg.genre} title={sg.genre}>
            {CardGrid({ tracks: sg.tracks })}
          </Section>
        ))}
    </div>
  );
}