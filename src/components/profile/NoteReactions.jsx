import {useEffect,useRef,useState} from 'react';
import {SmilePlus,Loader2} from 'lucide-react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {requestPublicNote} from '@/lib/publicNoteActions';
import NoteEmojiPicker from './NoteEmojiPicker';
const quick=['❤️','🔥','😂','😍','👏','🥹'];
export default function NoteReactions({profileId,note,canReact,active=true}){
 const {user}=useAuth(),key=JSON.stringify([note.id,note.expires_at]);
 const [data,setData]=useState({counts:[],mine:'',total:0}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[picker,setPicker]=useState(false);
 const version=useRef(0),lock=useRef(false),account=useRef(user?.id),alive=useRef(true);
 account.current=user?.id;
 async function load(){
  if(!user?.id||!active||lock.current)return;
  const current=++version.current,uid=user.id;setLoading(true);setError('');
  try{const result=await requestPublicNote(base44,'noteReactions',[profileId,key]);if(alive.current&&current===version.current&&account.current===uid)setData(result);}
  catch{if(alive.current&&current===version.current)setError('Couldn’t load reactions.');}
  finally{if(alive.current&&current===version.current)setLoading(false);}
 }
 useEffect(()=>{
  alive.current=true;setData({counts:[],mine:'',total:0});setPicker(false);load();
  const timer=active?setInterval(()=>{if(document.visibilityState==='visible')load();},30000):null;
  return()=>{alive.current=false;version.current++;clearInterval(timer);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[profileId,key,user?.id,active]);
 async function react(emoji){
  if(!canReact||!user?.id||lock.current||!active)return;
  const uid=user.id,current=++version.current;lock.current=true;setBusy(true);setError('');setPicker(false);
  try{
   const result=await requestPublicNote(base44,'reactNote',[profileId,key,data.mine===emoji?'':emoji]);
   if(alive.current&&current===version.current&&account.current===uid)setData(result);
  }catch(e){if(alive.current&&current===version.current)setError(e?.response?.status===409||e?.response?.status===404?'This note changed or expired. Close it and open the latest note.':'Couldn’t save your reaction. Please try again.');}
  finally{lock.current=false;if(alive.current&&current===version.current){setBusy(false);setLoading(false);}}
 }
 return <section className="public-note-reactions" aria-label="Note reactions" aria-busy={busy}>
  <div className="public-note-reaction-heading"><strong>Reactions{data.total>0?' · '+data.total:''}</strong>{(loading||busy)&&<Loader2 size={14} className="animate-spin"/>}</div>
  {data.counts.length>0&&<div className="public-note-reaction-counts">{data.counts.map(({emoji,count})=>canReact?<button type="button" key={emoji} disabled={busy||loading} aria-pressed={data.mine===emoji} aria-label={emoji+' · '+count+(data.mine===emoji?' · remove your reaction':' · react')} onClick={()=>react(emoji)}><span>{emoji}</span><small>{count}</small></button>:<span className="public-note-reaction-count" key={emoji}><span>{emoji}</span><small>{count}</small></span>)}</div>}
  {!loading&&!data.total&&<p className="public-note-reaction-empty">{canReact?'Send a little reaction.':'No reactions yet.'}</p>}
  {canReact&&<div className="public-note-reaction-quick" role="group" aria-label="React to this note">{quick.map(emoji=><button type="button" key={emoji} disabled={busy||loading} aria-label={'React '+emoji} aria-pressed={data.mine===emoji} onClick={()=>react(emoji)}>{emoji}</button>)}<button type="button" disabled={busy||loading} aria-label="More reaction emojis" aria-expanded={picker} onClick={()=>setPicker(value=>!value)}><SmilePlus size={21}/></button></div>}
  {canReact&&picker&&<NoteEmojiPicker selected={data.mine} disabled={busy} onSelect={react}/>}
  {error&&<p className="public-note-error" role="alert">{error} <button type="button" className="underline" disabled={busy} onClick={load}>Retry</button></p>}
 </section>;
}
