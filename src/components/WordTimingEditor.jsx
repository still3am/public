import { useMemo, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { saveSyncedLyrics } from '@/api/base44Client';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
/** @param {any} props */
export default function WordTimingEditor({ track, text, onSaved, onCancel }) {
  const p = usePlayer(),saveLock = useRef(false);
  const units = useMemo(() => text.split('\n').map((s) => s.trim()).filter(Boolean).flatMap((line, lineIndex) => line.split(/\s+/).map((word) => ({ text: word, line: lineIndex }))), [text]);
  const [marks, setMarks] = useState([]),[error, setError] = useState(''),[busy, setBusy] = useState(false),[language, setLanguage] = useState('en');
  const mark = () => {if (p.currentTrack?.id !== track.id || !p.isPlaying) {setError('Start this track before timing words.');return;}const at = Math.round(p.position * 1000);if (marks.length && at < marks[marks.length - 1]) {setError('Restart timing or continue after the last marked word.');return;}setError('');setMarks([...marks, at]);};
  const save = async () => {if(saveLock.current)return;saveLock.current=true;setBusy(true);setError('');try {
      if(marks.length!==units.length || !units.length)throw Error('Time every word before saving.');
      const duration = Math.round(((p.currentTrack?.id === track.id ? p.duration : 0) || track.duration_seconds || 0) * 1000);
      const lines = [];
      units.forEach((w, i) => {if (!lines[w.line]) lines[w.line] = { text: '', start_time_ms: marks[i], end_time_ms: 0, words: [] };
        const end = marks[i + 1] ?? Math.max(marks[i] + 300, duration);
        const line = lines[w.line];line.text += (line.text ? ' ' : '') + w.text;line.end_time_ms = end;line.words.push({ text: w.text, start_time_ms: marks[i], end_time_ms: end });
      });
      const result = await saveSyncedLyrics({trackId: track.id, language, lines});
      onSaved?.(result);
    } catch (e) {setError(e?.response?.data?.error || e?.message || 'Could not save word timing. Your draft is still here.');} finally {saveLock.current=false;setBusy(false);}};
  return <div className="p-4 space-y-4 overflow-y-auto"><h3 className="font-bold">Word-by-word timing</h3><p className="text-sm text-muted-foreground">Play from the beginning, then tap Mark when each word starts. Timing must be complete before saving.</p>
 
 <div className="flex flex-wrap gap-2"><Button onClick={() => {setMarks([]);if (p.currentTrack?.id !== track.id) p.playTrackAt([track]);else {p.seek(0);if (!p.isPlaying) p.togglePlay();}}}>Start / restart</Button><Button variant="outline" onClick={() => p.togglePlay()}>Pause / resume</Button><Button variant="outline" onClick={() => setMarks(marks.slice(0, -1))}>Undo</Button></div>
 <div className="p-5 border rounded-2xl text-center"><div className="text-xs text-muted-foreground">{marks.length} / {units.length} words</div><div className="text-3xl font-bold py-4">{units[marks.length]?.text || 'Complete'}</div><Button className="w-full" disabled={marks.length >= units.length} onClick={mark}>Mark next word</Button></div>
 {error && <p role="alert" className="text-destructive text-sm">{error}</p>}<div className="flex gap-2"><Button variant="outline" onClick={onCancel}>Back</Button><Button disabled={busy || !units.length || marks.length !== units.length} onClick={save}>{busy ? 'Saving…' : 'Save word timing'}</Button></div></div>;
}