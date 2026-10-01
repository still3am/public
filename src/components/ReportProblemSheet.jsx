import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Bug, Loader2, Send, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { getLastError, clearLastError, deviceSummary } from "@/lib/errorLog";

// Lets anyone flag something that broke, auto-attaching the most recent
// uncaught error and the page it happened on.
export default function ReportProblemSheet({ onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [sending, setSending] = useState(false);

  const captured = getLastError();
  const pagePath =
    typeof window === "undefined" ? "" : window.location.pathname + window.location.search;

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await base44.entities.ErrorReport.create({
        user_id: user.id,
        user_name: user.display_name || user.full_name || "",
        message: message.trim(),
        details: captured?.message || "",
        page_path: pagePath,
        device: deviceSummary(),
      });
      clearLastError();
      toast({ title: "Thanks — sent to the admins" });
      onClose();
    } catch {
      toast({ title: "Couldn't send that report", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
              <Bug size={18} className="text-foreground/70" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Report a problem</h2>
              <p className="text-xs text-foreground/50 mt-0.5">
                {user ? "The admins will take a look." : "Sign in to send a report."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="What went wrong? What were you doing at the time?"
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none"
        />

        <div className="mt-3 text-[11px] text-foreground/45 space-y-0.5">
          <div className="truncate">Page: {pagePath}</div>
          <div className="truncate">Device: {deviceSummary()}</div>
        </div>

        {captured?.message && (
          <div className="mt-3 rounded-xl border border-border bg-foreground/[0.02] overflow-hidden">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground/70"
            >
              <span>Attach error details</span>
              <ChevronDown
                size={15}
                className={`transition-transform ${showDetails ? "rotate-180" : ""}`}
              />
            </button>
            {showDetails && (
              <pre className="selectable-content px-3 pb-3 text-[11px] whitespace-pre-wrap break-words text-foreground/60">
                {captured.message}
              </pre>
            )}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!user || !message.trim() || sending}
          className="mt-4 w-full h-11 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.99] transition"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send report
        </button>
      </div>
    </div>
  );
}