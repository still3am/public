import {readAllPages} from "@/lib/readPages";
import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
export default function SupportInbox() {
 const [tickets,setTickets]=useState([]),[error,setError]=useState(''),[replies,setReplies]=useState({}),[busy,setBusy]=useState('');
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);setError('');try{setTickets(await readAllPages(opts=>base44.entities.SupportTicket.filter({status:'open'},{sort:'-created_date',...opts})));}catch{setError('Could not load support requests');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const reply=async t=>{if(busy||!replies[t.id]?.trim())return;setBusy(t.id);try{await base44.functions.invoke('safety',{action:'reply',id:t.id,reply:replies[t.id]});await load();}catch(e){setError(e?.response?.data?.error||'Reply failed');}finally{setBusy('');}};
 return <section className="space-y-4"><h2 className="text-xl font-bold">Support inbox</h2><Button variant="outline" onClick={load}>Refresh</Button>{error&&<p role="alert" className="text-destructive">{error}</p>}{loading&&!tickets.length?<p>Loading support requests…</p>:!tickets.length&&!error&&<p>No open support requests.</p>}{tickets.map(t=><article className="p-5 rounded-2xl border space-y-3" key={t.id}><h3 className="font-bold">{t.subject}</h3><p className="text-xs text-muted-foreground">{t.email||'No email supplied'} · {new Date(t.created_date).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{t.message}</p><textarea aria-label="Support reply" rows={4} maxLength={5000} className="w-full bg-background border rounded-xl p-3" value={replies[t.id]||''} onChange={e=>setReplies({...replies,[t.id]:e.target.value})}/><Button disabled={!!busy||!replies[t.id]?.trim()} onClick={()=>reply(t)}>Post private reply</Button><p className="text-xs text-muted-foreground">The requester reads this reply using their private support receipt.</p></article>)}</section>;
}