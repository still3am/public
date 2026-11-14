import {Search} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useEffect,useRef,useState} from 'react';

export function MomentGif({id, label="GIF reaction"}){
 if(!/^[a-zA-Z0-9]{1,64}$/.test(id||''))return null;
 return <img className="moment-comment-gif" src={'https://media.giphy.com/media/'+id+'/giphy.gif'} alt={label} loading="lazy" referrerPolicy="no-referrer"/>;
}

export default function MomentGifPicker({onSelect,onClose}){
 const [query,setQuery]=useState(''),[items,setItems]=useState([]),[status,setStatus]=useState('');
 const request=useRef(null);
 useEffect(()=>{load("");return ()=>request.current?.abort();},[]);
 async function load(term){
  const key=import.meta.env.VITE_GIPHY_API_KEY;
  if(!key){setStatus('GIF search is currently unavailable.');return;}
  request.current?.abort();
  const controller=new AbortController();request.current=controller;
  setStatus('Searching…');setItems([]);
  try{
   const params=new URLSearchParams({api_key:key,rating:'g',limit:'24'});
   if(term)params.set('q',term);
   const response=await fetch('https://api.giphy.com/v1/gifs/'+(term?'search':'trending')+'?'+params,{signal:controller.signal});
   if(!response.ok)throw Error();
   const {data}=await response.json();
   if(controller.signal.aborted)return;
   const results=data.filter(item=>item.rating==='g'&&item.images?.fixed_width_small?.url);
   setItems(results);setStatus(results.length?'':'No GIFs found.');
  }catch{if(!controller.signal.aborted)setStatus('GIF search failed. Try again.');}
 }
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}>
 <DialogContent className="moment-gif-picker" onOpenAutoFocus={event=>event.preventDefault()}>
  <span className="moment-gif-handle" aria-hidden="true"/>
  <DialogTitle className="sr-only">Choose a GIF</DialogTitle>
  <DialogDescription className="sr-only">Browse trending GIFs or search GIPHY.</DialogDescription>
  <form onSubmit={event=>{event.preventDefault();load(query.trim());}}><input placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/><button type="submit" aria-label="Search"><Search size={20}/></button></form>
  {status&&<p role="status">{status}</p>}
  <div className="moment-gif-results">{items.map(item=><button type="button" key={item.id} onClick={()=>onSelect(item.id)}>
   <img src={item.images.fixed_width_small.url} alt={item.title||'Choose GIF'} loading="lazy"/>
  </button>)}</div>
  <small>Powered by GIPHY</small>
 </DialogContent></Dialog>;
}
