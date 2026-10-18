import "./profile-edit-controls.css";
import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { Image } from "@/components/ui/image";
import { Play, Pause, X } from "lucide-react";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import HoverTrackMenu from "@/components/track/HoverTrackMenu";
import { useLongPressMenu } from "@/hooks/useLongPressMenu";

/** @param {any} props */
export default function ProfileSong({
  trackId,
  editMode,
  userTracks,
  onChange,
  fillHeight = false
}) {
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const pickedTrack = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const lp = useLongPressMenu(editMode, { allowButtons: true });

  useEffect(() => {
    if (!trackId) {
      setTrack(null);
      return;
    }
    const available = (userTracks || []).find((row) => row.id === trackId) || (pickedTrack.current?.id === trackId ? pickedTrack.current : null);
    setTrack((previous) => available || (previous?.id === trackId ? previous : null));
    let active = true;
    (async () => {try {
        let song;
        try {song = await base44.entities.Track.get(trackId);} catch (error) {
          const status = error?.status ?? error?.response?.status;if (status === 403 || status === 404) throw error;
          const page = await base44.entities.Track.filter({ id: trackId }, '-created_date', 1);song = (Array.isArray(page) ? page : page?.items || [])[0];
        }
        if (active && song) setTrack(song);
      } catch (error) {const status = error?.status ?? error?.response?.status;if (active && (status === 403 || status === 404)) setTrack(null);}})();
    return () => {active = false;};
  }, [trackId, userTracks]);

  const coverUrl = useCoverUrl(track?.cover_art_url);
  const isCurrent = p.currentTrack?.id === trackId;
  const isPlaying = isCurrent && p.isPlaying;

  function handlePlay() {
    if (!track || lp.consumeLongPress()) return;
    if (isCurrent) p.togglePlay();else
    p.playTrackAt([track]);
  }

  // Nothing to show and nothing to pick: no card at all, so a profile whose
  // featured track was deleted doesn't leave an empty box next to it.
  if (!editMode && !track) return null;

  if (fillHeight) {
    // The card owns its width so an absent track takes no space in the row.
    return (
      <div className="profile-featured md:w-80 lg:w-96 shrink-0">
      <div ref={lp.ref} {...lp.handlers} className="song-menu-surface group h-full flex flex-col rounded-2xl ring-1 ring-inset ring-foreground/10 bg-card overflow-hidden">
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
                type="button" className="profile-edit-circle relative hover:bg-foreground/10 text-foreground/50"
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
          <div className="profile-featured-content flex-1 flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 text-center">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl overflow-hidden bg-foreground/10 shrink-0">
              {coverUrl && <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" />}
            </div>
            <div className="w-full min-w-0">
              <div className="text-xs md:text-sm font-semibold truncate">{track.title}</div>
              <div className="text-[11px] md:text-xs text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
            </div>
            <button
              onClick={handlePlay}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-foreground text-background grid place-items-center shrink-0 active:scale-90 transition shadow-md"
              aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title || "profile song"}`}>
              
              {isPlaying ? <Pause size={20} fill="currentColor" className="w-4 h-4 md:w-5 md:h-5" /> : <Play size={20} fill="currentColor" className="ml-0.5 w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <HoverTrackMenu track={track} lp={lp} size={18} />
          </div> :
          null}
        {pickerOpen &&
          <TrackPickerSheet
            title="Choose profile song"
            selectedIds={trackId ? [trackId] : []}
            max={1}
            tracks={userTracks}
            onToggle={async (id, chosen) => {
              const saved = await onChange(id, chosen);
              if (saved === false) return;
              pickedTrack.current = chosen;setTrack(chosen);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)} />

          }
      </div>
      </div>);

  }

  if (editMode) {
    return (
      <div className="mb-6">
        

        
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
            type="button" className="profile-edit-circle relative hover:bg-foreground/10 text-foreground/50"
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
          onToggle={async (id, chosen) => {
            const saved = await onChange(id, chosen);
            if (saved === false) return;
            pickedTrack.current = chosen;setTrack(chosen);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)} />

        }
      </div>);

  }

  if (!trackId || !track) return null;

  return (
    <div className="mb-6">
      

      
      <div ref={lp.ref} {...lp.handlers} className="song-menu-surface group flex items-center gap-3 p-3 rounded-2xl border border-border bg-foreground/[0.02]">
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
          aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title || "profile song"}`}>
          
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <HoverTrackMenu track={track} lp={lp} size={18} />
      </div>
    </div>);

}