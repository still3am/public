import { useMemo, useState } from "react";
import { Play, ListMusic, Plus, Download, Trash2, Loader2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

function Action({ icon: Icon, label, onClick, disabled, danger, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition disabled:opacity-35 ${
      danger ? "text-destructive hover:bg-destructive/10" : "text-foreground/80 hover:bg-foreground/[0.06]"}`
      }>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>);

}

// Bulk tools for the saved grid: play, queue, save offline, file into a
// playlist, or clear several songs out of the library at once.
export default function LibrarySelectionBar({ tracks, selectedIds, onSelectionChange, onExit, onRemoved }) {
  const p = usePlayer();
  const { removeMany } = useLibrary();
  const cache = useOfflineCache();
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => tracks.filter((t) => selectedIds.has(t.id)),
    [tracks, selectedIds]
  );
  const count = selected.length;
  const allSelected = tracks.length > 0 && count === tracks.length;

  const toggleAll = () =>
  onSelectionChange(allSelected ? new Set() : new Set(tracks.map((t) => t.id)));

  const playSelected = () => {
    if (!count) return;
    p.playTrackAt(selected, 0);
    onExit();
  };

  const queueSelected = () => {
    if (!count) return;
    p.addManyToQueue(selected);
    toast({ title: `Added ${count} ${count === 1 ? "song" : "songs"} to the queue` });
    onExit();
  };

  const saveOffline = async () => {
    if (!count) return;
    setBusy(true);
    let saved = 0;
    for (const t of selected) {
      if (cache.isCached(t.id) || !t.audio_url) continue;
      const ok = await cache.downloadTrack(t);
      if (ok) saved++;
    }
    setBusy(false);
    toast({
      title: saved ?
      `Saved ${saved} ${saved === 1 ? "song" : "songs"} offline` :
      "Already saved offline" });

    onExit();
  };

  const removeSelected = async () => {
    const n = count;
    setBusy(true);
    await removeMany(selected.map((t) => t.id));
    setBusy(false);
    setConfirming(false);
    toast({ title: `Removed ${n} ${n === 1 ? "song" : "songs"} from your library` });
    onRemoved?.();
  };

  return (
    <>
      <div className="sticky top-2 z-20 mb-3 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={onExit}
            className="text-xs font-bold text-foreground/70 hover:text-foreground transition">
            Cancel
          </button>
          <span className="text-sm font-extrabold tracking-tight">
            {count} selected
          </span>
          <button
            onClick={toggleAll}
            className="ml-auto text-xs font-bold text-foreground/70 hover:text-foreground transition">
            {allSelected ? "Clear" : "Select all"}
          </button>
        </div>
        <div className="tab-strip flex items-center gap-1 px-2 py-1.5">
          <Action icon={Play} label="Play" disabled={!count} onClick={playSelected} />
          <Action
            icon={ListMusic}
            label="Playlist"
            disabled={!count}
            onClick={() => setShowPicker(true)} />
          <Action icon={Plus} label="Queue" disabled={!count} onClick={queueSelected} />
          <Action
            icon={Download}
            label="Offline"
            disabled={!count || busy}
            busy={busy}
            onClick={saveOffline} />
          <Action
            icon={Trash2}
            label="Remove"
            disabled={!count || busy}
            danger
            onClick={() => setConfirming(true)} />
        </div>
      </div>

      {showPicker &&
      <PlaylistPickerModal
        tracks={selected}
        onClose={() => setShowPicker(false)}
        onAdded={(pl, added) => {
          toast({
            title: `Added ${added} ${added === 1 ? "song" : "songs"} to ${pl.name}` });

          setShowPicker(false);
          onExit();
        }} />

      }

      {confirming &&
      <div className="fixed inset-0 z-[60] grid place-items-center p-6 bg-media/50">
          <div className="bg-card rounded-2xl ring-1 ring-border max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-destructive/10 grid place-items-center mx-auto mb-3">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight mb-1.5">
              Remove {count} {count === 1 ? "song" : "songs"}?
            </h3>
            <p className="text-sm text-foreground/55 mb-5">
              They'll be taken out of your library — you can always save them again.
            </p>
            <div className="flex items-center gap-2">
              <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-full bg-foreground/[0.06] text-sm font-bold active:scale-95 transition">
                Cancel
              </button>
              <button
              onClick={removeSelected}
              disabled={busy}
              className="flex-1 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold active:scale-95 transition inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 size={14} className="animate-spin" />} Remove
              </button>
            </div>
          </div>
        </div>
      }
    </>);

}