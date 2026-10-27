import {useEffect,useMemo,useState} from 'react';
import {withReadTimeout} from '@/lib/readTimeout';
import {base44} from '@/api/base44Client';
import {measureNoteAudio,readNoteAudioBytes,suggestedNoteMoments} from '@/lib/noteHighlights';
const cache=new Map();
export function useNoteHighlights({track,accountId,active,length=30}) {
 const key=accountId&&track?.id?JSON.stringify([accountId,track.id,track.updated_date||'']):'';
 const [state,setState]=useState({key:'',profile:null,loading:false,error:''}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!active||!key)return;
  if(cache.has(key)){setState({key,profile:cache.get(key),loading:false,error:''});return;}
  let cancelled=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  setState({key,profile:null,loading:true,error:''});
  (async()=>{
   try{
    const Decoder=globalThis.OfflineAudioContext||Reflect.get(globalThis,'webkitOfflineAudioContext');
    if(!Decoder)throw Error('Audio analysis isn’t supported by this browser.');
    // The same authorized Track read used for playback resolves private audio.
    const fresh=await withReadTimeout(()=>base44.entities.Track.get(track.id),15000);
    if(cancelled||controller.signal.aborted)return;
    if(!fresh?.audio_url)throw Error('This song’s audio is unavailable.');
    if(Number(fresh.duration_seconds)>600)throw Error('This song is too long to analyze on this device.');
    const response=await fetch(fresh.audio_url,{signal:controller.signal});
    const bytes=await readNoteAudioBytes(response,controller.signal);
    if(cancelled||controller.signal.aborted)return;
    const decoder=new Decoder(1,1,11025),audio=await withReadTimeout(()=>decoder.decodeAudioData(bytes),20000,"Audio analysis took too long. Try again.");
    if(cancelled||controller.signal.aborted)return;
    const profile=measureNoteAudio(audio);
    cache.set(key,profile);if(cache.size>8)cache.delete(cache.keys().next().value);
    setState({key,profile,loading:false,error:''});
   }catch(error){if(!cancelled)setState({key,profile:null,loading:false,error:controller.signal.aborted?'Audio analysis took too long. Try again.':error?.message||'Couldn’t analyze this audio.'});}
   finally{clearTimeout(timer);if(!cancelled&&controller.signal.aborted)setState({key,profile:null,loading:false,error:'Audio analysis took too long. Try again.'});}
  })();
  return()=>{cancelled=true;clearTimeout(timer);controller.abort();};
 },[active,key,retry]);
 const current=state.key===key?state:null;
 const moments=useMemo(()=>suggestedNoteMoments(current?.profile,length),[current?.profile,length]);
 return {profile:current?.profile||null,loading:current?.loading||false,error:current?.error||'',moments,retry:()=>setRetry(value=>value+1)};
}
