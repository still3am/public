import ConversationMuteSwitch from './ConversationMuteSwitch';
import { groupAvatarLayout } from './groupAvatarLayout';
import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/Avatar';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import { Link } from 'react-router-dom';
import { Camera, Search, Users, X } from 'lucide-react';

export function GroupChatAvatar({ chat, size = 40 }) {
  const photo = useCoverUrl(chat.group_photo);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[photo]);
  const members=(chat.members||[]).filter(person=>!chat.invited_ids?.includes(person.id)).slice(0,4);
  const layout=groupAvatarLayout(members.length);
  return <span className="public-group-portrait" style={{width:size,height:size}} aria-hidden="true">
    {photo&&!failed ? <img className="public-group-photo" src={photo} onError={()=>setFailed(true)} alt="" /> : members.length ? <span className="public-group-avatar">
      {members.map((person,index)=>{const slot=layout[index];const diameter=size*slot.size;return <span className="public-group-avatar-cell" key={person.id||index} style={{left:slot.x*100+'%',top:slot.y*100+'%',width:slot.size*100+'%',height:slot.size*100+'%'}}><Avatar user={person} showBadge={false} size={diameter} /></span>;})}
    </span> : <Users size={Math.max(18,size*.48)} />}
  </span>;
}

export default function GroupChatPanel({chat,userId,invoke,onChanged,onLeft,busy}) {
  const [name,setName]=useState(chat.group_name||'');
  useEffect(()=>setName(chat.group_name||''),[chat.group_name]);
  const [query,setQuery]=useState('');
  const [people,setPeople]=useState(null);
  const [contactError,setContactError]=useState('');
  const [retry,setRetry]=useState(0);
  const [error,setError]=useState('');
  const [working,setWorking]=useState(false);
  const lock=useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const isAdmin=Boolean(chat.admin_ids?.includes(userId));
  const pending=chat.invited_ids||[];
  const term=query.trim().toLocaleLowerCase();
  const searching=isAdmin&&Boolean(term);
  useEffect(()=>{
    if(!searching||people)return;
    let active=true;
    const timer=setTimeout(()=>{
      setContactError('');
      void (async()=>{
        const found=new Map();let offset=0;
        do{
          const page=await invoke('contacts',{offset});
          if(!active)return;
          for(const person of page.people||[])found.set(person.id,person);
          offset=Number.isSafeInteger(page.nextOffset)&&page.nextOffset>offset?page.nextOffset:null;
        }while(offset!==null);
        if(active)setPeople([...found.values()]);
      })().catch(error=>{if(active)setContactError(error.message||'Search failed.');});
    },200);
    return()=>{active=false;clearTimeout(timer);};
  },[searching,people,retry,invoke]);
  const matches=(people||[]).filter(person=>!chat.participant_ids.includes(person.id)&&(person.name||person.display_name||'').toLocaleLowerCase().includes(term));
  async function run(action,data={}){
    if(lock.current||busy)return;
    lock.current=true;setWorking(true);setError('');
    try{
      await invoke(action,{id:chat.id,...data});
      if(!mounted.current)return;
      if(action==='group_leave')onLeft();else await onChanged();
    }catch(error){if(mounted.current)setError(error.message);}
    finally{lock.current=false;if(mounted.current)setWorking(false);}
  }
  async function upload(file){
    if(!file||lock.current||busy)return;
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||!file.size||file.size>8*1024*1024){setError('Choose a photo or GIF up to 8 MB.');return;}
    lock.current=true;setWorking(true);setError('');
    try{
      const result=await base44.integrations.Core.UploadFile({file});
      if(!result.file_url)throw Error('Upload could not be confirmed.');
      if(!mounted.current)return;
      await invoke('group_update',{id:chat.id,photo:result.file_url});
      if(mounted.current)await onChanged();
    }catch(error){if(mounted.current)setError(error.message);}
    finally{lock.current=false;if(mounted.current)setWorking(false);}
  }
  return <section className="public-chat-info public-group-settings" aria-busy={working}>
    <h3>Group info</h3><p>Every member can change the name, photo, and shared background.</p>
    <form onSubmit={event=>{event.preventDefault();void run('group_update',{name});}}>
      <label>Group name<input maxLength={80} disabled={working||busy} value={name} onChange={event=>setName(event.target.value)} /></label>
      <button type="submit" disabled={working||busy||!name.trim()||name.trim()===chat.group_name}>Save</button>
    </form>
    <div className="public-group-photo-actions">
      <label className="public-group-photo-upload"><Camera size={18}/>Change photo or GIF<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={working||busy} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}} /></label>
      {chat.group_photo&&<button type="button" disabled={working||busy} onClick={()=>void run('group_update',{photo:''})}>Remove photo</button>}
    </div>
    <ConversationMuteSwitch chat={chat} userId={userId} invoke={invoke} onChanged={onChanged} disabled={working||busy} />
    <h3>Members <span className="text-muted-foreground">{chat.participant_ids.length}/20</span></h3>
    <div className="public-group-members">{chat.participant_ids.map((member,index)=>{
      const person=chat.members?.find(person=>person.id===member)||{display_name:chat.participant_names?.[index]||'PUBLIC listener'};
      return <div className="public-group-member" key={member}>
        <span className="public-group-member-avatar"><Avatar user={person} size={36}/></span><span className="public-group-member-identity"><Link to={'/profile/'+encodeURIComponent(member)}>{person.display_name}{member===userId?' (you)':''}</Link><small>{pending.includes(member)?'Invitation pending':chat.admin_ids?.includes(member)?'Admin':'Member'}</small></span>
        {isAdmin&&member!==userId&&<span className="public-group-member-actions">{!pending.includes(member)&&!chat.admin_ids?.includes(member)&&<button type="button" disabled={working||busy} onClick={()=>void run('group_admin',{memberId:member})}>Make admin</button>}<button type="button" aria-label={(pending.includes(member)?'Cancel invitation for ':'Remove ')+person.display_name} disabled={working||busy} onClick={()=>{if(window.confirm(pending.includes(member)?'Cancel this invitation?':'Remove this person from the group?'))void run('group_remove',{memberId:member});}}><X size={16}/></button></span>}
      </div>;
    })}</div>
    {isAdmin&&chat.participant_ids.length<20&&<div className="public-group-invite">
      <h3>Invite people</h3><label className="public-group-search"><Search size={17}/><input aria-label="Search people to invite" placeholder="Search people you follow" value={query} onChange={event=>setQuery(event.target.value)} /></label>
      {searching&&contactError?<p role="alert">{contactError} <button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>:searching&&people===null?<p role="status">Searching…</p>:searching&&!matches.length?<p role="status">No matching people to invite.</p>:searching&&matches.map(person=><button type="button" className="public-group-invite-result" key={person.id} disabled={working||busy} onClick={()=>void run('group_invite',{memberId:person.id})}><span className="public-group-invite-avatar"><Avatar user={person} size={30}/></span><span className="public-group-invite-name">{person.name}</span><span>Invite</span></button>)}
      <p>New members receive an invitation to accept.</p>
    </div>}
    <button type="button" className="text-destructive" disabled={working||busy} onClick={()=>{if(window.confirm('Leave this group?'))void run('group_leave');}}>Leave group</button>
    {working&&<p role="status">Saving changes…</p>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
