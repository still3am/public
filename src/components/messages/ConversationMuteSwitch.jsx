import { useEffect, useRef, useState } from 'react';

export default function ConversationMuteSwitch({ chat, userId, invoke, onChanged, disabled=false }) {
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const lock=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const muted=Boolean(chat.muted_ids?.includes(userId));
  async function toggle(){
    if(lock.current||disabled)return;
    lock.current=true;setSaving(true);setError('');
    try{await invoke('mute',{id:chat.id,enabled:!muted});if(mounted.current)await onChanged();}
    catch(error){if(mounted.current)setError(error.message);}
    finally{lock.current=false;if(mounted.current)setSaving(false);}
  }
  return <div className="public-conversation-mute">
    <button type="button" role="switch" aria-label="Mute conversation notifications" aria-checked={muted} className="public-group-mute" disabled={disabled||saving} onClick={()=>void toggle()}><span>{saving?'Saving…':'Mute notifications'}</span><span className="public-group-switch" data-on={muted}><i/></span></button>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
