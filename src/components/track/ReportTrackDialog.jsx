import { useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const REASONS = ["Copyright / not mine", "Explicit content not marked", "Spam or misleading", "Offensive or harmful", "Other"];

export default function ReportTrackDialog({ track, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await base44.functions.invoke("safety", {action:"report",target_type:"track",target_id:track.id,
        reason: details.trim() ? `${reason}: ${details.trim()}` : reason,
      });
      toast({ title: "Report sent", description: "Thanks, the PUBLIC team will review it." });
      onClose();
    } catch {
      toast({ title: "Couldn't send report", variant: "destructive" });
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Report track</DialogTitle>
          <DialogDescription className="truncate">{track.title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`chip ${reason === r ? "active" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add details (optional)"
          rows={3}
        />
        <Button onClick={submit} disabled={sending} className="w-full">
          {sending ? <Loader2 size={16} className="animate-spin" /> : "Send report"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}