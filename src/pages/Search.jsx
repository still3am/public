import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search as SearchIcon,
  Loader2,
  ListMusic,
  Disc,
  Music,
  Shield } from
"lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import TrackRow from "@/components/TrackRow";
import PullToRefresh from "@/components/PullToRefresh";

const TABS = [
{ id: "tracks", label: "Tracks", icon: Music },
{ id: "albums", label: "Albums", icon: Disc },
{ id: "playlists", label: "Playlists", icon: ListMusic }];


export default function Search() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const isAdmin = user?.role === "admin";
  const tabs = [...TABS, { id: "people", label: "People", icon: Shield }];
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("tracks");
  const [data, setData] = useState({
    tracks: [],
    albums: [],
    playlists: [],
    people: []
  });
  const [loading, setLoading] = useState(false);

  async function runSearch(query) {
    if (!query.trim()) {
      setData({ tracks: [], albums: [], playlists: [], people: [] });
      return;
    }
    setLoading(true);
    try {
      const [tracks, albums, playlists] = await Promise.all([
      base44.entities.Track.list("-created_date", 200),
      base44.entities.Album.list("-created_date", 200),
      base44.entities.Playlist.list("-created_date", 200)]
      );
      const Q = query.trim().toLowerCase();
      const filtered = {
        tracks: tracks.filter(
          (t) =>
          t.is_published !== false &&
          (t.title?.toLowerCase().includes(Q) ||
          t.artist?.toLowerCase().includes(Q) ||
          t.uploader_name?.toLowerCase().includes(Q))
        ),
        albums: albums.filter(
          (a) =>
          a.title?.toLowerCase().includes(Q) ||
          a.artisan?.toLowerCase().includes(Q)
        ),
        playlists: playlists.filter(
          (p) => p.is_public !== false && p.name?.toLowerCase().includes(Q)
        ),
        people: []
      };
      const users = await base44.entities.User.
      list("-created_date", 200).
      catch(() => []);
      filtered.people = users.filter((u) =>
      (u.display_name || u.full_name || u.email || "").
      toLowerCase().
      includes(Q)
      );
      setData(filtered);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <PullToRefresh onRefresh={() => runSearch(q)}>
    <div>
      <div className="relative mb-6">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
        
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tracks, albums, artists…"
          className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/10" />
        
      </div>

      <div className="flex gap-1 mb-6 border-b border-border tab-strip no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) =>
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition shrink-0 whitespace-nowrap ${
          tab === id ?
          "border-foreground text-foreground" :
          "border-transparent text-foreground/50 hover:text-foreground"}`
          }
          >
          
            <Icon size={16} /> {label}
          </button>
        )}
      </div>

      {!q.trim() ?
      <p className="text-sm text-foreground/50 text-center py-12">
          Start typing to search across the PUBLIC network.
        </p> :
      loading && !data.tracks.length && !data.albums.length && !data.playlists.length && !data.people.length ?
      <div className="py-12 text-center">
          <Loader2 className="animate-spin inline" />
        </div> :

      <div>
          {tab === "tracks" && (
        data.tracks.length ?
        <div className="space-y-0.5">
                {data.tracks.map((t, i) =>
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            liked={likes.likedIds.has(t.id)}
            onLikeToggle={likes.toggleLike}
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)} />

          )}
              </div> :

        <p className="text-sm text-foreground/50 text-center py-12">
                No tracks found.
              </p>)
        }
          {tab === "albums" && (
        data.albums.length ?
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {data.albums.map((a) =>
          <Link
            key={a.id}
            to={`/album/${a.id}`}
            className="rounded-xl p-3 hover:bg-foreground/[0.03] transition">
            
                    <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3">
                      {a.cover_art_url &&
              <img
                src={a.cover_art_url}
                alt=""
                className="w-full h-full object-cover" />

              }
                    </div>
                    <div className="font-semibold truncate text-sm">
                      {a.title}
                    </div>
                    <div className="text-xs text-foreground/50 truncate">
                      Album
                    </div>
                  </Link>
          )}
              </div> :

        <p className="text-sm text-foreground/50 text-center py-12">
                No albums found.
              </p>)
        }
          {tab === "playlists" && (
        data.playlists.length ?
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {data.playlists.map((pl) =>
          <Link
            key={pl.id}
            to={`/playlist/${pl.id}`}
            className="rounded-xl p-3 hover:bg-foreground/[0.03] transition">
            
                    <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                      {pl.cover_art_url ?
              <img
                src={pl.cover_art_url}
                alt=""
                className="w-full h-full object-cover" /> :


              <ListMusic size={28} />
              }
                    </div>
                    <div className="font-semibold truncate text-sm">
                      {pl.name}
                    </div>
                    <div className="text-xs text-foreground/50 truncate">
                      {pl.track_ids?.length || 0} track
                      {(pl.track_ids?.length || 0) === 1 ? "" : "s"}
                    </div>
                  </Link>
          )}
              </div> :

        <p className="text-sm text-foreground/50 text-center py-12">
                No playlists found.
              </p>)
        }
          {tab === "people" &&
        <div className="space-y-1">
              {data.people.length === 0 ?
          <p className="text-sm text-foreground/50 text-center py-12">
                  No people found.
                </p> :

          data.people.map((u) =>
          <Link
            key={u.id}
            to={`/profile/${u.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03]">
            
                    {u.avatar_url ?
            <img
              src={u.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover" /> :


            <div className="w-10 h-10 rounded-full bg-foreground/10 grid place-items-center font-semibold text-foreground/70">
                        {(u.display_name || u.email || "?").charAt(0)}
                      </div>
            }
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1">
                        {u.display_name || u.full_name || "Unnamed"}
                        {u.is_verified && <Shield size={12} />}
                        {u.can_upload &&
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60">
                            uploader
                          </span>
                }
                      </div>
                      <div className="text-xs text-foreground/50 truncate">
                        {u.email}
                      </div>
                    </div>
                  </Link>
          )
          }
            </div>
        }
        </div>
      }
      {ap.modal}
    </div>
    </PullToRefresh>);

}