import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Globe, Loader2 } from "lucide-react";
import {
  awaitingFirstSubmit,
  publicSubmitBlockers,
  isReadyForPublic,
} from "@/lib/publicSubmit";

// One pass over the whole upload list: every private song that already clears
// the public bar is picked for you, and the rest say what they are missing.
export default function BulkPublicSubmitBar({ tracks, onSubmitted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  // Nothing is excluded to begin with, so the whole ready batch is preselected.
  const [excluded, setExcluded] = useState(() => new Set());

  const pending = (tracks || []).filter(awaitingFirstSubmit);
  if (pending.length === 0) return null;

  const ready = pending.filter(isReadyForPublic);
  const blocked = pending.filter((t) => !isReadyForPublic(t));
  const chosen = ready.filter((t) => !excluded.has(t.id));
  const allChosen = chosen.length === ready.length;

  const toggleAll = () => {
    setExcluded(allChosen ? new Set(ready.map((t) => t.id)) : new Set());
  };

  const submit = async () => {
    const ids = chosen.map((t) => t.id);
    if (ids.length === 0) return;
    const isAdmin = user?.role === "admin";
    setBusy(true);
    try {
      // Owner submissions join the admin review queue; an admin's own upload is
      // already trusted, so it goes live straight away — the upload gate's rule.
      await base44.entities.Track.bulkUpdate(
        ids.map((id) => ({
          id,
          approval_status: isAdmin ? "approved" : "pending",
          is_published: isAdmin,
        }))
      );
      toast({
        title: isAdmin
          ? `${ids.length} ${ids.length === 1 ? "song is" : "songs are"} live on PUBLIC`
          : `${ids.length} ${ids.length === 1 ? "song" : "songs"} sent for review`,
      });
      onSubmitted?.(ids);
    } catch {
      toast({ title: "Couldn't upload those songs", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl grid place-items-center bg-foreground/[0.06] text-foreground shrink-0">
          <Globe size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">
            {ready.length > 0
              ? `${chosen.length} of ${ready.length} ready for public`
              : "Nothing ready for public yet"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {blocked.length > 0
              ? `${blocked.length} ${blocked.length === 1 ? "song needs" : "songs need"} more details first.`
              : "Every private song clears the bar."}
          </p>
        </div>
      </div>

      {ready.length > 0 && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={submit}
            disabled={busy || chosen.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background text-xs font-bold active:scale-95 transition disabled:opacity-40"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Upload {chosen.length} to public
          </button>
          <button
            onClick={toggleAll}
            className="px-3.5 py-2 rounded-full border border-border text-xs font-bold hover:bg-accent active:scale-95 transition"
          >
            {allChosen ? "None" : "All"}
          </button>
        </div>
      )}

      {blocked.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-border space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
          {blocked.map((t) => (
            <li key={t.id} className="text-[11px] leading-snug text-muted-foreground truncate">
              <span className="font-semibold text-foreground">{t.title}</span>
              {" needs "}
              {publicSubmitBlockers(t).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}