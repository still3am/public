import {useEffect,useRef,useState} from 'react';
import {Trash2,Flag} from 'lucide-react';
import Avatar from '@/components/Avatar';
import {momentsApi,momentError} from '@/lib/momentsApi';
import {MomentGif} from './MomentGifPicker';
import './moment-tools.css';

export function MomentThread({moment,parent,updated,onReply,onReport}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[next,setNext]=useState(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0);
 useEffect(()=>()=>{sequence.current++;},[]);
 async function load(offset=0){
  const version=++sequence.current;
  setLoading(true);setError('');
  try{
   const result=await momentsApi('replies',{id:moment,parent_id:parent,offset});
   if(sequence.current!==version)return;
   setItems(old=>offset?[...old,...result.items.filter(item=>!old.some(row=>row.id===item.id))]:result.items);
   setNext(result.has_more?result.next_offset:null);
  }catch(error){if(sequence.current===version)setError(momentError(error));}
  finally{if(sequence.current===version)setLoading(false);}
 }
 useEffect(()=>{if(updated){setOpen(true);load();}},[updated]);
 async function remove(item){
  setError('');
  try{await momentsApi('delete_comment',{id:moment,comment_id:item.id});await load();}
  catch(error){setError(momentError(error));}
 }
 return <div className="moment-inline-replies">
  <button type="button" className="moment-thread-action" aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)load();}}>{open?'Hide replies':'View replies'}</button>
  {open&&<div className="moment-reply-body">
   {items.map(item=><div className="moment-reply-row" key={item.id}>
    <Avatar user={item.author} size={24}/>
    <div><strong>{item.author?.display_name||'PUBLIC listener'}</strong>{item.body&&<p>{item.body}</p>}<MomentGif id={item.gif_id}/>
     <button type="button" className="moment-thread-action" onClick={()=>onReply(item)}>Reply</button>
    </div>
    {item.can_delete?<button type="button" aria-label="Delete reply" onClick={()=>remove(item)}><Trash2 size={14}/></button>:<button type="button" aria-label="Report reply" onClick={()=>onReport({type:'moment_comment',id:item.id,userId:item.author?.user_id})}><Flag size={14}/></button>}
   </div>)}
   {loading&&<p role="status">Loading replies…</p>}
   {!loading&&!error&&!items.length&&<p>No replies yet.</p>}
   {!loading&&next!==null&&<button type="button" onClick={()=>load(next)}>View more replies</button>}
   {error&&<p role="alert">{error} <button type="button" onClick={()=>load()}>Retry</button></p>}
  </div>}
 </div>;
}
