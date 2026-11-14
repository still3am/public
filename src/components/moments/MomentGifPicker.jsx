import {Search,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogClose} from '@/components/ui/dialog';
import {useEffect,useRef,useState} from 'react';
import {momentsApi,momentError} from '@/lib/momentsApi';

export function MomentGif({id, label="GIF reaction"}){
 if(!/^[a-zA-Z0-9]{1,64}$/.test(id||''))return null;
 return <img className="moment-comment-gif" src={'https://media.giphy.com/media/'+id+'/giphy.gif'} alt={label} loading="lazy" referrerPolicy="no-referrer"/>;
}

const GIF_CATEGORIES = ["Trending", "Laugh", "Love", "Celebrate", "Surprised", "Music"];

export default function MomentGifPicker({onSelect,onClose,inline=false,id}){
 const [query,setQuery]=useState(''),[items,setItems]=useState([]),[status,setStatus]=useState('');
 const [activeTerm,setActiveTerm]=useState(''),[failed,setFailed]=useState(false),[moreLoading,setMoreLoading]=useState(false),[hasMore,setHasMore]=useState(false),[moreFailed,setMoreFailed]=useState(false);
 const request=useRef(null),itemsRef=useRef([]),loadingMore=useRef(false),canLoadMore=useRef(false);
 useEffect(()=>{search('');return ()=>request.current?.abort();},[]);
 async function search(term){
  request.current?.abort();loadingMore.current=false;canLoadMore.current=false;itemsRef.current=[];
  const controller=new AbortController();request.current=controller;
  setActiveTerm(term);setFailed(false);setMoreFailed(false);setMoreLoading(false);setHasMore(false);
  setStatus('Loading GIFs…');setItems([]);
  try{
   const result=await momentsApi('gif_search',{query:term||'',offset:0});
   if(controller.signal.aborted)return;
   const next=result.items||[];itemsRef.current=next;canLoadMore.current=Boolean(result.has_more);setHasMore(Boolean(result.has_more));setItems(next);setStatus(next.length?'':'No GIFs found.');
  }catch(error){if(!controller.signal.aborted){setFailed(true);setStatus(momentError(error));}}
 }
 async function loadMore(){
  if(!canLoadMore.current||loadingMore.current)return;
  loadingMore.current=true;setMoreLoading(true);setMoreFailed(false);
  const controller=new AbortController();request.current=controller;
  try{
   const result=await momentsApi('gif_search',{query:activeTerm||'',offset:itemsRef.current.length});
   if(controller.signal.aborted)return;
   const current=itemsRef.current,known=new Set(current.map(item=>item.id));
   const next=current.concat((result.items||[]).filter(item=>!known.has(item.id)));
   itemsRef.current=next;canLoadMore.current=Boolean(result.has_more);setHasMore(Boolean(result.has_more));setItems(next);
  }catch(error){if(!controller.signal.aborted){setMoreFailed(true);setStatus(momentError(error));}}
  finally{loadingMore.current=false;setMoreLoading(false);}
 }
 function handleResultsScroll(event){
  const node=event.currentTarget;
  if(node.scrollHeight-node.scrollTop-node.clientHeight<240)loadMore();
 }
 const content=<>
  <header className="moment-gif-header"><strong>GIFs</strong>{inline?<button type="button" className="moment-gif-close" aria-label="Close GIF picker" onClick={onClose}><X size={20}/></button>:<DialogClose className="moment-gif-close" aria-label="Close GIF picker"><X size={20}/></DialogClose>}</header>
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
  <div className="moment-gif-results" role="region" aria-label="GIF results" tabIndex={0} onScroll={handleResultsScroll}>{items.map(item=><button type="button" key={item.id} aria-label={'Choose '+item.title} onClick={()=>onSelect(item.id)}>
   <img src={item.preview} alt="" loading="lazy" draggable="false"/>
  </button>)}{moreLoading&&<p className="moment-gif-loading" role="status">Loading more GIFs…</p>}{moreFailed&&<button type="button" className="moment-gif-retry" onClick={loadMore}>Retry loading GIFs</button>}</div>
  <small>Powered by GIPHY{hasMore?' · Scroll for more':''}</small>
 </>;
 if(inline)return <section id={id} className="moment-gif-picker moment-gif-inline" aria-label="Choose a GIF">
  {content}
 </section>;
 return <Dialog open onOpenChange={open=>{if(!open)onClose?.();}}>
  <DialogContent showClose={false} id={id} className="moment-gif-picker" onOpenAutoFocus={event=>event.preventDefault()}>
   <span className="moment-gif-handle" aria-hidden="true"/>
   <DialogTitle className="sr-only">Choose a GIF</DialogTitle>
   <DialogDescription className="sr-only">Browse trending GIFs or search GIPHY.</DialogDescription>
   {content}
  </DialogContent>
 </Dialog>;
}
