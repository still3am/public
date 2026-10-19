import {useEffect,useRef,useState} from "react";
import {AudioOutput} from "@/lib/audioOutput";

export function useAudioOutput(audioRefs,activeIdxRef,audioCtxRef){
 const controller=useRef(null);
 if(!controller.current)controller.current=new AudioOutput({
  elements:()=>audioRefs.map(ref=>ref.current),
  active:()=>audioRefs[activeIdxRef.current]?.current,
  context:()=>audioCtxRef.current
 });
 const output=controller.current;
 const [state,setState]=useState(()=>output.snapshot());
 useEffect(()=>{
  const unsubscribe=output.subscribe(setState);output.bind();
  return()=>{unsubscribe();output.unbind();};
 },[output]);
 return {state,controller:output};
}
