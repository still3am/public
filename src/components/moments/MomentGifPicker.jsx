import {Search} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useEffect,useRef,useState} from 'react';
import {momentsApi,momentError} from '@/lib/momentsApi';

export function MomentGif({id, label="GIF reaction"}){
 if(!/^[a-zA-Z0-9]{1,64}$/.test(id||''))return null;
 return <img className="moment-comment-gif" src={'https://media.giphy.com/media/'+id+'/giphy.gif'} alt={label} loading="lazy" referrerPolicy="no-referrer"/>;
}

export default function MomentGifPicker({onSelect}){
 const [query,setQuery]=useState(''),[items,setItems]=useState([]),[status,setStatus]=useState('');
 const request=useRef(null);
 useEffect(()=>{search('');return ()=>request.current?.abort();},[]);
 async function search(term){
  request.current?.abort();
  const controller=new AbortController();request.current=controller;
  setStatus('Loading GIFs…');setItems([]);
  try{
   const result=await momentsApi('gif_search',{query:term||''});
   if(controller.signal.aborted)return;
   setItems(result.items||[]);setStatus(result.items?.length?'':'No GIFs found.');
  }catch(error){if(!controller.signal.aborted)setStatus(momentError(error));}
 }
 return <Dialog open onOpenChange={open=>{if(!open)onSelect(null);}}>
 <DialogContent className="moment-gif-picker" onOpenAutoFocus={event=>event.preventDefault()}>
  <span className="moment-gif-handle" aria-hidden="true"/>
  <DialogTitle className="sr-only">Choose a GIF</DialogTitle>
  <DialogDescription className="sr-only">Browse trending GIFs or search GIPHY.</DialogDescription>
  <form onSubmit={event=>{event.preventDefault();search(query.trim());}}>
   <Search size={20}/><input placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/>
  </form>
  {status&&<p role="status">{status}</p>}
  <div className="moment-gif-results">{items.map(item=><button type="button" key={item.id} aria-label={'Choose '+item.title} onClick={()=>onSelect(item.id)}>
   <img src={item.preview} alt={item.title} loading="lazy"/>
  </button>)}</div>
  <small>Powered by GIPHY</small>
 </DialogContent></Dialog>;
}
