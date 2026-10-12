import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
const Context=createContext({blocked:new Set(),own:[],reload:async()=>{}});
export function SafetyProvider({children}) {
 const {user}=useAuth(),[blocked,setBlocked]=useState(new Set()),[own,setOwn]=useState([]);
 const reload=useCallback(async()=>{
  if(!user?.id){setBlocked(new Set());setOwn([]);return;}
  const r=await base44.functions.invoke('safety',{action:'blocked'});
  setBlocked(new Set(r.data.ids));setOwn(r.data.own||[]);
 },[user?.id]);
 useEffect(()=>{reload().catch(()=>{});},[reload]);
 return <Context.Provider value={{blocked,own,reload}}>{children}</Context.Provider>;
}
export const useSafety=()=>useContext(Context);
