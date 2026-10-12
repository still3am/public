import {useEffect,useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {useToast} from '@/components/ui/use-toast';
const flags=[['privacy_reviewed','Privacy policy and operator details reviewed'],['rights_reviewed','Music, artwork, lyrics and download rights verified'],['ios_tested','TestFlight playback, offline, camera, sharing and deletion tested'],['apple_login_verified','Every advertised sign-in provider and Apple account revocation verified']];
export default function ReleaseReadiness() {
 const [row,setRow]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {toast}=useToast();
 useEffect(()=>{base44.entities.AppSetting.list('-created_date',1).then(rows=>setRow(rows[0]||{})).catch(()=>setError('Could not load release settings'));},[]);
 const save=async()=>{setBusy(true);try{const data={operator_name:row.operator_name||'',support_email:row.support_email||'',...Object.fromEntries(flags.map(([k])=>[k,!!row[k]]))};const result=row.id?await base44.entities.AppSetting.update(row.id,data):await base44.entities.AppSetting.create(data);setRow(result);toast({title:'Release checklist saved'});}catch{setError('Could not save settings');}finally{setBusy(false);}};
 if(!row)return <p>{error||'Loading release checklist…'}</p>;
 const pending=flags.filter(([k])=>!row[k]).length+(!row.operator_name?.trim()?1:0);
 return <section className="rounded-2xl border p-5 space-y-4"><h2 className="text-xl font-bold">App Store readiness</h2><p className="text-sm text-muted-foreground">{pending?pending+' items require verification':'Checklist complete. Confirm the uploaded build matches the tested version.'}</p>
 <label className="block text-sm">Legal operator name<input className="block w-full bg-background border rounded-xl p-3" value={row.operator_name||''} onChange={e=>setRow({...row,operator_name:e.target.value})}/></label>
 <label className="block text-sm">Support email (optional; support inbox works without it)<input type="email" className="block w-full bg-background border rounded-xl p-3" value={row.support_email||''} onChange={e=>setRow({...row,support_email:e.target.value})}/></label>
 {flags.map(([key,label])=><label className="flex items-start gap-3 text-sm" key={key}><input type="checkbox" checked={!!row[key]} onChange={e=>setRow({...row,[key]:e.target.checked})}/>{label}</label>)}
 <p className="text-xs text-muted-foreground">These are administrator attestations, not automatic test results. Do not mark an item until it has been verified. Also complete age rating, screenshots, privacy labels, export compliance and review credentials in App Store Connect.</p>
 {error&&<p className="text-destructive" role="alert">{error}</p>}<Button disabled={busy} onClick={save}>{busy?'Saving…':'Save checklist'}</Button>
 <div className="flex gap-4 text-sm underline"><a href="/privacy" target="_blank" rel="noreferrer">Privacy</a><a href="/terms" target="_blank" rel="noreferrer">Terms</a><a href="/support" target="_blank" rel="noreferrer">Support</a></div></section>;
}