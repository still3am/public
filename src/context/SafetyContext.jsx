import {createContext,useContext,useEffect,useState,useCallback,useRef} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {readAllPages} from '@/lib/readPages';
const EMPTY=new Set(),Context=createContext({blocked:EMPTY,own:[],reload:async()=>{}});
export function SafetyProvider({children}){
 const {user}=useAuth(),uid=user?.id;
 const [state,setState]=useState({uid:null,blocked:EMPTY,own:[]}),request=useRef(0),account=useRef(uid);account.current=uid;
 const reload=useCallback(async()=>{
  const current=++request.current;
  if(!uid){setState({uid:null,blocked:EMPTY,own:[]});return;}
  // Both participants can read a block under the native entity RLS.
  const rows=await readAllPages(opts=>base44.entities.Block.filter({$or:[{user_id:uid},{blocked_user_id:uid}]},{...opts}));
  if(current!==request.current||account.current!==uid)return;
  setState({uid,blocked:new Set(rows.map(row=>row.user_id===uid?row.blocked_user_id:row.user_id)),own:rows.filter(row=>row.user_id===uid)});
  window.dispatchEvent(new Event('catalog:invalidate'));
 },[uid]);
 useEffect(()=>{reload().catch(()=>{});return()=>{request.current++;};},[reload]);
 return <Context.Provider value={{blocked:state.uid===uid?state.blocked:EMPTY,own:state.uid===uid?state.own:[],reload}}>{children}</Context.Provider>;
}
export const useSafety=()=>useContext(Context);
