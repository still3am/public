import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { Image } from "@/components/ui/image";
import { Play, Pause, Music, X } from "lucide-react";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";

export default function ProfileSong({
  trackId,
  editMode,
  userTracks,
  onChange,
  fillHeight = false
}) {
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!trackId) {
      setTrack(null);
      return;
    }
    base44.entities.Track.get(trackId).then(setTrack).catch(() => setTrack(null));
  }, [trackId]);

  const coverUrl = useCoverUrl(track?.cover_art_url);
  const isCurrent = p.currentTrack?.id === trackId;
  const isPlaying = isCurrent && p.isPlaying;

  function handlePlay() {
    if (!track) return;
    if (isCurrent) p.togglePlay();else
    p.playTrackAt([track]);
  }

  if (fillHeight) {
    return (
      <div className="h-full flex flex-col rounded-2xl ring-1 ring-inset ring-foreground/10 bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/40 flex items-center gap-1.5">
            <Music size={14} className="hidden" /> Profile Song
          </span>
        </div>
        {editMode ?
        trackId && track ?
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-foreground/10 shrink-0">
                {coverUrl && <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" />}
              </div>
              <div className="w-full min-w-0">
                <div className="text-sm font-semibold truncate">{track.title}</div>
                <div className="text-xs text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
              onClick={() => setPickerOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border hover:bg-foreground/5 transition">
              
                  Change
                </button>
                <button
              onClick={() => onChange("")}
              className="p-2 rounded-full hover:bg-foreground/10 text-foreground/50"
              aria-label="Remove profile song">
              
                  <X size={16} />
                </button>
              </div>
            </div> :

        <div className="flex-1 flex items-center justify-center p-4">
              <button
            onClick={() => setPickerOpen(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-border text-sm text-foreground/50 hover:bg-foreground/[0.02] transition">
            
                + Choose your profile song
              </button>
            </div> :

        trackId && track ?
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-foreground/10 shrink-0">
              {coverUrl && <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" />}
            </div>
            <div className="w-full min-w-0">
              <div className="text-sm font-semibold truncate">{track.title}</div>
              <div className="text-xs text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
            </div>
            <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-foreground text-background grid place-items-center shrink-0 active:scale-90 transition shadow-md"
            aria-label={isPlaying ? "Pause" : "Play"}>
            
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
          </div> :
        null}
        {pickerOpen &&
        <TrackPickerSheet
          title="Choose profile song"
          selectedIds={trackId ? [trackId] : []}
          max={1}
          tracks={userTracks}
          onToggle={(id) => {
            onChange(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)} />

        }
      </div>);

  }

  if (editMode) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
          <Music size={18} /> Profile Song
        </h2>
        {trackId && track ?
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-foreground/[0.02]">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-foreground/10 shrink-0">
              {coverUrl && <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{track.title}</div>
              <div className="text-xs text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
            </div>
            <button
            onClick={() => setPickerOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border hover:bg-foreground/5 transition">
            
              Change
            </button>
            <button
            onClick={() => onChange("")}
            className="p-2 rounded-full hover:bg-foreground/10 text-foreground/50"
            aria-label="Remove profile song">
            
              <X size={16} />
            </button>
          </div> :

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full p-4 rounded-2xl border-2 border-dashed border-border text-sm text-foreground/50 hover:bg-foreground/[0.02] transition">
          
            + Choose your profile song
          </button>
        }
        {pickerOpen &&
        <TrackPickerSheet
          title="Choose profile song"
          selectedIds={trackId ? [trackId] : []}
          max={1}
          tracks={userTracks}
          onToggle={(id) => {
            onChange(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)} />

        }
      </div>);

  }

  if (!trackId || !track) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <Music size={18} /> Profile Song
      </h2>
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-foreground/[0.02]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-foreground/10 shrink-0">
          {coverUrl && <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base font-semibold truncate">{track.title}</div>
          <div className="text-xs sm:text-sm text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
        </div>
        <button
          onClick={handlePlay}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-foreground text-background grid place-items-center shrink-0 active:scale-90 transition shadow-md"
          aria-label={isPlaying ? "Pause" : "Play"}>
          
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>
    </div>);

}