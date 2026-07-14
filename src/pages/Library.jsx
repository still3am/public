import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/EmptyState";
import {
  Plus,
  ListMusic,
  Loader2,
  Heart,
  UserCheck,
  Upload,
  Music,
} from "lucide-react";
import Avatar from "@/components/Avatar";

export default function Library() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState("recent"); // recent | alpha | count

  async function load() {
    setLoading(true);
    try {
      const [pl, followingRows] = await Promise.all([
        base44.entities.Playlist.filter(
          { creator_id: user.id },
          "-created_date",
          100
        ),
        base44.entities.Follow.filter(
          { follower_id: user.id },
          "-created_date",
          100
        ),
      ]);
      setPlaylists(pl);
      const ids = followingRows.map((f) => f.following_id);
      const followed = ids.length
        ? await Promise.all(
            ids.map((id) =>
              base44.entities.User.get(id).catch(() => null)
            )
          )
        : [];
      setFollowing(followed.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function createPlaylist() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await base44.entities.Playlist.create({
        name: newName.trim(),
        creator_id: user.id,
        track_ids: [],
      });
      setNewName("");
      setShowCreate(false);
      setPlaylists((prev) => [p, ...prev]);
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  const sortedPlaylists = [...playlists].sort((a, b) => {
    if (sort === "alpha") return (a.name || "").localeCompare(b.name || "");
    if (sort === "count")
      return (b.track_ids?.length || 0) - (a.track_ids?.length || 0);
    return (
      new Date(b.created_date || 0).getTime() -
      new Date(a.created_date || 0).getTime()
    );
  });

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-xl font-extrabold tracking-tight">Your Playlists</h2>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-border bg-white text-xs font-medium"
            >
              <option value="recent">Recent</option>
              <option value="alpha">A–Z</option>
              <option value="count">Tracks</option>
            </select>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>
        {showCreate && (
          <div className="flex gap-2 mb-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
            />
            <button
              onClick={createPlaylist}
              disabled={creating || !newName.trim()}
              className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-40"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
            </button>
          </div>
        )}
        {sortedPlaylists.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="No playlists yet"
            description="Create a playlist to organize your favorite tracks."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={14} /> Create playlist
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {sortedPlaylists.map((pl) => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="rounded-xl p-3 hover:bg-foreground/[0.03] transition"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3 grid place-items-center text-foreground/40">
                  {pl.cover_art_url ? (
                    <img
                      src={pl.cover_art_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ListMusic size={28} />
                  )}
                </div>
                <div className="font-semibold truncate text-sm">{pl.name}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {pl.track_ids?.length || 0} track
                  {(pl.track_ids?.length || 0) === 1 ? "" : "s"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-extrabold tracking-tight mb-4">Following</h2>
        {following.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Not following anyone yet"
            description="Find people to follow in Search or on their profile pages."
          />
        ) : (
          <div className="space-y-1">
            {following.map((u) => (
              <Link
                key={u.id}
                to={`/profile/${u.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03]"
              >
                <Avatar user={u} size={44} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {u.display_name || u.full_name || "Unnamed"}
                  </div>
                  <div className="text-xs text-foreground/50 truncate">
                    {`${
                      (u.following_count || 0) +
                      (u.following_count ? " following" : "")
                    }`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}