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
import PageHeader from "@/components/PageHeader";

export default function LikedSongs() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const ids = [...likes.likedIds];
      if (!ids.length) {
        setTracks([]);
        return;
      }
      const liked = await base44.entities.Track.filter(
        { id: { $in: ids } },
        "-created_date",
        1000
      );
      setTracks(liked.filter((t) => t.is_published !== false));
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
      <PageHeader
        eyebrow="Playlist"
        title="Liked Songs"
        subtitle={`${tracks.length} track${tracks.length === 1 ? "" : "s"}`}
      >
        {tracks.length > 0 && (
          <button
            onClick={() => p.playTrackAt(tracks)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] transition">
            <Play size={16} /> Play
          </button>
        )}
      </PageHeader>

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
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)} />

          )}
        </div>
        }
      {ap.modal}
    </div>
    </PullToRefresh>);

}