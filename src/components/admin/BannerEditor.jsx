import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Megaphone, RotateCcw } from "lucide-react";
import { useBannerMessages } from "@/hooks/useBannerMessages";
import { useToast } from "@/components/ui/use-toast";

export default function BannerEditor() {
  const { loading, messages, isCustom, setMessages } = useBannerMessages();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (draft === null && !loading) setDraft(messages);
  }, [loading, messages, draft]);

  if (loading || draft === null) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/30" />
      </div>
    );
  }

  const cleaned = draft.filter((m) => m.trim());
  const changed = JSON.stringify(cleaned) !== JSON.stringify(messages.filter((m) => m.trim()));
  const previewMsgs = cleaned.length > 0 ? cleaned : ["—"];

  async function save() {
    setSaving(true);
    try {
      const clean = draft.filter((m) => m.trim());
      await setMessages(clean);
      setDraft(clean);
      toast({ title: "Banner updated" });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(["Made by the people, for the people.", "New Music Weekly"]);
  }

  return (
    <div className="max-w-md space-y-4">
      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-inset ring-border">
        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/40 border-b border-border">
          Live Preview
        </div>
        <div className="w-full overflow-hidden bg-foreground text-background py-2 px-4">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] whitespace-nowrap overflow-hidden">
            {previewMsgs.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-3">
                {m}
                {i < previewMsgs.length - 1 && <span className="text-background/30">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl p-5 bg-card ring-1 ring-inset ring-border space-y-3">
        <div className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
          <Megaphone size={16} />
          Banner Messages
        </div>
        <p className="text-xs text-foreground/55 leading-relaxed">
          These scroll across the top of the app. Add one or more — they'll alternate in the banner.
        </p>

        <div className="space-y-2">
          {draft.map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={msg}
                onChange={(e) => setDraft(draft.map((m, idx) => (idx === i ? e.target.value : m)))}
                placeholder="Message text"
                className="flex-1 px-3 py-2 rounded-lg bg-background ring-1 ring-inset ring-border text-sm focus:ring-foreground/30 outline-none"
              />
              <button
                onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}
                disabled={draft.length <= 1}
                className="shrink-0 w-9 h-9 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive disabled:opacity-30 transition"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setDraft([...draft, ""])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground ring-1 ring-inset ring-border transition"
        >
          <Plus size={13} /> Add message
        </button>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={save}
            disabled={!changed || saving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold bg-foreground text-background disabled:opacity-40 transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save banner
          </button>
          {isCustom && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground ring-1 ring-inset ring-border transition"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}