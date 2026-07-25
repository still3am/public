import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { getAlbumsMapForTracks } from "@/lib/albumEnrich";

export default function RecentlyAdded() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [albumsMap, setAlbumsMap] = useState({});

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Track.filter(
        { is_published: true },
        "-created_date",
        100
      );
      setTracks(t);
      setAlbumsMap(await getAlbumsMapForTracks(t));
    } catch {
      // ignore on refresh
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !tracks.length)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  return (
    <PullToRefresh onRefresh={load}>
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-foreground/40 font-semibold mb-1.5">Newest</div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Recently Added</h1>
      <p className="text-sm text-foreground/50 mb-5">
        Fresh uploads from across the network.
      </p>
      <div className="space-y-0.5">
        {tracks.map((t, i) => {
          const al = albumsMap[t.album_id];
          return (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            liked={likes.likedIds.has(t.id)}
            onLikeToggle={likes.toggleLike}
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)}
            albumArtist={al?.artisan}
            albumCover={al?.cover_art_url}
          />
          );
        })}
      </div>
    </div>
    </PullToRefresh>
  );
}