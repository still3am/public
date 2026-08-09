import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { Image } from "@/components/ui/image";
import { Play, Pause, Star, X, Plus } from "lucide-react";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";

function PinnedTrackCard({ track, onRemove, editMode }) {
  const p = usePlayer();
  const coverUrl = useCoverUrl(track.cover_art_url);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlaying = isCurrent && p.isPlaying;

  function handlePlay(e) {
    e.stopPropagation();
    if (isCurrent) p.togglePlay();else
    p.playTrackAt([track]);
  }

  return (
    <div className="group relative rounded-xl overflow-hidden bg-foreground/[0.03]">
      <div className="aspect-square relative">
        {coverUrl ?
        <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full" /> :

        <div className="w-full h-full grid place-items-center text-foreground/25 text-[10px] uppercase px-1 text-center">
            {track.genre}
          </div>
        }
        {!editMode &&
        <button
          onClick={handlePlay}
          className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/30 transition"
          aria-label={isPlaying ? "Pause" : "Play"}>
          
            <span className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center opacity-0 group-hover:opacity-100 transition active:scale-90">
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </span>
          </button>
        }
        {editMode &&
        <button
          onClick={() => onRemove(track.id)}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-foreground/80 text-background grid place-items-center"
          aria-label="Remove from Top 8">
          
            <X size={14} />
          </button>
        }
        {isPlaying && !editMode &&
        <div className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-background/85 backdrop-blur grid place-items-center">
            <div className="flex items-end gap-0.5 h-3">
              {[0, 1, 2].map((i) =>
            <span
              key={i}
              className="w-[2px] rounded-full bg-current"
              style={{ height: "100%", animation: `songbar ${0.6 + i * 0.18}s ease-in-out ${i * 0.08}s infinite` }} />

            )}
            </div>
          </div>
        }
      </div>
      <div className="p-2">
        <div className="text-xs font-semibold truncate">{track.title}</div>
        <div className="text-[10px] text-foreground/50 truncate">{track.artist || track.uploader_name}</div>
      </div>
    </div>);

}

export default function TopTracks({ trackIds, editMode, userTracks, onChange }) {
  const [pinnedTracks, setPinnedTracks] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const idsKey = (trackIds || []).join(",");
  useEffect(() => {
    const ids = (trackIds || []).filter(Boolean);
    if (!ids.length) {setPinnedTracks([]);return;}
    Promise.all(ids.map((id) => base44.entities.Track.get(id).catch(() => null))).then((results) =>
    setPinnedTracks(results.filter(Boolean))
    );
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function removeTrack(id) {
    onChange((trackIds || []).filter((tid) => tid !== id));
  }

  function toggleTrack(id) {
    const current = trackIds || [];
    if (current.includes(id)) {
      onChange(current.filter((tid) => tid !== id));
    } else if (current.length < 8) {
      onChange([...current, id]);
    }
  }

  const showSection = editMode || pinnedTracks.length > 0;

  if (!showSection) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2 hidden">
        <Star size={18} className="hidden" /> Top 8
      </h2>
      {pinnedTracks.length > 0 ?
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pinnedTracks.map((t) =>
        <PinnedTrackCard key={t.id} track={t} onRemove={removeTrack} editMode={editMode} />
        )}
          {editMode && pinnedTracks.length < 8 &&
        <button
          onClick={() => setPickerOpen(true)}
          className="aspect-square rounded-xl border-2 border-dashed border-border grid place-items-center text-foreground/40 hover:bg-foreground/[0.02] transition"
          aria-label="Add track">
          
              <Plus size={24} />
            </button>
        }
        </div> :
      editMode ?
      <button
        onClick={() => setPickerOpen(true)}
        className="w-full p-6 rounded-2xl border-2 border-dashed border-border text-sm text-foreground/50 hover:bg-foreground/[0.02] transition">
        
          + Pin your top 8 tracks
        </button> :
      null}
      {editMode && pinnedTracks.length > 0 && pinnedTracks.length < 8 &&
      <button
        onClick={() => setPickerOpen(true)}
        className="mt-3 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-foreground/5 transition">
        
          Add more
        </button>
      }
      {pickerOpen &&
      <TrackPickerSheet
        title="Choose your Top 8"
        selectedIds={trackIds || []}
        max={8}
        tracks={userTracks}
        onToggle={toggleTrack}
        onClose={() => setPickerOpen(false)} />

      }
    </div>);

}