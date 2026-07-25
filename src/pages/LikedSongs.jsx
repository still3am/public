import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import EmptyState from "@/components/EmptyState";
import TrackRow from "@/components/TrackRow";
import { Heart, Loader2, Play } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import PullToRefresh from "@/components/PullToRefresh";
import { getAlbumsMapForTracks } from "@/lib/albumEnrich";

export default function LikedSongs() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [albumsMap, setAlbumsMap] = useState({});

  async function load() {
    try {
      const all = await base44.entities.Track.list("-created_date", 200);
      const liked = all.filter(
        (t) => likes.likedIds.has(t.id) && t.is_published !== false
      );
      setTracks(liked);
      getAlbumsMapForTracks(liked).then(setAlbumsMap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (likes.ready) load();
  }, [likes.ready, likes.likedIds]);

  return (
    <PullToRefresh onRefresh={load}>
    <div>
      <div className="flex items-center gap-4 mb-8">
        

          
        <div>
          <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">
            Playlist
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Liked Songs
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {tracks.length > 0 &&
        <button
          onClick={() => p.playTrackAt(tracks)}
          className="mb-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] transition">
          
          <Play size={16} /> Play
        </button>
        }

      {!likes.ready || loading && !tracks.length ?
        <div className="py-20 grid place-items-center">
          <Loader2 className="animate-spin" />
        </div> :
        tracks.length === 0 ?
        <EmptyState
          icon={Heart}
          title="No liked songs yet"
          description="Tap the heart on any track to save it here." /> :


        <div className="space-y-0.5">
          {tracks.map((t, i) =>
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            liked={true}
            onLikeToggle={likes.toggleLike}
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)}
            albumArtist={albumsMap[t.album_id]?.artisan}
            albumCover={albumsMap[t.album_id]?.cover_art_url} />

          )}
        </div>
        }
      {ap.modal}
    </div>
    </PullToRefresh>);

}