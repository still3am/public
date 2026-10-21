import {useEffect,useState,useRef} from 'react';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {Button} from '@/components/ui/button';
import {Link,useSearchParams} from 'react-router-dom';
export default function Support(){
 const {user}=useAuth(),uid=user?.id||'',storageKey='public:support-receipt'+(uid?':'+uid:'');
 const [params,setParams]=useSearchParams(),linked=params.get('ticket');
 const [form,setForm]=useState({subject:'',message:'',email:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ticket,setTicket]=useState(null),[receipt,setReceipt]=useState(null),[checking,setChecking]=useState(false);
 const [requests,setRequests]=useState({uid:null,rows:[],cursor:null,more:false}),[listError,setListError]=useState(''),[listing,setListing]=useState(false);
 const receiptVersion=useRef(0),listVersion=useRef(0),sending=useRef(false),account=useRef(uid);account.current=uid;
 useEffect(()=>{setTicket(null);setError('');let restored=null;try{restored=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
 setReceipt(linked&&uid?{id:linked}:restored);return()=>{receiptVersion.current++;};},[storageKey,linked]);
 async function loadRequests(more=false){if(!uid)return;const request=++listVersion.current;setListing(true);setListError('');try{
 const response=await base44.functions.invoke('safety',{action:'myTickets',...(more&&requests.cursor?{cursor:requests.cursor}:{})});const data=response?.data;
 if(!Array.isArray(data?.tickets)||data.has_more&&!data.next_cursor)throw Error();
 if(account.current===uid&&request===listVersion.current)setRequests(old=>({uid,rows:more&&old.uid===uid?[...old.rows,...data.tickets.filter(row=>!old.rows.some(item=>item.id===row.id))]:data.tickets,cursor:data.next_cursor,more:!!data.has_more}));
 }catch{if(account.current===uid&&request===listVersion.current)setListError('Your requests could not load.');}finally{if(account.current===uid&&request===listVersion.current)setListing(false);}}
 useEffect(()=>{setRequests({uid:null,rows:[],cursor:null,more:false});loadRequests();return()=>{listVersion.current++;};},[uid]);
 async function refresh(){if(!receipt?.id)return;const request=++receiptVersion.current;setChecking(true);setError('');try{
 const response=await base44.functions.invoke('safety',{action:'ticket',id:receipt.id,...(receipt.token?{token:receipt.token}:{})});
 if(!response?.data?.ticket)throw Error();if(request===receiptVersion.current&&account.current===uid)setTicket(response.data.ticket);
 }catch{if(request===receiptVersion.current&&account.current===uid)setError('Could not load this request. Sign into its account or open its saved private receipt.');}finally{if(request===receiptVersion.current&&account.current===uid)setChecking(false);}}
 useEffect(()=>{setTicket(null);refresh();const update=()=>{if(document.visibilityState!=='hidden')refresh();};const timer=setInterval(update,30000);window.addEventListener('focus',update);return()=>{receiptVersion.current++;clearInterval(timer);window.removeEventListener('focus',update);};},[receipt,uid]);
 async function submit(event){event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setError('');try{
 const response=await base44.functions.invoke('safety',{action:'contact',subject:form.subject.trim(),message:form.message.trim(),email:form.email.trim()});
 if(!response?.data?.id||!response.data.token)throw Error('Save not confirmed');
 if(account.current!==uid)return;const saved={id:response.data.id,token:response.data.token};setReceipt(saved);try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}loadRequests();
 }catch(error){if(account.current===uid)setError(error?.response?.data?.error||'Could not send your message. Your draft is still here.');}finally{sending.current=false;if(account.current===uid)setBusy(false);}}
 function openRequest(row){setError('');setReceipt({id:row.id});setParams({ticket:row.id});}
 function newRequest(){setParams({});try{localStorage.removeItem(storageKey);}catch{}setReceipt(null);setTicket(null);setError('');setChecking(false);setForm({subject:'',message:'',email:''});}
 return <div className="support-page max-w-xl mx-auto pb-10 space-y-5"><header className="page-intro"><p className="eyebrow">Here to help</p><h1>PUBLIC Support</h1></header>
 <p className="text-muted-foreground">Get help with playback, your account, safety, or copyright. Signed-in requests stay with your account and replies appear in Activity.</p>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {receipt?<section className="rounded-2xl border bg-card p-5 space-y-3" aria-busy={checking}><h2 className="font-bold">Your support request</h2><p className="text-xs break-all">Reference: {receipt.id}</p><h3 className="font-semibold">{ticket?.subject}</h3><p className="text-sm text-muted-foreground">{ticket?.status}</p><p className="whitespace-pre-wrap break-words">{ticket?.reply||'Waiting for a reply. This page checks automatically while open.'}</p>
 {receipt.token&&<><p className="text-xs text-muted-foreground">Keep this receipt private. Anyone with it can view this request.</p><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(receipt)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='PUBLIC-support-receipt.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Save private receipt</Button></>}
 <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={checking} onClick={refresh}>{checking?'Checking…':'Refresh reply'}</Button><Button onClick={newRequest}>New request</Button></div></section>:
 <form className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4" onSubmit={submit}>
 <label className="block text-sm">Email (optional)<input autoComplete="email" inputMode="email" autoCapitalize="none" type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <p className="text-xs text-muted-foreground">{uid?'You will receive an in-app notification when Support replies.':'Save the private receipt after sending so you can recover your request.'} Email replies are not enabled.</p>
 <label className="block text-sm">Subject<input required minLength={3} maxLength={160} value={form.subject} onChange={event=>setForm({...form,subject:event.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <label className="block text-sm">Message<textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={event=>setForm({...form,message:event.target.value})} className="block w-full border rounded-xl p-3 bg-background"/></label>
 <Button disabled={busy} type="submit">{busy?'Sending…':'Send to PUBLIC'}</Button></form>}
 {uid&&<section className="rounded-2xl border p-4 space-y-3"><h2 className="font-semibold">Your requests</h2><p className="text-xs text-muted-foreground">Recover requests from any device signed into this account.</p>{requests.uid===uid&&requests.rows.map(row=><button key={row.id} className="block w-full text-left border rounded-xl p-3" onClick={()=>openRequest(row)}><strong className="block break-words">{row.subject}</strong><span className="text-xs text-muted-foreground">{row.status}</span></button>)}{listing&&<p role="status">Loading requests…</p>}{listError&&<p role="alert">{listError} <button className="underline" onClick={()=>loadRequests()}>Retry</button></p>}{requests.uid===uid&&!requests.rows.length&&!listing&&<p className="text-sm">No requests yet.</p>}{requests.uid===uid&&requests.more&&<Button variant="outline" disabled={listing} onClick={()=>loadRequests(true)}>Older requests</Button>}</section>}
 <label className="block text-sm">Open a saved private receipt<input type="file" accept="application/json" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;event.target.value='';try{if(file.size>65536)throw Error();const value=JSON.parse(await file.text());if(typeof value.id!=='string'||!value.id||value.id.length>200||typeof value.token!=='string'||!value.token||value.token.length>512)throw Error();const saved={id:value.id,token:value.token};setParams({});setReceipt(saved);setError('');try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}catch{setError('That receipt is not valid.');}}}/></label>
 <div className="flex gap-4 text-sm"><Link to="/privacy" className="underline">Privacy</Link><Link to="/terms" className="underline">Community & terms</Link></div></div>;
}
