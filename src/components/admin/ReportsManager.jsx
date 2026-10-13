import {readAllPages} from "@/lib/readPages";
import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
export default function ReportsManager() {
 const [rows,setRows]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=async()=>{setError('');try{setRows(await readAllPages(opts=>base44.entities.Report.filter({status:'pending'},{sort:'-created_date',...opts})));}catch{setError('Could not load the reports queue');}};
 useEffect(()=>{load();},[]);
 const act=async(r,remove=false,dismiss=false)=>{if(busy)return;setBusy(r.id);try{await base44.functions.invoke('safety',{action:'moderate',id:r.id,remove,dismiss});await load();}catch(e){setError(e?.response?.data?.error||'Moderation action failed');}finally{setBusy('');}};
 const path=r=>({track:'/track/',user:'/profile/',artist:'/records/'}[r.target_type||'track']||'')+(r.target_id||r.track_id);
 return <section className="space-y-4"><div className="flex items-center gap-3 flex-wrap justify-between"><h2 className="text-xl font-bold">Moderation inbox</h2><Button variant="outline" onClick={load}>Refresh</Button></div><p className="text-sm text-muted-foreground">Review reports promptly. Removing content is separate from marking it reviewed. User reports can be handled through the Users tab.</p>
 {error&&<p role="alert" className="text-destructive">{error}</p>}{rows===null?<p>Loading…</p>:!rows.length?<p>No pending reports.</p>:rows.map(r=><article key={r.id} className="border rounded-2xl p-4 space-y-3"><h3 className="font-bold capitalize">{r.target_type||'track'} report</h3><p className="whitespace-pre-wrap break-words">{r.reason}</p><p className="text-xs text-muted-foreground break-all">Content ID: {r.target_id||r.track_id}</p>{['track','user','artist'].includes(r.target_type||'track')&&<a href={path(r)} target="_blank" rel="noreferrer" className="underline text-sm">Open content</a>}<div className="flex flex-wrap gap-2"><Button disabled={!!busy} variant="outline" onClick={()=>act(r,false,true)}>Dismiss</Button><Button disabled={!!busy} variant="outline" onClick={()=>act(r)}>Mark reviewed</Button>{r.target_type!=='user'&&<Button disabled={!!busy} onClick={()=>window.confirm('Remove this reported content?')&&act(r,true)}>Remove content</Button>}</div></article>)}</section>;
}