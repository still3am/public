import {useState} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {useSafety} from '@/context/SafetyContext';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useToast} from '@/components/ui/use-toast';
import {Flag,ShieldOff} from 'lucide-react';
/** @param {any} props */
export default function SafetyControls({type,id,userId='',label='content'}) {
 const {user}=useAuth(),safety=useSafety(),{toast}=useToast();
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
 if(!user||!id) return null;
 const report=async()=>{setBusy(true);try{
  await base44.functions.invoke('safety',{action:'report',target_type:type,target_id:id,reason});
  toast({title:'Report received',description:'The PUBLIC team can review it in the moderation inbox.'});setOpen(false);
 }catch(e){toast({title:e?.response?.data?.error||'Report could not be sent',variant:'destructive'});}finally{setBusy(false);}};
 const ownBlocked=safety.own.some(r=>r.blocked_user_id===userId);
 const block=async()=>{if(!window.confirm('Block this user? Their content and interactions will be hidden.'))return;setBusy(true);try{
  await base44.functions.invoke('safety',{action:'block',user_id:userId,blocked:!ownBlocked});
  await safety.reload();window.dispatchEvent(new Event('catalog:invalidate'));
  toast({title:ownBlocked?'User unblocked':'User blocked'});
 }catch(e){toast({title:e?.response?.data?.error||'Could not block user',variant:'destructive'});}finally{setBusy(false);}};
 return <div className="flex items-center gap-2 flex-wrap text-xs">
  <button className="inline-flex items-center gap-1 min-h-9 px-2 rounded-lg hover:bg-accent" onClick={()=>setOpen(true)}><Flag size={13}/>Report</button>
  {userId&&userId!==user.id&&<button disabled={busy} className="inline-flex items-center gap-1 min-h-9 px-2 rounded-lg hover:bg-accent" onClick={block}><ShieldOff size={13}/>{ownBlocked?'Unblock':'Block user'}</button>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Report {label}</DialogTitle><DialogDescription>Tell us about copyright infringement, harassment, spam or unsafe content.</DialogDescription></DialogHeader>
   <textarea aria-label="Report details" value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)} rows={4} className="border rounded-xl bg-background p-3"/>
   <Button disabled={busy||reason.trim().length<3} onClick={report}>{busy?'Sending…':'Send report'}</Button>
  </DialogContent></Dialog>
 </div>;
}