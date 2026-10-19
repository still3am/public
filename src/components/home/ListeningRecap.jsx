import {useEffect,useMemo,useState} from "react";
import {useAuth} from "@/lib/AuthContext";
import {usePlayer} from "@/context/PlayerContext";
import {base44} from "@/api/base44Client";
import {readAllPages} from "@/lib/readPages";
import {buildRecap,recapBounds} from "@/lib/recapModel";
import {pendingListening,syncListeningHistory} from "@/lib/listeningHistory";
import {Play,Headphones} from "lucide-react";
export default function ListeningRecap({catalog=[]}){
 const {user}=useAuth(),player=usePlayer(),[period,setPeriod]=useState("month"),[value,setValue]=useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}),[data,setData]=useState({uid:null,sessions:[],events:[]}),[error,setError]=useState(false),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 const date=period==="year"?value.slice(0,4)+"-01-15T12:00:00":value+"-15T12:00:00";
 useEffect(()=>{
  if(!user?.id)return;
  let alive=true;setLoading(true);setError(false);
  const {start,end}=recapBounds(period,date);
  (async()=>{try{
   await syncListeningHistory(user.id);
   const [sessions,events]=await Promise.all([
    readAllPages(opts=>base44.entities.ListeningSession.filter({started_at:{$gte:start.toISOString(),$lt:end.toISOString()}},{sort:"-started_at",...opts})),
    readAllPages(opts=>base44.entities.PlayEvent.filter({user_id:user.id,created_date:{$gte:start.toISOString(),$lt:end.toISOString()}},{sort:"-created_date",...opts}))
   ]);
   if(alive)setData({uid:user.id,sessions:[...pendingListening(user.id),...sessions],events});
  }catch{if(alive)setError(true);}finally{if(alive)setLoading(false);}})();
  return()=>{alive=false;};
 },[user?.id,period,date,retry]);
 const recap=useMemo(()=>buildRecap(data.uid===user?.id?data.sessions:[],data.uid===user?.id?data.events:[],catalog,period,date),[data,user?.id,catalog,period,date]);
 if(!user)return null;
 const title=new Date(date).toLocaleDateString(undefined,period==="year"?{year:"numeric"}:{month:"long",year:"numeric"});
 return <section className="home-section mb-10 md:mb-12" aria-label="Your listening recap">
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="text-xl md:text-2xl font-bold tracking-tight">Your PUBLIC recap</h2><div className="flex gap-1 p-1 rounded-full bg-foreground/5">{[["month","Monthly"],["year","Yearly"]].map(([key,label])=><button key={key} className={"px-4 py-2 rounded-full text-xs font-semibold "+(period===key?"bg-foreground text-background":"")} aria-pressed={period===key} onClick={()=>setPeriod(key)}>{label}</button>)}</div></div>
  <div className="rounded-3xl border bg-card p-5 md:p-8">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground uppercase tracking-widest">YOUR SOUNDTRACK</p><h3 className="text-3xl md:text-4xl font-bold mt-2">{title}</h3></div><input aria-label={period==="year"?"Recap year":"Recap month"} type={period==="year"?"number":"month"} min={period==="year"?"2020":"2020-01"} max={period==="year"?new Date().getFullYear():new Date().toISOString().slice(0,7)} value={period==="year"?value.slice(0,4):value} onChange={e=>{if(period==="year"){if(/^\d{4}$/.test(e.target.value))setValue(e.target.value+"-01");}else if(e.target.value)setValue(e.target.value);}} className="rounded-xl border bg-background px-3 py-2 text-sm max-w-[180px]"/></div>
   {loading?<p className="py-8 text-sm text-muted-foreground">Gathering your listening…</p>:error?<button className="mt-5 text-sm underline" onClick={()=>setRetry(n=>n+1)}>Retry your recap</button>:!recap.plays?<div className="py-8"><Headphones size={26} className="mb-3 opacity-50"/><p className="font-semibold">Your soundtrack starts with a song.</p><p className="text-sm text-muted-foreground mt-2">Listen on PUBLIC to build your recap.</p></div>:<>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-7 mb-6">{[[recap.plays,"plays"],[recap.unique,"different songs"],[recap.artist,"top artist"],[recap.genre||"—","top genre"]].map(([v,label])=><div key={label}><p className="text-xl md:text-2xl font-bold break-words">{v}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></div>)}</div>
   <p className="text-sm text-muted-foreground mb-4">{recap.seconds<60?"Less than a minute":Math.floor(recap.seconds/60)+" minutes"} of recorded listening. Older plays may not include listening time.</p>
   <button className="chrome-button" onClick={()=>{player.setShuffle(false);player.playTrackAt(recap.tracks,0);}}><Play size={16} fill="currentColor"/>Play your recap</button>
   <ol className="mt-5 space-y-1">{recap.tracks.slice(0,5).map((t,i)=><li key={t.id}><button className="w-full flex items-center gap-3 py-3 text-left rounded-xl hover:bg-foreground/5" onClick={()=>player.playTrackAt(recap.tracks,i)}><span className="w-6 text-muted-foreground text-sm">{i+1}</span><span className="flex-1 min-w-0"><strong className="block text-sm truncate">{t.title}</strong><span className="block text-xs text-muted-foreground truncate">{t.artist}</span></span><span className="text-xs text-muted-foreground">{t.recap_plays} plays</span></button></li>)}</ol>
   </>}
  </div>
 </section>;
}
