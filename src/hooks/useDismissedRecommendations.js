import {setRecommendationHidden} from "@/lib/recommendationActions";
import {useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {readAllPages} from "@/lib/readPages";
export function useDismissedRecommendations(uid){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState({uid:null,rows:[],last:null}),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const account=useRef(uid),lock=useRef(null);account.current=uid;
 useEffect(()=>{let alive=true;setError("");setBusy(false);lock.current=null;if(!uid){setState({uid:null,rows:[],last:null});return;}
 readAllPages(opts=>base44.entities.RecommendationDismissal.filter({user_id:uid},{...opts})).then(rows=>{if(alive)setState({uid,rows,last:null});}).catch(()=>{if(alive)setError("Hidden recommendations could not load. Refresh to retry.");});return()=>{alive=false;};},[uid,revision]);
 async function hide(track){if(!uid||lock.current)return;const token={};lock.current=token;setBusy(true);setError("");try{
 const rows=await setRecommendationHidden(base44,uid,track.id,true);const row=rows[0];
 if(account.current===uid)setState(old=>({uid,rows:[...(old.uid===uid?old.rows:[]),row],last:track.id}));
 }catch{if(account.current===uid)setError("This recommendation could not be hidden. Try again.");}finally{if(lock.current===token){lock.current=null;if(account.current===uid)setBusy(false);}}}
 async function undo(){const id=state.last;if(!uid||!id||lock.current)return;const token={};lock.current=token;setBusy(true);setError("");try{
 await setRecommendationHidden(base44,uid,id,false);
 if(account.current===uid)setState(old=>({...old,rows:old.rows.filter(row=>row.track_id!==id),last:null}));
 }catch{if(account.current===uid)setError("Could not restore this recommendation. Try again.");}finally{if(lock.current===token){lock.current=null;if(account.current===uid)setBusy(false);}}}
 return {retry:()=>setRevision(n=>n+1),ids:new Set(state.uid===uid?state.rows.map(row=>row.track_id):[]),last:state.uid===uid?state.last:null,hide,undo,error,busy};
}
