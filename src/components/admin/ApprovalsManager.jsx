import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Check, X, RefreshCw, Loader2, Music2, EyeOff } from "lucide-react";

export default function ApprovalsManager() {
  const { toast } = useToast();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [live, setLive] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Track.filter(
        { approval_status: "pending" },
        "-created_date",
        200
      ).catch(() => []);
      setTracks(Array.isArray(t) ? t : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadLive() {
    setLiveLoading(true);
    try {
      const t = await base44.entities.Track.filter(
        { is_published: true },
        "-play_count",
        100
      ).catch(() => []);
      setLive(Array.isArray(t) ? t : []);
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadLive();
  }, []);

  async function approve(track) {
    setBusyId(track.id);
    try {
      await base44.entities.Track.update(track.id, {
        is_published: true,
        approval_status: "approved",
      });
      setTracks((prev) => (prev || []).filter((t) => t.id !== track.id));
      loadLive();
      toast({ title: `"${track.title}" is now live on PUBLIC` });
    } catch (e) {
      toast({ title: "Couldn't approve track", variant: "destructive" });
    } finally {
      setBusyId("");
    }
  }

  async function takedown(track) {
    if (!window.confirm(`Remove "${track.title}" from PUBLIC? It stays in the uploader's library and profile.`)) return;
    setBusyId(track.id);
    try {
      await base44.entities.Track.update(track.id, {
        is_published: false,
        approval_status: "rejected",
      });
      setLive((prev) => (prev || []).filter((t) => t.id !== track.id));
      toast({ title: "Removed from PUBLIC" });
    } catch (e) {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    } finally {
      setBusyId("");
    }
  }

  async function reject(track) {
    setBusyId(track.id);
    try {
      await base44.entities.Track.update(track.id, {
        is_published: false,
        approval_status: "rejected",
      });
      setTracks((prev) => (prev || []).filter((t) => t.id !== track.id));
      toast({ title: "Track rejected" });
    } catch (e) {
      toast({ title: "Couldn't reject track", variant: "destructive" });
    } finally {
      setBusyId("");
    }
  }

  const count = (tracks || []).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 grid place-items-center">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Upload approvals</div>
            <div className="text-xs text-foreground/50">
              {count > 0 ? `${count} awaiting review` : "Queue is clear"}
            </div>
          </div>
        </div>
        <button
          onClick={() => { load(); loadLive(); }}
          className="p-2 rounded-full hover:bg-foreground/5 text-foreground/50"
          aria-label="Refresh"
        >
          <RefreshCw size={15} className={loading || liveLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && tracks === null ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : !count ? (
        <div className="py-8 text-center text-sm text-foreground/50">
          No tracks waiting for approval.
        </div>
      ) : (
        <div className="space-y-2">
          {(tracks || []).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-2 rounded-xl border border-border/70 bg-background/40"
            >
              <div className="w-11 h-11 rounded-md overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                {t.cover_art_url ? (
                  <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music2 size={16} className="text-foreground/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/track/${t.id}`}
                  className="text-sm font-semibold truncate block hover:underline"
                >
                  {t.title}
                </Link>
                <div className="text-xs text-foreground/50 truncate">
                  {t.artist || "Unknown artist"} · {t.genre || "Other"}
                </div>
                <div className="text-[11px] text-foreground/40 truncate">
                  by {t.uploader_name || "Unknown"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => approve(t)}
                  disabled={busyId === t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  onClick={() => reject(t)}
                  disabled={busyId === t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border text-foreground/70 text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 grid place-items-center">
            <EyeOff size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Live on PUBLIC</div>
            <div className="text-xs text-foreground/50">
              Remove a track from public without deleting it; it stays in the owner's profile and library.
            </div>
          </div>
        </div>

        {liveLoading && live === null ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !live?.length ? (
          <div className="py-6 text-center text-sm text-foreground/50">
            No tracks are live on PUBLIC right now.
          </div>
        ) : (
          <div className="space-y-2">
            {(live || []).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-xl border border-border/70 bg-background/40"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                  {t.cover_art_url ? (
                    <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 size={16} className="text-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/track/${t.id}`}
                    className="text-sm font-semibold truncate block hover:underline"
                  >
                    {t.title}
                  </Link>
                  <div className="text-xs text-foreground/50 truncate">
                    {t.artist || "Unknown artist"} · {t.genre || "Other"} · {t.play_count || 0} plays
                  </div>
                </div>
                <button
                  onClick={() => takedown(t)}
                  disabled={busyId === t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
                >
                  {busyId === t.id ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}