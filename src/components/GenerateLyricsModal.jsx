import { useEffect, useState } from "react";
import { Loader2, X, Sparkles, Save, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function GenerateLyricsModal({ track, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [lyrics, setLyrics] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function generate() {
    setLoading(true);
    setError("");
    setLyrics("");
    try {
      const res = await base44.functions.invoke("generateLyrics", { track_id: track.id });
      const text = res?.data?.lyrics || "";
      setLyrics(text);
      if (!text) setError("No lyrics detected for this track.");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to generate lyrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      await base44.entities.Track.update(track.id, { lyrics_text: lyrics.trim() });
      toast({ title: "Lyrics saved" });
      onSaved({ lyrics_text: lyrics.trim() });
    } catch {
      toast({ title: "Could not save lyrics", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}>
      <div
        className="bg-background w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles size={16} /> AI Lyrics Generator
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 grid place-items-center text-foreground/60 gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-sm">Listening to the audio & transcribing lyrics…</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-foreground/70 px-4">
              <p className="mb-4">{error}</p>
              <button
                onClick={generate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold">
                <RotateCcw size={13} /> Try again
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-foreground/50 mb-2 px-1">
                AI transcribed the lyrics from the audio. Review and edit before saving — machines aren't perfect.
              </p>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="w-full min-h-[300px] text-sm leading-relaxed bg-foreground/[0.03] border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
                placeholder="Review and edit the generated lyrics…"
              />
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="p-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={generate}
              className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5 inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> Regenerate
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !lyrics.trim()}
              className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save lyrics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}