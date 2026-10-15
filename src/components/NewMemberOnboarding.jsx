import {useRef,useState} from "react";
import {ArrowRight,Check,Headphones,Library,WifiOff,Users,Loader2} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import MotionGradient from "@/components/MotionGradient";
import {useAuth} from "@/lib/AuthContext";
import {base44} from "@/api/base44Client";
import {GENRES} from "@/lib/audio-utils";
import {saveUserGenres} from "@/lib/userGenres";
import "./new-member-onboarding.css";

// Existing members keep their current experience; enrollment starts with this release.
const ENROLLMENT_START=Date.parse("2026-10-15T06:07:04Z");
const GRADIENTS=[["#223477","#b66be8","#5fcecd"],["#694ab5","#ee899d","#f4c38c"],["#194a64","#58c6b0","#9384dd"]];
const savedLocally=id=>{try{return localStorage.getItem("public:onboarded:"+id)==="1";}catch{return false;}};
function WelcomeFlow({user}){
 const {checkUserAuth}=useAuth();
 const [step,setStep]=useState(0),[genres,setGenres]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const lock=useRef(false);
 async function finish(skip=false){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{
   if(!skip&&genres.length)await saveUserGenres(genres,user.id);
   await base44.auth.updateMe({onboarding_completed:true});
   const confirmed=await base44.auth.me();
   if(confirmed.onboarding_completed!==true)throw Error("Not saved");
   try{localStorage.setItem("public:onboarded:"+user.id,"1");}catch{}
   setDone(true);window.dispatchEvent(new CustomEvent("preferences:changed",{detail:{uid:user.id}}));
   await checkUserAuth({silent:true});
  }catch{setError("Setup couldn’t save. Your choices are still here—please try again.");}
  finally{lock.current=false;setBusy(false);}
 }
 if(done)return null;
 const title=["Your music. Your PUBLIC.","Find your next favorite.","Make yourself at home."][step];
 const description=["A place to discover music, build your collection, and connect through what you love.","Choose a few sounds you love. We’ll use them to shape Discover and your next songs.","Everything starts with a song. Here’s where to go next."][step];
 return <Dialog open onOpenChange={open=>{if(!open)finish(true);}}>
  <DialogContent className="new-member-onboarding" data-public-dialog onPointerDownOutside={event=>event.preventDefault()} onEscapeKeyDown={event=>{event.preventDefault();finish(true);}}>
   <div className="onboarding-visual">
    <MotionGradient colors={GRADIENTS[step]} speed={.65} className="absolute inset-0"/>
    <div className="onboarding-visual-shade" aria-hidden="true"/>
    <span className="onboarding-wordmark">PUBLIC.</span>
    <button type="button" onClick={()=>finish(true)} disabled={busy} className="onboarding-skip">Skip setup</button>
    <div className="onboarding-visual-copy"><Headphones size={34} strokeWidth={1.4}/><p>{["Music brings us here.","A little more you.","You’re in good company."][step]}</p></div>
   </div>
   <div className="onboarding-content" key={step}>
    <p className="onboarding-step-label">WELCOME TO PUBLIC · {step+1} OF 3</p>
    <DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>
    {step===0&&<div className="onboarding-benefits"><span><Headphones size={18}/>Discover something new</span><span><Library size={18}/>Keep what you love</span><span><Users size={18}/>Share it with your people</span></div>}
    {step===1&&<><div className="onboarding-genres" role="group" aria-label="Choose music genres">{GENRES.filter(genre=>genre!=="Other").map(genre=><button type="button" key={genre} disabled={busy} aria-pressed={genres.includes(genre)} onClick={()=>setGenres(previous=>previous.includes(genre)?previous.filter(g=>g!==genre):[...previous,genre])}>{genres.includes(genre)&&<Check size={13}/>}<span>{genre}</span></button>)}</div><p className="onboarding-optional">{genres.length?genres.length+" selected":"Optional. You can explore every genre."}</p></>}
    {step===2&&<div className="onboarding-guide">{[{icon:Library,title:"Your library",text:"Save songs and organize playlists."},{icon:WifiOff,title:"Offline music",text:"Use Add to offline on a song’s menu to save it for listening without data."},{icon:Users,title:"Your profile",text:"Pick a profile song, choose your colors, and find your people."}].map(item=><div key={item.title}><item.icon size={20}/><span><strong>{item.title}</strong><small>{item.text}</small></span></div>)}</div>}
   </div>
   <footer className="onboarding-footer">
    {error&&<p role="alert">{error}</p>}
    <div className="onboarding-progress" aria-label={`Step ${step+1} of 3`}>{[0,1,2].map(index=><span key={index} className={index===step?"active":""}/>)}</div>
    <div className="onboarding-buttons">{step>0&&<button type="button" onClick={()=>{setStep(v=>v-1);setError("");}} disabled={busy}>Back</button>}<button type="button" className="onboarding-next" disabled={busy} onClick={()=>step===2?finish():setStep(v=>v+1)}>{busy?<Loader2 size={17} className="animate-spin"/>:null}{busy?"Saving…":step===2?"Start listening":step===0?"Get started":"Continue"}{!busy&&<ArrowRight size={17}/>}</button></div>
   </footer>
  </DialogContent>
 </Dialog>;
}
export default function NewMemberOnboarding(){
 const {user}=useAuth();
 if(!user?.id||user.role==="admin"||user.onboarding_completed===true||savedLocally(user.id)||!(Date.parse(user.created_date)>=ENROLLMENT_START))return null;
 return <WelcomeFlow key={user.id} user={user}/>;
}
