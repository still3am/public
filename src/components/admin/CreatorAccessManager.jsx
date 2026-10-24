import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {setCreatorAccess} from '@/lib/creatorAccess';
export default function CreatorAccessManager(){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState('');const lock=useRef(false);
 async function load(){setLoading(true);setError('');try{const result=await base44.entities.ArtistApplication.filter({status:'pending'},'-created_date',100);setRows(Array.isArray(result)?result:[]);}catch{setError('Applications could not load.');}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 async function review(row,approved){
 if(lock.current)return;lock.current=true;setBusy(row.id);setError('');
 try{const member=await base44.entities.User.get(row.user_id);if(approved)await setCreatorAccess(base44,member,'artist');const status=approved?'approved':'rejected';const saved=await base44.entities.ArtistApplication.update(row.id,{status});if(saved.status!==status)throw Error('Application review was not confirmed.');setRows(old=>old.filter(a=>a.id!==row.id));}
 catch(e){setError(e.message||'Review could not be saved.');}finally{lock.current=false;setBusy('');}
 }
 return <section className="border rounded-2xl p-4 mb-6"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">Artist applications</h3><p className="text-xs text-muted-foreground mt-1">Approve registration to grant uploads and the artist check.</p></div><button type="button" className="text-xs underline" onClick={load} disabled={!!busy}>Refresh</button></div>{error&&<p role="alert" className="text-sm mt-3">{error}</p>}{loading?<p className="text-xs mt-4">Loading applications…</p>:!rows.length?<p className="text-xs text-muted-foreground mt-4">No pending applications.</p>:rows.map(row=><article key={row.id} className="border-t mt-4 pt-4"><Link to={'/profile/'+row.user_id} className="font-semibold underline">{row.artist_name}</Link><p className="text-xs text-muted-foreground mt-1">{row.genre}</p><p className="text-sm mt-3 whitespace-pre-wrap break-words">{row.bio}</p><p className="text-xs break-all mt-3">{row.music_url}</p><div className="flex gap-3 mt-4"><button className="playlist-action" disabled={!!busy} onClick={()=>review(row,true)}>{busy===row.id?'Saving…':'Approve artist'}</button><button className="playlist-action" disabled={!!busy} onClick={()=>review(row,false)}>Decline</button></div></article>)}</section>;
}
