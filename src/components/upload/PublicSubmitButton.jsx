import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Globe, Loader2 } from "lucide-react";
import { awaitingFirstSubmit, publicSubmitBlockers } from "@/lib/publicSubmit";

export default function PublicSubmitButton({ track, onSubmitted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!awaitingFirstSubmit(track)) return null;

  const missing = publicSubmitBlockers(track);
  if (missing.length > 0) {
    return (
      <p className="mt-2 px-1 text-[11px] leading-snug text-muted-foreground">
        Needs {missing.join(", ")} to publish this song.
      </p>
    );
  }

  const submit = async () => {
    const isAdmin = user?.role === "admin";
    setBusy(true);
    try {
      // Owner submissions join the admin review queue; an admin's own upload is
      // already trusted, so it goes live straight away — the upload gate's rule.
      await base44.entities.Track.update(track.id, {
        approval_status: isAdmin ? "approved" : "pending",
        is_published: isAdmin,
      });
      toast({
        title: isAdmin
          ? `"${track.title}" is live on PUBLIC`
          : `"${track.title}" sent for review`,
      });
      onSubmitted?.([track.id]);
    } catch {
      toast({ title: "Couldn't publish that song", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={submit}
      disabled={busy}
      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs font-bold hover:bg-accent active:scale-95 transition disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
      Upload to public
    </button>
  );
}