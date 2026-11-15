import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {ArrowUp,ChevronLeft,ChevronRight,MessageCircle,Music2,Pause,Play,Reply,SquarePen,X} from 'lucide-react';
import TrackPickerSheet from '@/components/profile/TrackPickerSheet';
import {usePlayer} from '@/context/PlayerContext';
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
  const pendingSends=useRef(new Map());
  const to=params.get('to'),recipient=params.get('recipient');
  const recipientName=useLocation().state?.recipientName;
  const [draft,setDraft]=useState('');
  const [reply,setReply]=useState(null);
  const draftInput=useRef(null);
  const [inboxQuery,setInboxQuery]=useState('');
  const player=usePlayer();
  const [songPicker,setSongPicker]=useState(false),[attachment,setAttachment]=useState(null);
  async function playSharedSong(trackId){
    if(player.currentTrack?.id===trackId){await player.togglePlay();return;}
    const song=await base44.entities.Track.get(trackId);
    if(!song?.is_published||song.approval_status!=='approved'||!song.audio_url)throw Error('This song is unavailable.');
    await player.playTrackAt([song],0);
  }
  const [contacts,setContacts]=useState(null),[contactQuery,setContactQuery]=useState(''),[contactError,setContactError]=useState(false),[retry,setRetry]=useState(0);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [inboxError,setInboxError]=useState('');
  const [readError,setReadError]=useState(null);
  const inboxPending=useRef(false);
  const readVersion=useRef(0);
  const loadInbox=useCallback(async()=>{
    if(inboxPending.current)return;
    inboxPending.current=true;
    try{
      const data=await messages('inbox');
      setInbox(data.conversations);
      setInboxError('');
    }catch(error){setInboxError(error.message);}
    finally{inboxPending.current=false;}
  },[]);
  const loadThread=useCallback(async (chatId)=>{
    const version=++readVersion.current;
    try{
      const data=await messages('read',{id:chatId});
      if(version!==readVersion.current||currentChat.current!==chatId)return;
      setThread(data);
      setReadError(null);
      setInbox(previous=>previous?.map(chat=>chat.id===chatId?{...chat,unread:false}:chat)??null);
    }catch(error){
      if(version===readVersion.current&&currentChat.current===chatId)setReadError({id:chatId,message:error.message});
    }
  },[]);
  useEffect(()=>{
    void loadInbox();
    const timer=setInterval(()=>void loadInbox(),15000);
    return ()=>clearInterval(timer);
  },[loadInbox]);
  useEffect(()=>{
    setThread(null);setDraft('');setReply(null);setAttachment(null);setSongPicker(false);setError('');setReadError(null);
    if(!id)return;
    let pending=false;
    const refresh=async(initial=false)=>{
      if(pending||(!initial&&operation.current))return;
      pending=true;
      try{await loadThread(id);}finally{pending=false;}
    };
    void refresh(true);
    const timer=setInterval(refresh,8000);
    return ()=>{readVersion.current++;clearInterval(timer);};
  },[id,loadThread]);
  async function perform(work) {
    if(operation.current)return;
    operation.current=true;
    setBusy(true);setError('');
    try{await work();}catch(error){setError(error.message);}finally{operation.current=false;setBusy(false);}
  }
  const peerName=chat=>chat.peer?.display_name||chat.participant_names?.[chat.participant_ids.findIndex(member=>member!==user?.id)]||'PUBLIC listener';
  const peerFor=chat=>chat.peer||inbox?.find(row=>row.id===chat.id)?.peer||{display_name:peerName(chat)};
  const currentPeer=thread?.chat.participant_ids.find(member=>member!==user?.id);
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
  const tabChats=inbox?.filter(chat=>requests===(chat.dm_status==='pending'&&chat.dm_requester!==user?.id)&&chat.dm_status!=='declined'&&(chat.last_message_at||chat.dm_requester===user?.id));
  const inboxTerm=inboxQuery.trim().toLocaleLowerCase();
  const visibleChats=tabChats?.filter(chat=>!inboxTerm||peerName(chat).toLocaleLowerCase().includes(inboxTerm));
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
        {tabChats?.length>0&&<label className="public-messages-search">
          <Search size={16} aria-hidden="true"/>
          <input type="search" aria-label="Find a conversation by name" placeholder="Find a conversation" value={inboxQuery} onChange={event=>setInboxQuery(event.target.value)}/>
        </label>}
        {inboxError ? <p role="alert" className="public-messages-list-empty">Inbox couldn’t refresh. <button type="button" className="underline" onClick={loadInbox}>Retry</button></p> : inbox===null && <p role="status" className="public-messages-list-empty">Loading conversations…</p>}
        {visibleChats?.length===0&&<p className="public-messages-list-empty">{inboxTerm&&tabChats?.length?"No conversations match that name.":requests?"No message requests.":"No conversations yet. Tap the compose icon to start one."}</p>}
        {visibleChats?.map(chat=>
          <button key={chat.id} onClick={()=>setParams({chat:chat.id})} aria-current={id===chat.id} className="public-messages-row">
            <PersonAvatar person={peerFor(chat)}/>
            <span className="min-w-0"><span className="public-messages-row-title"><strong className="truncate">{peerName(chat)}</strong>{chat.last_message_at&&<time dateTime={chat.last_message_at}>{messageTime(chat.last_message_at)}</time>}</span><span className="block truncate text-sm opacity-70">{chat.last_message_text||'New conversation'}</span></span>
            {chat.unread?<span className="public-messages-dot" aria-label="Unread"/>:<ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </aside>
      {id?<section className="public-messages-thread" aria-label="Conversation">
        <header className="public-messages-thread-header">
          <button className="public-messages-back" onClick={()=>setParams({})} aria-label="Back to inbox"><ChevronLeft size={23}/></button>
          {readError?.id===id ? <p role="alert" className="public-messages-list-empty">{readError.message} <button type="button" className="underline" onClick={()=>loadThread(id)}>Retry</button></p> : !thread && <p role="status" className="public-messages-list-empty">Loading conversation…</p>}
        {thread&&currentPeer&&<Link to={"/profile/"+encodeURIComponent(currentPeer)} className="public-messages-peer" aria-label={"View "+peerName(thread.chat)+"’s profile"}>
          <PersonAvatar person={peerFor(thread.chat)}/>
          <h2>{peerName(thread.chat)}</h2>
        </Link>}
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
              {message.reply_preview&&<ReplyQuote preview={message.reply_preview}/>}
              {message.track_id&&<SharedSong message={message} playing={player.currentTrack?.id===message.track_id&&player.isPlaying} onPlay={()=>void perform(()=>playSharedSong(message.track_id))} busy={busy}/>}
              {message.text&&<p className="public-message-bubble" data-own={message.sender_id===user?.id}>{message.text}</p>}
              {canSend&&<button type="button" className="public-message-reply-action" aria-label="Reply to message" disabled={busy} onClick={()=>{
                setReply({id:message.id,name:message.sender_id===user?.id?"You":peerName(thread.chat),text:message.text||(message.track_id?"Shared a song":"Message")});
                draftInput.current?.focus();
              }}><Reply size={14}/>Reply</button>}
              {messageTime(message.created_date)&&<time dateTime={message.created_date}>{messageTime(message.created_date)}</time>}
            </div>)}
          </div>
          {showLatest&&<button type="button" className="public-messages-latest" onClick={jumpToLatest}>Jump to latest</button>}
          {incoming&&thread.messages.length>0&&<div className="flex gap-3 p-3">
            {[true,false].map(accept=><button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={()=>void perform(async()=>{
              await messages('respond',{id,accept});
              if(currentChat.current===id){
                if(accept){
                  await loadThread(id);
                }else setParams({});
              }
              await loadInbox();
            })}>{accept?'Accept request':'Decline'}</button>)}
          </div>}
          {canSend&&reply&&<div className="public-message-reply-draft">
            <div className="min-w-0"><strong className="block truncate">Replying to {reply.name}</strong><span className="block truncate">{reply.text}</span></div>
            <button type="button" aria-label="Cancel reply" disabled={busy} onClick={()=>setReply(null)}><X size={18}/></button>
          </div>}
          {canSend&&attachment&&<div className="public-message-attachment"><Music2 size={17}/><span className="truncate">{attachment.title}</span><button type="button" aria-label="Remove song" disabled={busy} onClick={()=>setAttachment(null)}><X size={18}/></button></div>}
          {canSend&&songPicker&&<TrackPickerSheet title="Share a song" description="Choose a song to send in this conversation." selectedIds={attachment?[attachment.id]:[]} onClose={()=>setSongPicker(false)} onToggle={(_,song)=>{setAttachment(song);setSongPicker(false);}}/>}
          {canSend&&<form className="public-messages-compose" onSubmit={event=>{event.preventDefault();void perform(async()=>{
            const text=draft.trim();
            const trackId=attachment?.id||'',replyId=reply?.id||'';
            if(!text&&!trackId)return;
            const existing=pendingSends.current.get(id);
            const requestId=existing?.text===text&&existing?.trackId===trackId&&existing?.replyId===replyId?existing.requestId:globalThis.crypto?.randomUUID?.();
            pendingSends.current.set(id,{text,trackId,replyId,requestId});
            await messages('send',{id,text,trackId,replyId,requestId});
            pendingSends.current.delete(id);
            if(currentChat.current===id){
              followLatest.current=true;
              setDraft(previous=>previous===draft?'':previous);
              setReply(previous=>previous?.id===replyId?null:previous);
              setAttachment(previous=>previous?.id===trackId?null:previous);
              await loadThread(id);
            }
            await loadInbox();
          });}}>
            <button type="button" aria-label="Attach a song" disabled={busy} onClick={()=>setSongPicker(true)}><Music2 size={19}/></button>
            <textarea rows={1} aria-label="Message" placeholder={pending?'Write a message request…':'Write a message…'} className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={draft} maxLength={2000} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{
              if(event.key!=='Enter'||event.shiftKey||event.nativeEvent.isComposing||event.keyCode===229||!window.matchMedia('(pointer: fine)').matches)return;
              event.preventDefault();
              if(!busy&&draft.trim())event.currentTarget.form?.requestSubmit();
            }} />
            <button aria-label="Send message" disabled={busy||(!draft.trim()&&!attachment)}><ArrowUp size={19}/></button>
          </form>}
          {pending&&!incoming&&!canSend&&<p className="text-sm">Waiting for them to accept your request.</p>}
        </>}
      </section>:<div className="public-messages-empty"><MessageCircle size={32} aria-hidden="true"/><h2>Your conversations</h2><p>Choose a chat or start a new message.</p><button type="button" onClick={()=>setComposing(true)}><SquarePen size={16}/> New message</button></div>}
    </div>
  </main>;
}

function SharedSong({message,onPlay,busy,playing}){
  let song;
  try{song=JSON.parse(message.track);}catch{}
  return <div className="public-message-song">
    <button type="button" onClick={onPlay} disabled={busy} aria-label={(playing?"Pause ":"Play ")+(song?.title||"shared song")}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>
    <Link className="min-w-0" to={"/track/"+encodeURIComponent(message.track_id)}>
      <strong className="block truncate">{song?.title||"Shared song"}</strong>
      {song?.artist&&<span className="block truncate text-xs text-muted-foreground">{song.artist}</span>}
    </Link>
  </div>;
}

function ReplyQuote({preview}){
  let quote;
  try{quote=JSON.parse(preview);}catch{return null;}
  if(typeof quote?.text!=="string")return null;
  return <blockquote className="public-message-reply-quote">
    <strong className="block truncate">{quote.sender_name||"Reply"}</strong>
    <span className="block truncate">{quote.text}</span>
  </blockquote>;
}
