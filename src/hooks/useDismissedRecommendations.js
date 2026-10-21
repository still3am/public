import {useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {readAllPages} from "@/lib/readPages";
export function useDismissedRecommendations(uid){
 const [state,setState]=useState({uid:null,rows:[],last:null}),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const account=useRef(uid),lock=useRef(false);account.current=uid;
 useEffect(()=>{let alive=true;setError("");if(!uid){setState({uid:null,rows:[],last:null});return;}
 readAllPages(opts=>base44.entities.RecommendationDismissal.filter({user_id:uid},{...opts})).then(rows=>{if(alive)setState({uid,rows,last:null});}).catch(()=>{if(alive)setError("Hidden recommendations could not load. Refresh to retry.");});return()=>{alive=false;};},[uid]);
 async function hide(track){if(!uid||lock.current)return;lock.current=true;setBusy(true);setError("");try{
 if((await base44.auth.me())?.id!==uid)throw Error();
 const row=await base44.entities.RecommendationDismissal.create({user_id:uid,track_id:track.id});if(!row?.id)throw Error();
 if(account.current===uid)setState(old=>({uid,rows:[...(old.uid===uid?old.rows:[]),row],last:track.id}));
 }catch{if(account.current===uid)setError("This recommendation could not be hidden. Try again.");}finally{lock.current=false;if(account.current===uid)setBusy(false);}}
 async function undo(){const id=state.last;if(!uid||!id||lock.current)return;lock.current=true;setBusy(true);try{
 if((await base44.auth.me())?.id!==uid)throw Error();
 await base44.entities.RecommendationDismissal.deleteMany({user_id:uid,track_id:id});
 if(account.current===uid)setState(old=>({...old,rows:old.rows.filter(row=>row.track_id!==id),last:null}));
 }catch{if(account.current===uid)setError("Could not restore this recommendation. Try again.");}finally{lock.current=false;if(account.current===uid)setBusy(false);}}
 return {ids:new Set(state.uid===uid?state.rows.map(row=>row.track_id):[]),last:state.uid===uid?state.last:null,hide,undo,error,busy};
}
