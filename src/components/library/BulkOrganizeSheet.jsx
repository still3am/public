import {useState} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {readAllPages} from '@/lib/readPages';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
export default function BulkOrganizeSheet({trackIds,onClose,onDone}) {
 const {user}=useAuth(),[folder,setFolder]=useState(''),[tags,setTags]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{setBusy(true);try{
  const rows=await readAllPages(opts=>base44.entities.LibraryItem.filter({user_id:user.id,track_id:{$in:trackIds}},opts));
  const names=[...new Set(tags.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,20);
  if(!rows.length)throw new Error('Save these tracks to your library before organizing them.');
  for(let i=0;i<rows.length;i+=100)await base44.entities.LibraryItem.bulkUpdate(rows.slice(i,i+100).map(r=>({id:r.id,folder:folder.trim(),tags:names})));
  onDone();
 }catch(e){setError(e?.message||'Could not organize tracks');}finally{setBusy(false);}};
 return <Dialog open onOpenChange={v=>!v&&onClose()}><DialogContent><DialogHeader><DialogTitle>Organize {trackIds.length} songs</DialogTitle><DialogDescription>Move saved tracks to a folder and set their tags. An empty folder returns them to the main library.</DialogDescription></DialogHeader>
 <label className="text-sm">Folder<input maxLength={80} value={folder} onChange={e=>setFolder(e.target.value)} className="block w-full bg-background border rounded-xl p-3"/></label>
 <label className="text-sm">Tags, separated by commas<input maxLength={400} value={tags} onChange={e=>setTags(e.target.value)} className="block w-full bg-background border rounded-xl p-3"/></label>
 {error&&<p role="alert" className="text-destructive">{error}</p>}<Button onClick={save} disabled={busy}>{busy?'Saving…':'Move & tag'}</Button></DialogContent></Dialog>;
}