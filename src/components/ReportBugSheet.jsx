import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Flag, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

// Files a plain bug report (no track attached) into the same Report queue the
// admins already review under Admin → Reports.
export default function ReportBugSheet({ onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user?.id || "",
        reporter_name: user?.display_name || user?.full_name || "",
        kind: "bug",
        track_id: "",
        page: window.location.pathname,
        reason: text.trim(),
      });
      toast({ title: "Thanks — that's on its way to the team" });
      onClose();
    } catch {
      toast({ title: "Couldn't send that report", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
            <Flag size={17} /> Report a problem
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-foreground/50 mb-2">
          What went wrong? The page you're on is sent along automatically.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          placeholder="e.g. The play button stopped working after I skipped a track"
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none"
        />

        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="mt-3 w-full h-11 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Flag size={15} />}
          Send report
        </button>
      </div>
    </div>
  );
}