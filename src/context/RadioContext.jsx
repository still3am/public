import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {usePlayer} from "@/context/PlayerContext";
import {useAuth} from "@/lib/AuthContext";

const RadioContext=createContext(null);
export const useRadio=()=>useContext(RadioContext);
export function RadioProvider({children}){
 const p=usePlayer(),{user}=useAuth(),latest=useRef(p);latest.current=p;
 const [schedule,setSchedule]=useState(null),[loading,setLoading]=useState(false),[notice,setNotice]=useState(""),[joined,setJoined]=useState(false),[clock,setClock]=useState(Date.now());
 const state=useRef(null),offset=useRef(0),joinedRef=useRef(false),inflight=useRef(null),version=useRef(0),lastCommand=useRef(0),activeSlot=useRef(null);
 const apply=entry=>{
  if(!entry?.track){joinedRef.current=false;setJoined(false);setNotice("This song is unavailable. Join again when the next song starts.");return;}
  const player=latest.current;
  lastCommand.current=Date.now();activeSlot.current=entry.start_ms;
  player.setShuffle(false);player.setRepeat("off");player.setPlaybackRate(1);
  player.resumeTrack({...entry.track,_public_radio:true,_public_radio_slot:entry.start_ms},Math.max(0,(Date.now()+offset.current-entry.start_ms)/1000),true);
  joinedRef.current=true;setJoined(true);setNotice("");
 };
 const currentEntry=()=>state.current?.slots?.find(slot=>slot.start_ms<=Date.now()+offset.current&&slot.end_ms>Date.now()+offset.current);
 const refresh=async()=>{
  if(inflight.current)return inflight.current;
  const epoch=version.current,started=Date.now();setLoading(true);setNotice("");
  const request=base44.functions.invoke("publicRadio",{}).then(response=>{
   if(epoch!==version.current)return null;
   const data=response?.data;
   if(!Array.isArray(data?.slots)||!Number.isFinite(data.server_now))throw Error("Invalid station response");
   offset.current=data.server_now-Date.now();
   state.current=data;setSchedule(data);setClock(Date.now()+offset.current);return data;
  }).catch(error=>{
   if(epoch===version.current){setNotice(Number(error?.response?.status)===402?"Radio needs available app integration credits. Try again later.":"The station couldn't connect. Try joining again.");joinedRef.current=false;setJoined(false);}
   return null;
  }).finally(()=>{if(inflight.current===request)inflight.current=null;if(epoch===version.current)setLoading(false);});
  inflight.current=request;return request;
 };
 const join=async()=>{
  if(!user?.id)return;
  if(!currentEntry()){if(!await refresh())return;}
  apply(currentEntry());
 };
 const pause=()=>{
  joinedRef.current=false;setJoined(false);
  if(latest.current.currentTrack?._public_radio&&latest.current.isPlaying)latest.current.togglePlay();
 };
 useLayoutEffect(()=>{
  version.current++;state.current=null;inflight.current=null;joinedRef.current=false;activeSlot.current=null;
  setSchedule(null);setJoined(false);setNotice("");setLoading(false);
 },[user?.id]);
 useEffect(()=>{
  const timer=setInterval(()=>{
   const now=Date.now()+offset.current;setClock(now);
   if(!joinedRef.current)return;
   const player=latest.current;
   if(Date.now()-lastCommand.current>4000&&(!player.currentTrack||!player.currentTrack._public_radio)){joinedRef.current=false;setJoined(false);return;}
   const entry=currentEntry();
   if(!entry){refresh().then(data=>{if(data&&joinedRef.current)apply(currentEntry());});return;}
   if(entry.start_ms!==activeSlot.current)apply(entry);
  },1000);
  const resume=()=>{if(!document.hidden&&joinedRef.current){const entry=currentEntry();if(entry)apply(entry);else join();}};
  const onJoin=()=>join();
  const onPause=()=>{joinedRef.current=false;setJoined(false);};
  const onFailure=()=>{if(latest.current.currentTrack?._public_radio){joinedRef.current=false;setJoined(false);}};
  const onClear=()=>{joinedRef.current=false;setJoined(false);};
  document.addEventListener("visibilitychange",resume);
  window.addEventListener("publicradio:join",onJoin);window.addEventListener("publicradio:pause",onPause);
  window.addEventListener("player:error",onFailure);window.addEventListener("account:cleared",onClear);
  return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",resume);window.removeEventListener("publicradio:join",onJoin);window.removeEventListener("publicradio:pause",onPause);window.removeEventListener("player:error",onFailure);window.removeEventListener("account:cleared",onClear);};
 },[user?.id]);
 const current=schedule?.slots?.find(slot=>slot.start_ms<=clock&&slot.end_ms>clock);
 return <RadioContext.Provider value={{schedule,current,clock,loading,notice,joined,refresh,join,pause}}>{children}</RadioContext.Provider>;
}
