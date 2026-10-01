import { useState } from "react";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { useUploadsEnabled } from "@/hooks/useUploadsEnabled";
import { useToast } from "@/components/ui/use-toast";

export default function UploadSwitch() {
  const { loading, enabled, setEnabled } = useUploadsEnabled();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function toggle() {
    setSaving(true);
    try {
      await setEnabled(!enabled);
      toast({ title: enabled ? "Uploads stopped" : "Uploads reopened" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/30" />
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-2xl p-5 bg-card ring-1 ring-inset ring-border space-y-4">
      <div className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
        {enabled ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <Ban size={16} className="text-destructive" />
        )}
        Uploads are {enabled ? "open" : "stopped"}
      </div>
      <p className="text-xs text-foreground/55 leading-relaxed">
        {enabled
          ? "Anyone can upload music right now. Stop uploads to temporarily close the upload page for all non-admin users."
          : "Uploading is closed — non-admin users can't add new music until you reopen it. Admins can still upload."}
      </p>
      <button
        onClick={toggle}
        disabled={saving}
        className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition disabled:opacity-50 ${
          enabled
            ? "bg-destructive text-destructive-foreground"
            : "bg-foreground text-background"
        }`}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : enabled ? <Ban size={14} /> : <CheckCircle2 size={14} />}
        {enabled ? "Stop uploads" : "Reopen uploads"}
      </button>
    </div>
  );
}