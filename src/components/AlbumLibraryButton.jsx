import {useEffect,useRef,useState} from 'react';
import {Plus,Check,Loader2} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {useLibrary} from '@/context/LibraryContext';
import {useToast} from '@/components/ui/use-toast';
import {saveAlbumToLibrary} from '@/lib/saveAlbumToLibrary';
export default function AlbumLibraryButton({tracks}){
 const {user}=useAuth(),{isInLibrary,refresh}=useLibrary(),{toast}=useToast(),nav=useNavigate();
 const [busy,setBusy]=useState(false),lock=useRef(false),account=useRef(user?.id),alive=useRef(true);
 account.current=user?.id;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const saved=tracks.length>0&&tracks.every(t=>isInLibrary(t.id));
 async function save(){
  if(!user){nav('/login?returnTo='+encodeURIComponent(window.location.pathname));return;}
  if(lock.current||saved)return;
  const uid=user.id;lock.current=true;setBusy(true);
  try{
   const result=await saveAlbumToLibrary(base44.entities.LibraryItem,uid,tracks,()=>alive.current&&account.current===uid);
   if(result.cancelled)return;
   await refresh();
   if(alive.current&&account.current===uid)toast({title:'Album added to your library'});
  }catch{if(alive.current&&account.current===uid)toast({title:'Couldn’t finish saving the album. Please retry.',description:'Songs already saved will stay in your library.',variant:'destructive'});}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <button className="release-add-button" onClick={save} disabled={busy||saved} aria-busy={busy} aria-label={busy?'Saving album':saved?'Album in your library':'Add album to library'} title={saved?'Album in your library':'Add album to library'}>{busy?<Loader2 size={23} className="animate-spin"/>:saved?<Check size={24}/>:<Plus size={24}/>}</button>;
}
