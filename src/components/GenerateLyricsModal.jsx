import { useEffect, useRef, useState } from "react";
import { Loader2, X, Sparkles, Save, RotateCcw, Timer } from "lucide-react";
import { base44 } from "@/api/base44Client";

function normalize(text) {
  return (typeof text === "string" ? text : "").replace(/\r\n?/g, "\n").split("\n").map(line => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function generationMessage(error) {
  const status = Number(error?.response?.status || error?.status);
  if (status === 402 || error?.response?.data?.code === "integration_credits") return "AI generation needs available app integration credits. Your draft is still here.";
  if (status === 422) return "No vocals were detected. You can retry or enter the lyrics below.";
  if (status === 413) return "This audio exceeds the transcription size limit. You can enter the lyrics below.";
  if (status === 401 || status === 403) return "Sign in as the track owner to generate lyrics.";
  if (status === 429) return "AI generation is busy. Keep your draft and retry shortly.";
  return "Generation didn't finish. Your draft is unchanged; retry or edit it below.";
}

/** @param {any} props */
export default function GenerateLyricsModal({ track, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [lyrics, setLyrics] = useState(() => normalize(track.lyrics_text));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(null);
  const generationVersion = useRef(0);
  const mounted = useRef(false);
  const saveLock = useRef(false);
  const lineCount = lyrics.split("\n").filter(line => line.trim()).length;

  async function generate() {
    if (saveLock.current) return;
    const version = ++generationVersion.current;
    setLoading(true);
    setNotice("");
    // Share the pending request across repeated clicks / StrictMode effect replay.
    if (!pending.current || pending.current.trackId !== track.id) {
      const promise = base44.functions.invoke("generateLyrics", { track_id: track.id });
      pending.current = { trackId: track.id, promise };
      promise.then(
        () => { if (pending.current?.promise === promise) pending.current = null; },
        () => { if (pending.current?.promise === promise) pending.current = null; }
      );
    }
    const promise = pending.current.promise;
    try {
      const res = await promise;
      if (!mounted.current || version !== generationVersion.current) return;
      const data = res?.data;
      const text = normalize(Array.isArray(data?.lines) && data.lines.every(line => typeof line === "string")
        ? data.lines.join("\n") : data?.lyrics);
      if (!text) {
        setNotice("No lyrics were returned. Retry or enter the lyrics below.");
        return;
      }
      setLyrics(text);
      if (data?.formatting === "wrapped") setNotice("Lyrics were split into short lines. Review the phrase breaks before syncing.");
    } catch (error) {
      if (mounted.current && version === generationVersion.current) setNotice(generationMessage(error));
    } finally {
      if (mounted.current && version === generationVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    generate();
    return () => {
      mounted.current = false;
      generationVersion.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  async function save(sync = false) {
    const text = normalize(lyrics);
    if (loading || saveLock.current || !text) return;
    saveLock.current = true;
    setSaving(true);
    setNotice("");
    try {
      const saved = await base44.entities.Track.update(track.id, { lyrics_text: text });
      if (!saved?.id || saved.id !== track.id) throw new Error("Save not confirmed");
      if (!mounted.current) return;
      onSaved?.({ ...saved, lyrics_text: text }, { sync });
    } catch (error) {
      if (mounted.current) setNotice(Number(error?.response?.status || error?.status) === 402
        ? "Saving is unavailable right now. Your lyrics draft has been kept; try again."
        : "Lyrics haven't been saved. Your draft is still here; try saving again.");
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const close = () => { if (!saveLock.current) onClose?.(); };

  return (
    <div role="dialog" aria-modal="true" aria-label="Generate lyrics" data-public-dialog tabIndex={-1}
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={close}>
      <div className="bg-background w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} /> Generate lyrics</h3>
          <button onClick={close} disabled={saving} className="p-2 rounded-full hover:bg-foreground/5 disabled:opacity-40" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          <p className="text-xs text-foreground/55 mb-3">
            One sung phrase per line, with space between stanzas. Review the words and line breaks before saving; timing is added in Sync lyrics.
          </p>
          {loading && <div role="status" className="flex items-center gap-2 text-sm text-foreground/60 mb-3">
            <Loader2 className="animate-spin shrink-0" size={16} /> Transcribing and arranging lyric lines…
          </div>}
          {notice && <p role="status" className="text-xs text-foreground/60 mb-3">{notice}</p>}
          <textarea value={lyrics} onChange={event => setLyrics(event.target.value)} disabled={loading || saving}
            aria-label="Lyrics, one sung phrase per line" spellCheck={false}
            className="selectable-content w-full min-h-[260px] sm:min-h-[320px] text-sm leading-7 bg-foreground/[0.03] border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-y disabled:opacity-60"
            placeholder="Lyrics will appear here, one phrase per line. You can also type or paste your own." />
          <p className="mt-2 text-[11px] text-foreground/45 tabular-nums">{lineCount} lyric {lineCount === 1 ? "line" : "lines"}</p>
        </div>
        <div className="p-4 border-t border-border shrink-0 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={generate} disabled={loading || saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/60 hover:text-foreground disabled:opacity-40">
            <RotateCcw size={13} /> {notice && !lyrics.trim() ? "Try again" : "Regenerate from audio"}
          </button>
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={loading || saving || !lyrics.trim()}
              className="flex-1 min-w-0 h-11 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save lyrics
            </button>
            <button onClick={() => save(true)} disabled={loading || saving || !lyrics.trim()}
              className="flex-1 min-w-0 h-11 rounded-full bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
              <Timer size={14} /> Save &amp; sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
