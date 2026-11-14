import {Search,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useEffect,useRef,useState} from 'react';
import {momentsApi,momentError} from '@/lib/momentsApi';

export function MomentGif({id, label="GIF reaction"}){
 if(!/^[a-zA-Z0-9]{1,64}$/.test(id||''))return null;
 return <img className="moment-comment-gif" src={'https://media.giphy.com/media/'+id+'/giphy.gif'} alt={label} loading="lazy" referrerPolicy="no-referrer"/>;
}

export default function MomentGifPicker({onSelect,onClose,inline=false}){
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
 const content=<>
  <form onSubmit={event=>{event.preventDefault();search(query.trim());}}>
   <button type="submit" aria-label="Search GIFs"><Search size={20}/></button><input placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/>
  </form>
  {status&&<p role="status">{status}</p>}
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
