import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Flag, Loader2 } from "lucide-react";

// Shared report flow so every track menu reports the same way.
export default function ReportModal({ track, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = reason.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user?.id,
        track_id: track.id,
        reason: text,
      });
      toast({ title: "Report sent to the PUBLIC team" });
      onClose();
    } catch {
      toast({ title: "Couldn't send the report", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md bg-card text-card-foreground border border-border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-2 mb-1">
          <Flag size={16} className="text-destructive" />
          <h3 className="text-lg font-extrabold tracking-tight">Report track</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tell us what's wrong with “{track.title}”. Reports go to the PUBLIC admin team.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          autoFocus
          placeholder="What's the issue?"
          className="selectable-content w-full rounded-2xl border border-input bg-background text-foreground text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" className="flex-1 rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-full"
            disabled={!reason.trim() || busy}
            onClick={submit}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : "Send report"}
          </Button>
        </div>
      </div>
    </div>
  );
}