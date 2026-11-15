import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {ArrowUp,ChevronLeft,ChevronRight,MessageCircle,SquarePen} from 'lucide-react';
import Avatar from '@/components/Avatar';
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

function messageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const today = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, today
    ? {hour:"numeric",minute:"2-digit"}
    : {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}

function PersonAvatar({person}) {
  return <span className="public-messages-avatar"><Avatar user={person} size={40} motion /></span>;
}

export default function Messages() {
  const {user}=useAuth();
  return <MessagesPage key={user?.id} user={user} />;
}

function MessagesPage({user}) {
  const [params,setParams]=useSearchParams();
  const id=params.get('chat');
  const [inbox,setInbox]=useState(null),[loadedThread,setThread]=useState(null),[requests,setRequests]=useState(false);
  const thread=loadedThread?.chat.id===id?loadedThread:null;
  const currentChat=useRef(id);
  currentChat.current=id;
  const operation=useRef(false);
  const to=params.get('to'),recipient=params.get('recipient');
  const recipientName=useLocation().state?.recipientName;
  const [draft,setDraft]=useState('');
  const [contacts,setContacts]=useState(null),[contactQuery,setContactQuery]=useState(''),[contactError,setContactError]=useState(false),[retry,setRetry]=useState(0);
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
    const refresh=()=>messages('read',{id}).then(data=>{if(active){setThread(data);setInbox(previous=>previous?.map(chat=>chat.id===id?{...chat,unread:false}:chat)??null);}}).catch(error=>{if(active)setError(error.message);});
    void refresh();
    const timer=setInterval(refresh,8000);
    return ()=>{active=false;clearInterval(timer);};
  },[id]);
  async function perform(work) {
    if(operation.current)return;
    operation.current=true;
    setBusy(true);setError('');
    try{await work();}catch(error){setError(error.message);}finally{operation.current=false;setBusy(false);}
  }
  const peerName=chat=>chat.peer?.display_name||chat.participant_names?.[chat.participant_ids.findIndex(member=>member!==user?.id)]||'PUBLIC listener';
  const peerFor=chat=>chat.peer||{display_name:peerName(chat)};
  const pending=thread?.chat.dm_status==='pending';
  const incoming=pending&&thread?.chat.dm_requester!==user?.id;
  const canSend=thread?.chat.dm_status==='accepted'||(pending&&!incoming&&!thread.messages.length);
  const [composing,setComposing]=useState(Boolean(to||recipient));
  const searchTerm=contactQuery.trim().toLocaleLowerCase();
  const searching=composing&&Boolean(searchTerm);
  useEffect(()=>{
    if(!searching||contacts)return;
    let active=true;
    setContactError(false);
    async function loadFollowedPeople(){
      const people=new Map();
      let offset=0;
      do{
        const page=await messages('contacts',{offset});
        if(!active)return;
        for(const person of page.people)people.set(person.id,person);
        offset=Number.isSafeInteger(page.nextOffset)&&page.nextOffset>offset?page.nextOffset:null;
      }while(offset!==null);
      if(active)setContacts([...people.values()]);
    }
    void loadFollowedPeople().catch(()=>{if(active)setContactError(true);});
    return()=>{active=false;};
  },[searching,contacts,retry]);
  const matches=searching&&contacts?contacts.filter(person=>person.name.toLocaleLowerCase().includes(searchTerm)):[];
  function startChat(target){
    void perform(async()=>{
      const chat=await messages('start',target);
      setParams({chat:chat.id});
      setComposing(false);
      setContactQuery('');
      await loadInbox();
    });
  }
  const scroll=useRef(null);
  const followLatest=useRef(true);
  const [showLatest,setShowLatest]=useState(false);
  const visibleChats=inbox?.filter(chat=>requests===(chat.dm_status==='pending'&&chat.dm_requester!==user?.id)&&chat.dm_status!=='declined'&&(chat.last_message_at||chat.dm_requester===user?.id));
  useEffect(()=>{followLatest.current=true;setShowLatest(false);},[id]);
  function jumpToLatest(){
    followLatest.current=true;
    setShowLatest(false);
    if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;
  }
  const lastMessage=thread?.messages.at(-1)?.id;
  useEffect(()=>{
    if(!lastMessage)return;
    if(followLatest.current)jumpToLatest();
    else setShowLatest(true);
  },[id,lastMessage]);
  return <main className="public-messages" data-thread={Boolean(id)}>
    {error&&<p role="alert" className="rounded-lg border p-3">{error}</p>}
    <div className="public-messages-layout">
      <aside className="public-messages-inbox">
        <header className="public-messages-inbox-header">
          <Link to="/" className="public-messages-back"><ChevronLeft size={17}/> PUBLIC</Link>
          <div><h1>Messages</h1><button type="button" aria-label="New message" aria-expanded={composing} onClick={()=>{setComposing(!composing);setContactQuery('');setContacts(null);}}><SquarePen size={20}/></button></div>
        </header>
        {composing&&<div className="px-4 pb-3">
          {(recipient||to)&&<button className="mb-3 rounded-lg border px-3 py-2" type="button" disabled={busy} onClick={()=>startChat(recipient?{recipientId:recipient}:{username:to})}>{recipientName?`Message ${recipientName}`:"Start message"}</button>}
          <input type="search" aria-label="Search people you follow by name" placeholder="Search by name" className="mb-2 w-full rounded-xl border bg-muted px-3 py-2 text-base" maxLength={80} value={contactQuery} onChange={event=>setContactQuery(event.target.value)} />
          {matches.map(person=><button type="button" className="public-messages-row" key={person.id} disabled={busy} onClick={()=>startChat({recipientId:person.id})}>
            <PersonAvatar person={person}/>
            <span className="truncate font-semibold">{person.name}</span><ChevronRight size={14} aria-hidden="true"/>
          </button>)}
          {searching&&contacts&&matches.length===0&&<p role="status" className="text-sm text-muted-foreground">No matching people you follow.</p>}
          {searching&&!contacts&&!contactError&&<p role="status" className="text-sm">Searching…</p>}
          {searching&&contactError&&<button type="button" className="text-sm underline" onClick={()=>setRetry(value=>value+1)}>Search failed. Try again.</button>}
        </div>}
        <div className="public-messages-tabs">
          <button aria-pressed={!requests} onClick={()=>setRequests(false)}>Inbox</button>
          <button aria-pressed={requests} onClick={()=>setRequests(true)}>Requests</button>
        </div>
        {visibleChats?.length===0&&<p className="public-messages-list-empty">{requests?"No message requests.":"No conversations yet. Tap the compose icon to start one."}</p>}
        {visibleChats?.map(chat=>
          <button key={chat.id} onClick={()=>setParams({chat:chat.id})} aria-current={id===chat.id} className="public-messages-row">
            <PersonAvatar person={peerFor(chat)}/>
            <span className="min-w-0"><strong className="block truncate">{peerName(chat)}</strong><span className="block truncate text-sm opacity-70">{chat.last_message_text||'New conversation'}</span></span>
            {chat.unread?<span className="public-messages-dot" aria-label="Unread"/>:<ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </aside>
      {id?<section className="public-messages-thread" aria-label="Conversation">
        <header className="public-messages-thread-header">
          <button className="public-messages-back" onClick={()=>setParams({})} aria-label="Back to inbox"><ChevronLeft size={23}/></button>
          {thread&&<><PersonAvatar person={peerFor(thread.chat)}/><h2>{peerName(thread.chat)}</h2></>}
        </header>
        {thread&&<>
          <div ref={scroll} className="public-messages-history" aria-label="Conversation messages" onScroll={()=>{
            const node=scroll.current;
            if(!node)return;
            followLatest.current=node.scrollHeight-node.scrollTop-node.clientHeight<72;
            if(followLatest.current)setShowLatest(false);
          }}>
            {thread.messages.length===0&&<p className="public-messages-list-empty">{pending?"Send a message request to start the conversation.":"Send the first message."}</p>}
            {thread.messages.map(message=><div key={message.id} className="public-message-group" data-own={message.sender_id===user?.id}>
              <p className="public-message-bubble" data-own={message.sender_id===user?.id}>{message.text}</p>
              {messageTime(message.created_date)&&<time dateTime={message.created_date}>{messageTime(message.created_date)}</time>}
            </div>)}
          </div>
          {showLatest&&<button type="button" className="public-messages-latest" onClick={jumpToLatest}>Jump to latest</button>}
          {incoming&&thread.messages.length>0&&<div className="flex gap-3 p-3">
            {[true,false].map(accept=><button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={()=>void perform(async()=>{
              await messages('respond',{id,accept});
              if(currentChat.current===id){
                if(accept){
                  const next=await messages('read',{id});
                  if(currentChat.current===id)setThread(next);
                }else setParams({});
              }
              await loadInbox();
            })}>{accept?'Accept request':'Decline'}</button>)}
          </div>}
          {canSend&&<form className="public-messages-compose" onSubmit={event=>{event.preventDefault();void perform(async()=>{
            await messages('send',{id,text:draft});
            if(currentChat.current===id){
              followLatest.current=true;
              setDraft(previous=>previous===draft?'':previous);
              const next=await messages('read',{id});
              if(currentChat.current===id)setThread(next);
            }
            await loadInbox();
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
