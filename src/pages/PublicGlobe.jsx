import {useCallback,useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {Globe2,RefreshCw} from "lucide-react";
import {publicNoteDatabase} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {loadGlobe,saveGlobeShare} from "@/lib/publicGlobe";
import {COUNTRIES} from "@/lib/globeWorld";
import PublicGlobeView from "@/components/PublicGlobeView";
import TrackRow from "@/components/TrackRow";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./public-globe.css";
export default function PublicGlobe(){
 const {user}=useAuth(),[shares,setShares]=useState([]),[country,setCountry]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[editing,setEditing]=useState(false),[picker,setPicker]=useState(false),[draft,setDraft]=useState(null),[place,setPlace]=useState(""),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState("");
 const version=useRef(0),lock=useRef(false);
 const load=useCallback(async()=>{const current=++version.current;setLoading(true);setError("");try{const next=await loadGlobe(publicNoteDatabase);if(current===version.current)setShares(next);}catch{if(current===version.current)setError("Couldn’t load shared music. Please retry.");}finally{if(current===version.current)setLoading(false);}},[]);
 useEffect(()=>{load();const timer=setInterval(load,60000);return()=>{version.current++;clearInterval(timer);};},[load,user?.id]);
 const visible=shares.filter(s=>!country||s.country===country),own=shares.find(s=>s.user_id===user?.id);
 function open(){setDraft(own?.track||null);setPlace(own?.country||country);setSaveError("");setEditing(true);}
 async function save(remove=false){if(lock.current)return;lock.current=true;setBusy(true);setSaveError("");try{await saveGlobeShare(publicNoteDatabase,place,draft?.id,remove);setEditing(false);await load();}catch{setSaveError("Couldn’t confirm your change. Your selection is still here—please retry.");}finally{lock.current=false;setBusy(false);}}
 const name=COUNTRIES.find(c=>c.code===country)?.name;
 return <div className="public-globe-page"><header className="globe-heading"><div><p className="globe-eyebrow"><Globe2 size={14}/> PUBLIC GLOBE · EARLY ACCESS</p><h1>A world of sound.</h1><p>Different places. One language.</p></div><button className="globe-primary" onClick={open}>{own?"Your globe share":"Put your song on the globe"}</button></header>
 <div className="globe-layout"><section className="globe-stage" aria-label="Explore the world"><div className="globe-stage-top"><span>Music without borders</span><span>{loading?"Connecting…":shares.length+" shared songs"}</span></div><PublicGlobeView shares={shares} country={country} onCountry={setCountry}/><p className="globe-footnote">Countries are chosen by listeners. No precise locations.</p></section>
 <section className="globe-discovery"><div className="globe-discovery-heading"><div><p className="globe-eyebrow">TUNE INTO</p><h2>{name||"Around the world"}</h2></div><button className="globe-icon" aria-label="Refresh globe shares" disabled={loading} onClick={load}><RefreshCw size={17}/></button></div>
 <label className="globe-country-label">Explore a country<select value={country} onChange={e=>setCountry(e.target.value)}><option value="">All countries</option>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
 {error?<div className="globe-empty" role="alert"><p>{error}</p><button onClick={load}>Try again</button></div>:loading&&!shares.length?<p className="globe-empty" role="status">Finding shared songs…</p>:!visible.length?<div className="globe-empty"><Globe2 size={30}/><h3>Start a new connection.</h3><p>No songs shared {name?"from "+name:"here"} yet. Share a song and help this part of the globe light up.</p><button onClick={open}>Share a song</button></div>:<div className="globe-song-list">{visible.map((s,index)=><article key={s.id}><p><span>{COUNTRIES.find(c=>c.code===s.country)?.name}</span><Link to={"/profile/"+s.user_id}>{s.name}</Link></p><TrackRow track={s.track} queue={visible.map(row=>row.track)} queueIndex={index} showArt/></article>)}</div>}
 <p className="globe-footnote">Voluntary song shares from the last 24 hours. A snapshot of up to 100 recent shares, refreshed every minute.</p></section></div>
 {editing&&<Dialog open={!picker} onOpenChange={value=>{if(!busy&&!picker)setEditing(value);}}><DialogContent className="globe-share-dialog"><DialogHeader><DialogTitle>Your place. Your sound.</DialogTitle><DialogDescription>Share a song and a country on PUBLIC Globe for 24 hours. Other users can see your profile with it. Location sharing is optional and uses no GPS.</DialogDescription></DialogHeader><label className="globe-country-label">Choose your country<select value={place} disabled={busy} onChange={e=>setPlace(e.target.value)}><option value="">Choose a country</option>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label><button className="globe-song-choice" disabled={busy} onClick={()=>setPicker(true)}><strong>{draft?.title||"Choose your song"}</strong><span>{draft?.artist||"A song that deserves to travel."}</span></button>{saveError&&<p role="alert">{saveError}</p>}<div className="globe-share-actions">{own&&<button disabled={busy} onClick={()=>save(true)}>Remove share</button>}<button className="globe-primary" disabled={busy||!draft||!place} onClick={()=>save()}>{busy?"Saving…":own?"Update share":"Share for 24 hours"}</button></div></DialogContent></Dialog>}
 {editing&&picker&&<TrackPickerSheet title="Choose a song for the world" tracks={[]} selectedIds={draft?[draft.id]:[]} onToggle={(_id,track)=>{setDraft(track);setPicker(false);}} onClose={()=>setPicker(false)}/>}
 </div>;
}
