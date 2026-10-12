import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {Link} from 'react-router-dom';
export default function Support() {
 const [form,setForm]=useState({subject:'',message:'',email:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ticket,setTicket]=useState(null);
 const [receipt,setReceipt]=useState(()=>{try{return JSON.parse(localStorage.getItem('public:support-receipt')||'null');}catch{return null;}});
 const refresh=async()=>{if(!receipt)return;try{const r=await base44.functions.invoke('safety',{action:'ticket',...receipt});setTicket(r.data.ticket);}catch{setError('Could not load the support reply. Keep your reference and try again.');}};
 useEffect(()=>{refresh();},[receipt]);
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{
  const r=await base44.functions.invoke('safety',{action:'contact',...form});
  const ref={id:r.data.id,token:r.data.token};localStorage.setItem('public:support-receipt',JSON.stringify(ref));setReceipt(ref);
 }catch(e){setError(e?.response?.data?.error||'Could not send your message. Please try again.');}finally{setBusy(false);}};
 return <div className="max-w-xl mx-auto pb-10 space-y-5"><h1 className="text-3xl font-extrabold">PUBLIC Support</h1>
 <p className="text-muted-foreground">Contact the PUBLIC team about playback, your account, safety, or copyright. Your message goes directly to the admin support inbox.</p>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {receipt?<section className="rounded-2xl border p-5 space-y-3"><h2 className="font-bold">Your support request</h2><p className="text-sm break-all">Reference: {receipt.id}</p><p className="text-sm">{ticket?.subject}</p><p className="whitespace-pre-wrap">{ticket?.reply||'Your request has been received. Return here to check for a reply.'}</p>
 <p className="text-xs text-muted-foreground">Save this private receipt to check from another device or after signing out. Anyone with it can view your request and reply.</p>
 <Button variant="outline" onClick={()=>{const f=new Blob([JSON.stringify(receipt)],{type:'application/json'});const url=URL.createObjectURL(f);const a=document.createElement('a');a.href=url;a.download='PUBLIC-support-receipt.json';a.click();URL.revokeObjectURL(url);}}>Save receipt</Button>
 <Button variant="outline" onClick={refresh}>Check reply</Button><Button onClick={()=>{localStorage.removeItem('public:support-receipt');setReceipt(null);setTicket(null);}}>New request</Button></section>:
 <form className="space-y-3" onSubmit={submit}>
 <label className="block text-sm">Email (optional)<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <p className="text-xs text-muted-foreground">Replies appear here. Email delivery is not enabled.</p>
 <label className="block text-sm">Subject<input required minLength={3} maxLength={160} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <label className="block text-sm">Message<textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <Button disabled={busy} type="submit">{busy?'Sending…':'Send to PUBLIC'}</Button></form>}
 <label className="block text-sm">Open a saved support receipt<input type="file" accept="application/json" onChange={async e=>{try{const r=JSON.parse(await e.target.files[0].text());if(typeof r.id!=='string'||typeof r.token!=='string')throw Error();setReceipt(r);localStorage.setItem('public:support-receipt',JSON.stringify(r));}catch{setError('That receipt is not valid.');}}}/></label>
 <div className="flex gap-4 text-sm"><Link to="/privacy" className="underline">Privacy</Link><Link to="/terms" className="underline">Community & terms</Link></div></div>;
}