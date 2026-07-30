import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, CloudOff, ChevronRight } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const cache = useOfflineCache();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);

  const offlineCount = cache.records.length;

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
      const trackIds = (items || []).
      map((i) => i.track_id).
      filter(Boolean);
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
      const sorted = (list || []).
      slice().
      sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
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

      <Link
        to="/downloads"
        className="block mb-5 rounded-2xl ring-1 ring-inset ring-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] hover:from-foreground/[0.09] hover:to-foreground/[0.04] transition p-4 group">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shrink-0 hidden">
            <CloudOff size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight">PUBLIC OFFLINE</span>
              {offlineCount > 0 &&
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hidden">
                  {offlineCount} saved
                </span>
              }
            </div>
            <p className="text-xs text-foreground/55 mt-0.5">
              Listen to your saved songs without Wi‑Fi or data.
            </p>
          </div>
          <ChevronRight size={18} className="text-foreground/40 group-hover:translate-x-0.5 transition shrink-0" />
        </div>
      </Link>

      <PullToRefresh onRefresh={async () => {await refresh();await load();}}>
        {loading && tracks === null ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        !tracks?.length ?
        <EmptyState
          icon={LibIcon}
          title="Your library is empty"
          description="Tap the + on any track to save it here for quick access." /> :


        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tracks.map((t) =>
          <TrackCard key={t.id} track={t} />
          )}
          </div>
        }
      </PullToRefresh>
    </div>);

}