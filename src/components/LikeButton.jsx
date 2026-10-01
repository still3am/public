import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useLikes } from "@/context/LikeContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

/**
 * Heart control for one track. Every surface that acts on a track can drop it
 * in; the label/count mirror the shared like state.
 */
export default function LikeButton({
  track,
  size = 18,
  showCount = false,
  className = "",
  stopPropagation = true,
}) {
  const { isLiked, toggle } = useLikes();
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(track?.like_count || 0);

  useEffect(() => {
    setCount(track?.like_count || 0);
  }, [track?.id, track?.like_count]);

  if (!track) return null;
  const liked = isLiked(track.id);

  const onClick = async (e) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!user?.id) {
      toast({ title: "Sign in to like tracks" });
      return;
    }
    setBusy(true);
    setCount((c) => Math.max(0, c + (liked ? -1 : 1)));
    try {
      const data = await toggle(track);
      if (typeof data?.like_count === "number") setCount(data.like_count);
    } catch {
      setCount((c) => Math.max(0, c + (liked ? 1 : -1)));
      toast({ title: "Couldn't update your like", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      aria-label={liked ? "Remove from likes" : "Like this track"}
      aria-pressed={liked}
      title={liked ? "In your liked songs" : "Like this track"}
      className={`inline-flex items-center gap-1.5 ${className}`}>
      
      {busy ?
      <Loader2 size={size} className="animate-spin" /> :

      <Heart
        size={size}
        fill={liked ? "currentColor" : "none"}
        className={liked ? "text-foreground" : "text-foreground/60"} />

      }
      {showCount &&
      <span className="text-xs font-semibold tabular-nums text-foreground/70">
          {count.toLocaleString()}
        </span>
      }
    </button>);

}