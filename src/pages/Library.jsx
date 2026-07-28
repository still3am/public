import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { Library as LibIcon, Loader2 } from "lucide-react";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await base44.entities.LibraryItem.filter(
        { user_id: user.id },
        "-created_date",
        1000
      );
      const trackIds = (items || [])
        .map((i) => i.track_id)
        .filter(Boolean);
      if (!trackIds.length) {
        setTracks([]);
        return;
      }
      const list = await base44.entities.Track.filter(
        { id: { $in: trackIds } },
        "-created_date",
        1000
      );
      const order = new Map(trackIds.map((id, i) => [id, i]));
      const sorted = (list || [])
        .slice()
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      setTracks(sorted);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load, ids]);

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      <PageHeader title="Your Library" subtitle="Everything you've saved, in one place." />
      <PullToRefresh onRefresh={async () => { await refresh(); await load(); }}>
        {loading && tracks === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !tracks?.length ? (
          <EmptyState
            icon={LibIcon}
            title="Your library is empty"
            description="Tap the + on any track to save it here for quick access."
          />
        ) : (
          <div className="space-y-0.5">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}