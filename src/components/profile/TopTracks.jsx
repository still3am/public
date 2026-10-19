import "./profile-edit-controls.css";
import {DragDropContext,Droppable,Draggable} from "@hello-pangea/dnd";
import {GripVertical} from "lucide-react";
import {reorderTopTracks} from "@/lib/profileEditing";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { Image } from "@/components/ui/image";
import { Play, Pause, X, Plus } from "lucide-react";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import HoverTrackMenu from "@/components/track/HoverTrackMenu";
import { useLongPressMenu } from "@/hooks/useLongPressMenu";

/** @param {any} props */
function PinnedTrackCard({ track, onRemove, editMode,queue,index }) {
  const p = usePlayer();
  const coverUrl = useCoverUrl(track.cover_art_url);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlaying = isCurrent && p.isPlaying;
  const lp = useLongPressMenu(editMode,{allowButtons:true});

  function handlePlay(e) {
    e.stopPropagation();
    if (lp.consumeLongPress()) return;
    if (isCurrent) p.togglePlay();else
    p.playTrackAt(queue,index);
  }

  return (
    <div ref={lp.ref} {...lp.handlers} className="song-menu-surface group relative rounded-xl overflow-hidden bg-foreground/[0.03]">
      <div className="aspect-square relative">
        {!editMode &&
        <HoverTrackMenu
          track={track}
          lp={lp}
          size={15}
          className="absolute top-1 right-1 z-10"
          buttonClassName="w-8 h-8 rounded-full grid place-items-center bg-background/85 backdrop-blur text-foreground shadow-sm active:scale-90 transition" />
        }
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
          aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title || "song"}`}>
          
            <span className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center opacity-0 group-hover:opacity-100 transition active:scale-90">
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </span>
          </button>
        }
        {editMode &&
        <button
          onClick={() => onRemove(track.id)}
          type="button" className="profile-edit-circle profile-edit-circle-small absolute top-1.5 right-1.5 bg-foreground/80 text-background"
          aria-label={`Remove ${track.title || "song"} from Top 8`}>
          
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


function EditCover({url}){const source=useCoverUrl(url);return source?<img className="profile-top8-edit-cover" src={source} alt=""/>:<span className="profile-top8-edit-cover bg-muted"/>;}
export default function TopTracks({trackIds=[],editMode,userTracks,onChange,label,onLabelChange,disabled=false}){
 const p=usePlayer(),[pinnedTracks,setPinnedTracks]=useState([]),[pickerOpen,setPickerOpen]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const idsKey=trackIds.join(',');
 useEffect(()=>{let active=true;if(!trackIds.length){setPinnedTracks([]);return;}
 Promise.all(trackIds.map(id=>base44.entities.Track.get(id).catch(()=>null))).then(results=>{if(active)setPinnedTracks(results.filter(Boolean));});return()=>{active=false;};},[idsKey,revision]); // eslint-disable-line react-hooks/exhaustive-deps
 const byId=new Map(pinnedTracks.map(t=>[t.id,t]));
 function toggle(id){if(disabled)return;onChange(trackIds.includes(id)?trackIds.filter(t=>t!==id):trackIds.length<8?[...trackIds,id]:trackIds);}
 if(!editMode&&!trackIds.length)return null;
 async function playAll(){setError('');try{p.setShuffle(false);await p.playTrackAt(pinnedTracks,0);}catch{setError('Couldn’t play these songs. Please retry.');}}
 return <section className="profile-pinned-section mb-8">
 <div className="profile-top8-heading"><h2>{editMode?'Your Top 8':label||'My rotation'}</h2>{!editMode&&pinnedTracks.length>0&&<button type="button" onClick={playAll}><Play size={14} fill="currentColor"/>Play all</button>}</div>
 {editMode&&<><label className="profile-top8-label">Section title<input aria-label="Top 8 section title" maxLength={40} disabled={disabled} placeholder="My rotation" value={label||''} onChange={e=>onLabelChange?.(e.target.value)}/></label><p className="text-xs text-muted-foreground mb-3">Choose up to eight songs. Drag a handle to reorder, or focus it and press Space to use the arrow keys.</p>
 <DragDropContext onDragEnd={({source,destination})=>{if(destination&&!disabled)onChange(reorderTopTracks(trackIds,source.index,destination.index));}}>
 <Droppable droppableId="profile-top-eight">{provided=><div className="profile-top8-edit-list" ref={provided.innerRef} {...provided.droppableProps}>{trackIds.map((id,index)=>{const t=byId.get(id);return <Draggable key={id} draggableId={id} index={index} isDragDisabled={disabled}>{drag=><div ref={drag.innerRef} {...drag.draggableProps} className="profile-top8-edit-row"><button type="button" className="profile-top8-handle" aria-label={'Move '+(t?.title||'unavailable song')} {...drag.dragHandleProps}><GripVertical size={19}/></button><EditCover url={t?.cover_art_url}/><div className="profile-top8-edit-meta"><strong>{index+1}. {t?.title||'Unavailable song'}</strong><small>{t?.artist||'Remove this song or try again later'}</small></div><button type="button" disabled={disabled} className="profile-edit-circle profile-edit-circle-small" aria-label={'Remove '+(t?.title||'unavailable song')} onClick={()=>onChange(trackIds.filter(tid=>tid!==id))}><X size={14}/></button></div>}</Draggable>;})}{provided.placeholder}</div>}</Droppable></DragDropContext>
 <button type="button" disabled={disabled||trackIds.length>=8} onClick={()=>setPickerOpen(true)} className="playlist-action"><Plus size={16}/>Add songs · {trackIds.length}/8</button></>}
 {!editMode&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{pinnedTracks.map((track,index)=><PinnedTrackCard key={track.id} track={track} queue={pinnedTracks} index={index}/>)}</div>}
 {!editMode&&trackIds.length>pinnedTracks.length&&<p className="text-xs text-muted-foreground mt-3">Some selected songs are unavailable. <button type="button" className="underline" onClick={()=>setRevision(v=>v+1)}>Retry</button></p>}
 {error&&<p role="alert" className="profile-editor-error">{error}</p>}
 {pickerOpen&&<TrackPickerSheet title="Choose your Top 8" selectedIds={trackIds} max={8} tracks={userTracks} onToggle={toggle} onClose={()=>setPickerOpen(false)}/>}
 </section>;
}
