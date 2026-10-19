import {useEffect,useRef,useState} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import {createNotePreview} from '@/lib/notePreview';
export function useNotePreview({active,accountId,scope,resumeOnEnd=false}){
 const player=usePlayer(),latest=useRef(player),alive=useRef(true);
 latest.current=player;
 const [state,setState]=useState({trackId:null,playing:false,loading:false});
 const controller=useRef(null);
 if(!controller.current)controller.current=createNotePreview({resumeOnEnd,acquire:cancel=>latest.current.acquireNotePreview(cancel),createAudio:()=>{const audio=new Audio();audio.volume=latest.current.volume;audio.muted=latest.current.muted;return audio;},onChange:value=>{if(alive.current)setState(value);}});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current.stop();};},[]);
 useEffect(()=>{if(!active)controller.current.stop();},[active]);
 useEffect(()=>()=>controller.current.stop(),[accountId,scope]);
 useEffect(()=>{controller.current.setOutput(player.volume,player.muted,player.audioOutput?.state?.sinkId);},[player.volume,player.muted,player.audioOutput?.state?.sinkId,state.trackId]);
 return {...state,play:(track,ensure)=>controller.current.play(track,ensure),stop:()=>controller.current.stop()};
}