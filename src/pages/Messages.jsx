import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {ArrowUp,ChevronLeft,ChevronRight,MessageCircle,SquarePen} from 'lucide-react';
import './messages.css';

async function messages(action, data = {}) {
  try {
    const result = await base44.functions.invoke('messages',{action,...data});
    if (!result.data || result.data.error) throw Error(result.data?.error || 'Messages are unavailable.');
    return result.data;
  } catch (error) {
    throw Error(error.response?.data?.error || error.message);
  }
}

export default function Messages() {
  const {user}=useAuth();
  const [params,setParams]=useSearchParams();
  const id=params.get('chat');
  const [inbox,setInbox]=useState([]),[thread,setThread]=useState(null),[requests,setRequests]=useState(false);
  const [username,setUsername]=useState(params.get('to')||''),[draft,setDraft]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const loadInbox=useCallback(async()=>setInbox((await messages('inbox')).conversations),[]);
  useEffect(()=>{
    const refresh=()=>loadInbox().catch(error=>setError(error.message));
    void refresh();
    const timer=setInterval(refresh,15000);
    return ()=>clearInterval(timer);
  },[loadInbox]);
  useEffect(()=>{
    setThread(null);setDraft('');setError('');
    if(!id)return;
    let active=true;
    const refresh=()=>messages('read',{id}).then(data=>{if(active){setThread(data);setInbox(previous=>previous.map(chat=>chat.id===id?{...chat,unread:false}:chat));}}).catch(error=>{if(active)setError(error.message);});
    void refresh();
    const timer=setInterval(refresh,8000);
    return ()=>{active=false;clearInterval(timer);};
  },[id]);
  async function perform(work) {
    if(busy)return;
    setBusy(true);setError('');
    try{await work();}catch(error){setError(error.message);}finally{setBusy(false);}
  }
  const peerName=chat=>chat.participant_names?.[chat.participant_ids.findIndex(member=>member!==user?.id)]||'PUBLIC listener';
  const pending=thread?.chat.dm_status==='pending';
  const incoming=pending&&thread?.chat.dm_requester!==user?.id;
  const canSend=thread?.chat.dm_status==='accepted'||(pending&&!incoming&&!thread.messages.length);
  const [composing,setComposing]=useState(Boolean(params.get('to')));
  const scroll=useRef(null);
  const lastMessage=thread?.messages.at(-1)?.id;
  useEffect(()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[id,lastMessage]);
  return <main className="public-messages" data-thread={Boolean(id)}>
    {error&&<p role="alert" className="rounded-lg border p-3">{error}</p>}
    <div className="public-messages-layout">
      <aside className="public-messages-inbox">
        <header className="public-messages-inbox-header">
          <Link to="/" className="public-messages-back"><ChevronLeft size={17}/> PUBLIC</Link>
          <div><h1><MessageCircle size={28} aria-hidden="true"/><span className="sr-only">Messages</span></h1><button type="button" aria-label="New message" aria-expanded={composing} onClick={()=>setComposing(value=>!value)}><SquarePen size={20}/></button></div>
        </header>
        {composing&&<form className="flex gap-2 px-4 pb-3" onSubmit={event=>{event.preventDefault();void perform(async()=>{
          const target=await messages('start',{username:username.trim().replace(/^@/,'').toLowerCase()});
          setParams({chat:target.id});setUsername('');setComposing(false);await loadInbox();
        });}}>
          <input aria-label="Username" placeholder="@username" className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={username} onChange={event=>setUsername(event.target.value)} required />
          <button className="rounded-lg border px-3" disabled={busy}>Chat</button>
        </form>}
        <div className="public-messages-tabs">
          <button aria-pressed={!requests} onClick={()=>setRequests(false)}>Inbox</button>
          <button aria-pressed={requests} onClick={()=>setRequests(true)}>Requests</button>
        </div>
        {inbox.filter(chat=>requests===(chat.dm_status==='pending'&&chat.dm_requester!==user?.id)&&chat.dm_status!=='declined'&&(chat.last_message_at||chat.dm_requester===user?.id)).map(chat=>
          <button key={chat.id} onClick={()=>setParams({chat:chat.id})} aria-current={id===chat.id} className="public-messages-row">
            <span className="public-messages-avatar" aria-hidden="true">{peerName(chat).charAt(0).toUpperCase()}</span>
            <span className="min-w-0"><strong className="block truncate">{peerName(chat)}</strong><span className="block truncate text-sm opacity-70">{chat.last_message_text||'New conversation'}</span></span>
            {chat.unread?<span className="public-messages-dot" aria-label="Unread"/>:<ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </aside>
      {id?<section className="public-messages-thread" aria-label="Conversation">
        <header className="public-messages-thread-header">
          <button className="public-messages-back" onClick={()=>setParams({})} aria-label="Back to inbox"><ChevronLeft size={23}/></button>
          {thread&&<><span className="public-messages-avatar" aria-hidden="true">{peerName(thread.chat).charAt(0).toUpperCase()}</span><h2>{peerName(thread.chat)}</h2></>}
        </header>
        {thread&&<>
          <div ref={scroll} className="public-messages-history" aria-label="Conversation messages">
            {thread.messages.map(message=><p key={message.id} className="public-message-bubble" data-own={message.sender_id===user?.id}>{message.text}</p>)}
          </div>
          {incoming&&thread.messages.length>0&&<div className="flex gap-3">
            {[true,false].map(accept=><button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={()=>void perform(async()=>{
              await messages('respond',{id,accept});if(accept)setThread(await messages('read',{id}));else setParams({});await loadInbox();
            })}>{accept?'Accept request':'Decline'}</button>)}
          </div>}
          {canSend&&<form className="public-messages-compose" onSubmit={event=>{event.preventDefault();void perform(async()=>{
            await messages('send',{id,text:draft});setDraft('');setThread(await messages('read',{id}));await loadInbox();
          });}}>
            <input aria-label="Message" placeholder={pending?'Write a message request…':'Write a message…'} className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={draft} maxLength={2000} onChange={event=>setDraft(event.target.value)} />
            <button aria-label="Send message" disabled={busy||!draft.trim()}><ArrowUp size={19}/></button>
          </form>}
          {pending&&!incoming&&!canSend&&<p className="text-sm">Waiting for them to accept your request.</p>}
        </>}
      </section>:<div className="public-messages-empty"><MessageCircle size={38}/><p>Select a conversation to start chatting.</p></div>}
    </div>
  </main>;
}
