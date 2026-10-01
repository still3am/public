import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { useLikes } from "@/context/LikeContext";

export default function LikedSongs() {
  const navigate = useNavigate();
  const { ids } = useLikes();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const key = [...ids].join(",");

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];

    (async () => {
      if (!list.length) {
        setTracks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await base44.entities.Track.filter({ id: { $in: list } }, "-created_date", 200);
        if (!cancelled) setTracks((res || []).filter((t) => t.is_published));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="tap-target rounded-full hover:bg-foreground/[0.06] mb-2 -ml-2"
        aria-label="Back">
        
        <ArrowLeft size={20} />
      </button>

      <PageHeader
        eyebrow="Your collection"
        title="Liked songs"
        subtitle="Every track you've hearted across the PUBLIC network." />
      

      {loading ?
      <div className="py-16 text-center">
          <Loader2 className="animate-spin inline text-foreground/40" size={22} />
        </div> :
      tracks.length === 0 ?
      <EmptyState
        icon={Heart}
        title="No liked songs yet"
        description="Tap the heart on any track and it lands here." /> :


      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {tracks.map((t) =>
        <TrackCard key={t.id} track={t} />
        )}
        </div>
      }
    </div>);

}