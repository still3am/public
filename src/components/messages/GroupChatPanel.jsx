import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/Avatar';
import { Link } from 'react-router-dom';
import { Camera, Search, X } from 'lucide-react';

export function GroupChatAvatar({ chat, size = 40 }) {
  if (chat.group_photo) return <img className="public-group-photo" src={chat.group_photo} alt="" style={{ width:size,height:size }} />;
  return <span className="public-group-avatar" style={{width:size,height:size}} aria-hidden="true">
    {(chat.members?.length ? chat.members.slice(0,3) : [{display_name:chat.group_name||'Group'}]).map((person,index)=><span key={person.id||index} style={{left:index*size*.18,top:index*size*.14,zIndex:3-index}}><Avatar user={person} size={Math.round(size*.66)} /></span>)}
  </span>;
}

export default function GroupChatPanel({chat,userId,invoke,onChanged,onLeft,busy}) {
  const [name,setName]=useState(chat.group_name||'');
  const [query,setQuery]=useState('');
  const [people,setPeople]=useState([]);
  const [error,setError]=useState('');
  const [working,setWorking]=useState(false);
  const isAdmin=chat.admin_ids?.includes(userId);
  const pending=chat.invited_ids||[];
  const muted=chat.muted_ids?.includes(userId);
  async function run(action,data={}){
    if(working||busy)return;
    setWorking(true);setError('');
    try{await invoke(action,{id:chat.id,...data});if(action==='group_leave')onLeft();else await onChanged();}
    catch(error){setError(error.message);}finally{setWorking(false);}
  }
  async function search(){
    setWorking(true);setError('');
    try{
      const found=[];let offset=0;
      do {const page=await invoke('contacts',{offset});found.push(...page.people);offset=page.nextOffset;}while(Number.isSafeInteger(offset));
      setPeople(found.filter(person=>!chat.participant_ids.includes(person.id)));
    }catch(error){setError(error.message);}finally{setWorking(false);}
  }
  async function upload(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>8*1024*1024){setError('Choose a photo or GIF up to 8 MB.');return;}
    setWorking(true);setError('');
    try{const result=await base44.integrations.Core.UploadFile({file});if(!result.file_url)throw Error('Upload could not be confirmed.');await invoke('group_update',{id:chat.id,photo:result.file_url});await onChanged();}
    catch(error){setError(error.message);}finally{setWorking(false);}
  }
  return <section className="public-chat-info public-group-settings">
    <h3>Group info</h3><p>Every member can change the name, photo, and shared background.</p>
    <form onSubmit={event=>{event.preventDefault();void run('group_update',{name});}}><label>Group name<input maxLength={80} value={name} onChange={event=>setName(event.target.value)} /></label><button disabled={working||busy||!name.trim()||name.trim()===chat.group_name}>Save name</button></form>
    <label className="public-group-photo-upload"><Camera size={18}/> Change group photo or GIF<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={working||busy} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}} /></label>
    <button role="switch" aria-checked={Boolean(muted)} disabled={working||busy} onClick={()=>void run('group_mute',{enabled:!muted})}>{muted?'Unmute notifications':'Mute notifications'}</button>
    <h3>Members · {chat.participant_ids.length}/20</h3>
    <div className="public-group-members">{chat.participant_ids.map((member,index)=>{
      const person=chat.members?.find(person=>person.id===member)||{display_name:chat.participant_names?.[index]||'PUBLIC listener'};
      return <div className="public-group-member" key={member}><Avatar user={person} size={36}/><span><Link to={'/profile/'+encodeURIComponent(member)}>{person.display_name}{member===userId?' (you)':''}</Link><small>{pending.includes(member)?'Invited':chat.admin_ids?.includes(member)?'Admin':'Member'}</small></span>
        {isAdmin&&member!==userId&&<span className="public-group-member-actions">{!pending.includes(member)&&!chat.admin_ids?.includes(member)&&<button disabled={working||busy} onClick={()=>void run('group_admin',{memberId:member})}>Make admin</button>}<button aria-label={'Remove '+person.display_name} disabled={working||busy} onClick={()=>{if(window.confirm('Remove this person from the group?'))void run('group_remove',{memberId:member});}}><X size={16}/></button></span>}
      </div>;
    })}</div>
    {isAdmin&&chat.participant_ids.length<20&&<div><h3>Invite people</h3><form onSubmit={event=>{event.preventDefault();void search();}}><input aria-label="Search people to invite" placeholder="Search people you follow" value={query} onChange={event=>setQuery(event.target.value)} /><button disabled={working||busy||!query.trim()} aria-label="Search people"><Search size={17}/></button></form>
      {query.trim()&&people.filter(person=>person.name.toLowerCase().includes(query.trim().toLowerCase())).map(person=><button className="public-group-invite-result" key={person.id} disabled={working||busy} onClick={()=>void run('group_invite',{memberId:person.id})}>{person.name}<span>Invite</span></button>)}
    </div>}
    <button className="text-destructive" disabled={working||busy} onClick={()=>{if(window.confirm('Leave this group?'))void run('group_leave');}}>Leave group</button>
    {error&&<p role="alert">{error}</p>}
  </section>;
}
