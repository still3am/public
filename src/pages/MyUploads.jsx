import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Upload as UploadIcon, Loader2 } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import BackHeader from "@/components/BackHeader";

export default function MyUploads() {
  const { user } = useAuth();
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
      const list = await base44.entities.Track.filter(
        { uploader_id: user.id },
        "-created_date",
        1000
      );
      setTracks(list || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      <BackHeader title="Your Uploads" />

      <PullToRefresh onRefresh={load}>
        {loading && tracks === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !tracks?.length ? (
          <EmptyState
            icon={UploadIcon}
            title="No uploads yet"
            description="Tracks you upload will appear here, separate from your saved library."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}