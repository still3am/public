import {useCallback,useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';

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
  return <section className="mx-auto max-w-5xl space-y-3 py-4">
    <h1 className="text-2xl font-bold">Messages</h1>
    {error&&<p role="alert" className="rounded-lg border p-3">{error}</p>}
    <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_2fr]">
      <aside className={id?'hidden space-y-3 md:block':'space-y-3'}>
        <form className="flex gap-2" onSubmit={event=>{event.preventDefault();void perform(async()=>{
          const target=await messages('start',{username:username.trim().replace(/^@/,'').toLowerCase()});
          setParams({chat:target.id});setUsername('');await loadInbox();
        });}}>
          <input aria-label="Username" placeholder="@username" className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={username} onChange={event=>setUsername(event.target.value)} required />
          <button className="rounded-lg border px-3" disabled={busy}>Chat</button>
        </form>
        <div className="flex gap-3 text-sm">
          <button aria-pressed={!requests} onClick={()=>setRequests(false)}>Inbox</button>
          <button aria-pressed={requests} onClick={()=>setRequests(true)}>Requests</button>
        </div>
        {inbox.filter(chat=>requests===(chat.dm_status==='pending'&&chat.dm_requester!==user?.id)&&chat.dm_status!=='declined'&&(chat.last_message_at||chat.dm_requester===user?.id)).map(chat=>
          <button key={chat.id} onClick={()=>setParams({chat:chat.id})} aria-current={id===chat.id} className="block w-full rounded-xl border p-3 text-left">
            <strong>{peerName(chat)}</strong>{chat.unread&&<small className="ml-2 font-semibold">Unread</small>}<p className="truncate text-sm opacity-70">{chat.last_message_text||'New conversation'}</p>
          </button>
        )}
      </aside>
      {id&&<div className="min-w-0 space-y-3 rounded-xl border p-4">
        <button className="text-sm underline" onClick={()=>setParams({})}>Back to inbox</button>
        {thread&&<>
          <h2 className="font-bold">{peerName(thread.chat)}</h2>
          <div className="flex max-h-[55dvh] flex-col gap-2 overflow-auto" aria-label="Conversation messages">
            {thread.messages.map(message=><p key={message.id} className={'max-w-[85%] whitespace-pre-wrap break-words rounded-xl bg-muted p-3 '+(message.sender_id===user?.id?'self-end':'self-start')}>{message.text}</p>)}
          </div>
          {incoming&&thread.messages.length>0&&<div className="flex gap-3">
            {[true,false].map(accept=><button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={()=>void perform(async()=>{
              await messages('respond',{id,accept});if(accept)setThread(await messages('read',{id}));else setParams({});await loadInbox();
            })}>{accept?'Accept request':'Decline'}</button>)}
          </div>}
          {canSend&&<form className="flex gap-2" onSubmit={event=>{event.preventDefault();void perform(async()=>{
            await messages('send',{id,text:draft});setDraft('');setThread(await messages('read',{id}));await loadInbox();
          });}}>
            <input aria-label="Message" placeholder={pending?'Write a message request…':'Write a message…'} className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={draft} maxLength={2000} onChange={event=>setDraft(event.target.value)} />
            <button className="rounded-lg border px-3" disabled={busy||!draft.trim()}>Send</button>
          </form>}
          {pending&&!incoming&&!canSend&&<p className="text-sm">Waiting for them to accept your request.</p>}
        </>}
      </div>}
    </div>
  </section>;
}
