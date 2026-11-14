import {Search,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useEffect,useRef,useState} from 'react';
import {momentsApi,momentError} from '@/lib/momentsApi';

export function MomentGif({id, label="GIF reaction"}){
 if(!/^[a-zA-Z0-9]{1,64}$/.test(id||''))return null;
 return <img className="moment-comment-gif" src={'https://media.giphy.com/media/'+id+'/giphy.gif'} alt={label} loading="lazy" referrerPolicy="no-referrer"/>;
}

const GIF_CATEGORIES = ["Trending", "Laugh", "Love", "Celebrate", "Surprised", "Music"];

export default function MomentGifPicker({onSelect,onClose,inline=false}){
 const [query,setQuery]=useState(''),[items,setItems]=useState([]),[status,setStatus]=useState('');
 const [activeTerm,setActiveTerm]=useState(''),[failed,setFailed]=useState(false);
 const request=useRef(null);
 useEffect(()=>{search('');return ()=>request.current?.abort();},[]);
 async function search(term){
  request.current?.abort();
  const controller=new AbortController();request.current=controller;
  setActiveTerm(term);setFailed(false);
  setStatus('Loading GIFs…');setItems([]);
  try{
   const result=await momentsApi('gif_search',{query:term||''});
   if(controller.signal.aborted)return;
   setItems(result.items||[]);setStatus(result.items?.length?'':'No GIFs found.');
  }catch(error){if(!controller.signal.aborted){setFailed(true);setStatus(momentError(error));}}
 }
 const content=<>
  <form onSubmit={event=>{event.preventDefault();search(query.trim());}}>
   <button type="submit" aria-label="Search GIFs"><Search size={20}/></button><input placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/>
  </form>
  <div className="moment-gif-categories" role="group" aria-label="GIF categories">
   {GIF_CATEGORIES.map(category=>{
    const term=category==="Trending"?"":category;
    return <button type="button" key={category} aria-pressed={activeTerm===term} onClick={()=>{setQuery(term);search(term);}}>{category}</button>;
   })}
  </div>
  {status&&<p role="status">{status} {failed&&<button type="button" className="underline" onClick={()=>search(activeTerm)}>Retry</button>}</p>}
  <div className="moment-gif-results">{items.map(item=><button type="button" key={item.id} aria-label={'Choose '+item.title} onClick={()=>onSelect(item.id)}>
   <img src={item.preview} alt={item.title} loading="lazy"/>
  </button>)}</div>
  <small>Powered by GIPHY</small>
 </>;
 if(inline)return <section className="moment-gif-picker moment-gif-inline" aria-label="Choose a GIF">
  <header><strong>Choose a GIF</strong><button type="button" aria-label="Close GIF picker" onClick={onClose}><X size={18}/></button></header>
  {content}
 </section>;
 return <Dialog open onOpenChange={open=>{if(!open)onClose?.();}}>
  <DialogContent className="moment-gif-picker" onOpenAutoFocus={event=>event.preventDefault()}>
   <span className="moment-gif-handle" aria-hidden="true"/>
   <DialogTitle className="sr-only">Choose a GIF</DialogTitle>
   <DialogDescription className="sr-only">Browse trending GIFs or search GIPHY.</DialogDescription>
   {content}
  </DialogContent>
 </Dialog>;
}
