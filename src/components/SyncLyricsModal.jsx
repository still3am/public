import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import {
  Loader2,
  X,
  Sparkles,
  Save,
  Play,
  Pause,
  Undo2,
  RotateCcw,
  Mic2 } from
"lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { parseTimedLyrics, withEndTimes, formatStamp } from "@/lib/lyricsTiming";

// Tap-along lyric sync: the words come from the track's lyrics, a paste, or an
// AI transcription; pasted timestamps ([1:04.20]) are picked up automatically
// and only the untimed lines need tapping.
export default function SyncLyricsModal({ track, onClose, onSaved }) {
  const p = usePlayer();
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState(track.lyrics_text || "");
  const [lines, setLines] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);

  const cursorRef = useRef(null);
  const positionRef = useRef(p.position);
  positionRef.current = p.position;

  const syncing = !!lines;
  const ready = syncing && lines.length > 0 && lines.every((l) => l.start_time_ms != null);
  const stamped = syncing ? lines.filter((l) => l.start_time_ms != null).length : 0;
  const nextLine = syncing ? lines[cursor] : null;

  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cursor, lines]);

  function stamp() {
    if (!syncing || cursor >= lines.length) return;
    const ms = Math.round(positionRef.current * 1000);
    setLines((prev) => prev.map((l, i) => (i === cursor ? { ...l, start_time_ms: ms } : l)));
    setCursor(cursor + 1);
  }

  function undo() {
    if (!syncing || cursor === 0) return;
    const prev = cursor - 1;
    setLines((ls) => ls.map((l, i) => (i === prev ? { ...l, start_time_ms: null } : l)));
    setCursor(prev);
  }

  // Space is the tap key while syncing.
  useEffect(() => {
    if (!syncing) return;
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        stamp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing, cursor, lines]);

  async function transcribe() {
    setTranscribing(true);
    try {
      const res = await base44.functions.invoke("generateLyrics", { track_id: track.id });
      const generated = res?.data?.lyrics || "";
      if (generated) setText(generated);
      else toast({ title: "No lyrics detected for this track", variant: "destructive" });
    } catch (e) {
      toast({
        title: e?.response?.data?.error || "Could not transcribe this track",
        variant: "destructive" });
    } finally {
      setTranscribing(false);
    }
  }

  function startSyncing() {
    const parsed = parseTimedLyrics(text);
    if (!parsed.length) {
      toast({ title: "Add some lyrics to sync first", variant: "destructive" });
      return;
    }
    const firstUntimed = parsed.findIndex((l) => l.start_time_ms == null);
    setLines(parsed);
    setCursor(firstUntimed === -1 ? parsed.length : firstUntimed);

    if (firstUntimed === -1) return;
    // Play from the top so every line can be tapped in order.
    if (p.currentTrack?.id === track.id) {
      p.seek(0);
      if (!p.isPlaying) p.togglePlay();
    } else {
      p.resumeTrack(track, 0, true);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const timed = withEndTimes(lines, p.duration || track.duration_seconds || 0);
      const payload = {
        track_id: track.id,
        uploader_id: user.id,
        lines: timed,
        status: "approved",
        out_of_sync: false,
        language_code: "en" };

      const existing = await base44.entities.Lyrics.filter(
        { track_id: track.id, uploader_id: user.id },
        "-created_date",
        1
      );
      if (existing?.length) await base44.entities.Lyrics.update(existing[0].id, payload);
      else await base44.entities.Lyrics.create(payload);

      toast({ title: "Karaoke lyrics saved" });
      onSaved?.();
    } catch {
      toast({ title: "Could not save synced lyrics", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-media/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}>
      <div
        className="bg-background w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Mic2 size={16} /> Karaoke lyrics
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!syncing ?
        <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-xs text-foreground/50 mb-2 px-1">
              Paste the lyrics, or let AI transcribe them. Timestamps like
              <span className="font-mono"> [1:04.20] </span>
              are picked up automatically — everything else gets tapped in while the track plays.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[280px] text-sm leading-relaxed bg-foreground/[0.03] border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
              placeholder={"One line per lyric…\n\n[0:12.40] First line\n[0:16.10] Second line"} />
            {transcribing &&
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground/60">
                <Loader2 size={14} className="animate-spin" /> Transcribing the audio…
              </div>
          }
          </div> :

        <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button
              onClick={() => p.togglePlay()}
              className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center shrink-0"
              aria-label={p.isPlaying ? "Pause" : "Play"}>
                {p.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
              onClick={() => p.seek(0)}
              className="w-9 h-9 rounded-full border border-border grid place-items-center shrink-0"
              aria-label="Restart from the top">
                <RotateCcw size={14} />
              </button>
              <span className="font-mono text-xs text-foreground/60">
                {formatStamp(p.position * 1000)}
              </span>
              <span className="ml-auto text-xs font-semibold text-foreground/50">
                {stamped}/{lines.length} synced
              </span>
            </div>

            <div className="p-4">
              <button
              onPointerDown={stamp}
              disabled={cursor >= lines.length}
              className="w-full py-5 rounded-2xl bg-foreground text-background font-extrabold flex flex-col items-center gap-1 disabled:opacity-40 active:scale-[0.99] transition">
                <Mic2 size={20} />
                {nextLine ? "Tap when this line starts" : "All lines synced"}
                {nextLine &&
              <span className="text-xs font-semibold opacity-70 line-clamp-1">
                    {nextLine.text}
                  </span>
              }
              </button>
              <p className="text-[11px] text-foreground/40 text-center mt-2">
                Or press space. Tap a synced line below to hear it.
              </p>

              <div className="mt-4 space-y-0.5">
                {lines.map((l, i) =>
              <button
                key={i}
                ref={i === cursor ? cursorRef : null}
                onClick={() => l.start_time_ms != null && p.seek(l.start_time_ms / 1000)}
                className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg transition ${
                i === cursor ?
                "bg-foreground/[0.06] ring-1 ring-foreground/15" :
                "hover:bg-foreground/[0.03]"}`
                }>
                    <span className="font-mono text-[11px] text-foreground/45 pt-0.5 shrink-0 w-12">
                      {formatStamp(l.start_time_ms)}
                    </span>
                    <span className={`selectable-content text-sm leading-snug ${
                i < cursor ? "text-foreground/50" : "text-foreground"}`}>
                      {l.text}
                    </span>
                  </button>
              )}
              </div>
            </div>
          </div>
        }

        <div className="p-4 border-t border-border flex items-center gap-2 shrink-0">
          {!syncing ?
          <>
              <button
              onClick={transcribe}
              disabled={transcribing}
              className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5 inline-flex items-center gap-1.5 disabled:opacity-40">
                <Sparkles size={14} /> Transcribe with AI
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5">
                Cancel
              </button>
              <button
              onClick={startSyncing}
              disabled={!text.trim()}
              className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50">
                Continue
              </button>
            </> :

          <>
              <button
              onClick={undo}
              disabled={cursor === 0}
              className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5 inline-flex items-center gap-1.5 disabled:opacity-40">
                <Undo2 size={14} /> Undo
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5">
                Cancel
              </button>
              <button
              onClick={save}
              disabled={!ready || saving}
              className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </>
          }
        </div>
      </div>
    </div>);

}