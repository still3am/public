import {useRef,useState} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {readAllPages} from '@/lib/readPages';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
export default function BulkOrganizeSheet({trackIds=[],folders=[],onClose,onDone}){
 const {user}=useAuth();
 const [folder,setFolder]=useState(''),[tags,setTags]=useState(''),[applyFolder,setApplyFolder]=useState(false),[applyTags,setApplyTags]=useState(false),[tagMode,setTagMode]=useState('add'),[busy,setBusy]=useState(false);
 const saving=useRef(false);
 const save=async()=>{
  if(!user?.id||saving.current||!trackIds.length||(!applyFolder&&!applyTags))return;
  saving.current=true;setBusy(true);
  try{
   const ids=[...new Set(trackIds)],rows=[];
   for(let start=0;start<ids.length;start+=200)rows.push(...await readAllPages(opts=>base44.entities.LibraryItem.filter({user_id:user.id,track_id:{$in:ids.slice(start,start+200)}},opts)));
   if(!rows.length)return;
   const names=[...new Set(tags.split(',').map(name=>name.trim()).filter(Boolean))].slice(0,20);
   const updates=rows.map(row=>{
    const data={id:row.id};
    if(applyFolder)data.folder=folder.trim();
    if(applyTags){const previous=Array.isArray(row.tags)?row.tags:[];data.tags=tagMode==='replace'?names:tagMode==='remove'?previous.filter(tag=>!names.includes(tag)):[...new Set([...previous,...names])];}
    return data;
   });
   for(let start=0;start<updates.length;start+=100)await base44.entities.LibraryItem.bulkUpdate(updates.slice(start,start+100));
   onDone?.();
  }catch{/* Preserve the choices so the user can retry without an alert popup. */}
  finally{saving.current=false;setBusy(false);}
 };
 return <Dialog open onOpenChange={open=>!open&&onClose()}><DialogContent><DialogHeader><DialogTitle>Organize {trackIds.length} songs</DialogTitle><DialogDescription>Choose what to change. Other folders and tags stay as they are.</DialogDescription></DialogHeader>
 <section className="space-y-3 rounded-xl border p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={applyFolder} onChange={event=>setApplyFolder(event.target.checked)} disabled={busy}/>Change folder</label><label className="block text-sm text-muted-foreground">Folder<input disabled={busy||!applyFolder} list="library-folder-options" maxLength={80} value={folder} onChange={event=>setFolder(event.target.value)} placeholder="Leave empty to remove the folder" className="block w-full mt-2 bg-background border rounded-xl p-3 disabled:opacity-50"/></label><datalist id="library-folder-options">{folders.map(name=><option key={name} value={name}/>)}</datalist></section>
 <section className="space-y-3 rounded-xl border p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={applyTags} onChange={event=>setApplyTags(event.target.checked)} disabled={busy}/>Change tags</label><select aria-label="How to change tags" value={tagMode} disabled={busy||!applyTags} onChange={event=>setTagMode(event.target.value)} className="w-full bg-background border rounded-xl p-3 disabled:opacity-50"><option value="add">Add tags</option><option value="replace">Replace all tags</option><option value="remove">Remove these tags</option></select><label className="block text-sm text-muted-foreground">Tags, separated by commas<input disabled={busy||!applyTags} maxLength={400} value={tags} onChange={event=>setTags(event.target.value)} placeholder="Favorites, late night, running" className="block w-full mt-2 bg-background border rounded-xl p-3 disabled:opacity-50"/></label></section>
 <Button onClick={save} disabled={busy||!trackIds.length||(!applyFolder&&!applyTags)}>{busy?'Saving…':'Save organization'}</Button></DialogContent></Dialog>;
}
