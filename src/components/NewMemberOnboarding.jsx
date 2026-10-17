import {useEffect,useMemo,useRef,useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowRight,ArrowLeft,Check,Headphones,Users,Loader2,Camera,Search,Music2,ShieldCheck,Palette,Plus} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import MotionGradient from "@/components/MotionGradient";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import ProfileColorWheel from "@/components/profile/ProfileColorWheel";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import {useAuth} from "@/lib/AuthContext";
import {useSafety} from "@/context/SafetyContext";
import {base44} from "@/api/base44Client";
import {GENRES} from "@/lib/audio-utils";
import {getPublishedTracks} from "@/lib/catalogCache";
import {getUserMusicPreferences,saveUserMusicPreferences} from "@/lib/userGenres";
import {ONBOARDING_PALETTES,cleanHandle,validHandle,credits,recommendPeople,readOnboardingDraft,draftKey} from "@/lib/onboardingModel";
import "./new-member-onboarding.css";
import "./profile/profile-colors.css";

const ENROLLMENT_START=Date.parse("2026-10-15T06:07:04Z");
const TITLES=["Welcome to PUBLIC.","Make it yours.","What’s your sound?","Choose your favorites.","Find your people.","Set the mood.","Your music. Your choice."];
const DESCRIPTIONS=["Find your sound. Find your people.","The music is public. Your identity is yours.","Pick the genres you love—or keep your ears open to everything.","A few songs and artists give your first mixes somewhere to start.","Follow a few people. Make your corner of PUBLIC feel familiar.","Your song. Your colors. Your space.","Decide which favorites appear on your public profile."];
const rows=page=>Array.isArray(page)?page:Array.isArray(page?.items)?page.items:[];
const savedLocally=id=>{try{return localStorage.getItem("public:onboarded:"+id)==="1";}catch{return false;}};
const errorText=error=>(error?.response?.status===402||error?.status===402)?"This save is temporarily unavailable. Your choices are kept; retry or skip this step.":error?.response?.data?.error||error?.message||"This step could not save. Your choices are kept.";
function SongCover({url}){const cover=useCoverUrl(url);return <span className="onboarding-cover">{cover?<img src={cover} alt="" loading="lazy"/>:<Music2 size={20}/>}</span>;}
function initialDraft(user){
 const previous=readOnboardingDraft(user.id);
 return {step:0,name:user.display_name||user.full_name||"",username:user.username||"",avatar:user.avatar_url||"",genres:[],trackIds:[],artists:[],profileTrack:user.featured_track_id||"",mode:user.profile_background_mode||"custom",colors:user.profile_background_colors?.length?user.profile_background_colors:ONBOARDING_PALETTES[0].colors,shareFavorites:!!user.top_track_ids?.length,sharingChanged:false,...previous};
}
export function WelcomeFlow({user,onDone}){
 const nav=useNavigate(),{checkUserAuth}=useAuth(),{blocked}=useSafety();
 const [draft,setDraft]=useState(()=>initialDraft(user)),[busy,setBusy]=useState(false),[error,setError]=useState(""),[catalog,setCatalog]=useState([]),[profiles,setProfiles]=useState([]),[following,setFollowing]=useState(new Set()),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[followBusy,setFollowBusy]=useState(""),[query,setQuery]=useState(""),[genreQuery,setGenreQuery]=useState(""),[musicTab,setMusicTab]=useState("artists"),[limit,setLimit]=useState(20),[colorIndex,setColorIndex]=useState(0),[picker,setPicker]=useState(false);
 const lock=useRef(false),alive=useRef(true),content=useRef(null),fileInput=useRef(null),hasDraft=useRef(!!readOnboardingDraft(user.id)),request=useRef(0),followLock=useRef(false);

 const step=Math.max(0,Math.min(6,Number(draft.step)||0));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const update=patch=>{if(lock.current)return;setError("");setDraft(old=>({...old,...patch}));};
 useEffect(()=>{try{localStorage.setItem(draftKey(user.id),JSON.stringify({...draft,uid:user.id}));}catch{}},[draft,user.id]);
 useEffect(()=>{content.current?.scrollTo({top:0});setQuery("");setLimit(20);},[step]);
 async function load(){
  const version=++request.current;setLoading(true);setLoadError("");
  const result=await Promise.allSettled([
   getPublishedTracks(),
   getUserMusicPreferences(user.id),
   base44.entities.PublicProfile.filter({visible:true},{sort:"-updated_date",limit:100,fields:["user_id","display_name","username","avatar_url","top_track_ids","is_artist","visible"]}),
   base44.entities.Follow.filter({follower_id:user.id},"-created_date",500)
  ]);
  if(!alive.current||version!==request.current)return;
  if(result[0].status==="fulfilled")setCatalog(result[0].value);
  if(result[1].status==="fulfilled"&&!hasDraft.current){const taste=result[1].value;setDraft(old=>({...old,genres:taste.genres,trackIds:taste.favorite_track_ids,artists:taste.favorite_artists}));hasDraft.current=true;}
  if(result[2].status==="fulfilled")setProfiles(rows(result[2].value));
  if(result[3].status==="fulfilled")setFollowing(new Set(rows(result[3].value).map(r=>r.following_id)));
  if(result.some(r=>r.status==="rejected"))setLoadError("Some choices could not load. Retry, or skip any optional step.");
  setLoading(false);
 }
 useEffect(()=>{load();},[user.id]);
 const visibleCatalog=useMemo(()=>catalog.filter(t=>t.is_published===true&&!blocked.has(t.uploader_id)),[catalog,blocked]);
 const byId=useMemo(()=>new Map(visibleCatalog.map(t=>[t.id,t])),[visibleCatalog]);
 const artistOptions=useMemo(()=>{
  const map=new Map();for(const track of visibleCatalog)for(const name of credits(track)){const key=name.toLowerCase();if(!map.has(key))map.set(key,{name,cover:track.cover_art_url,genre:track.genre});}
  return [...map.values()].sort((a,b)=>Number(draft.genres.includes(b.genre))-Number(draft.genres.includes(a.genre))||a.name.localeCompare(b.name));
 },[visibleCatalog,draft.genres]);
 const songs=useMemo(()=>visibleCatalog.filter(t=>!query.trim()||[t.title,t.artist].join(" ").toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>Number(draft.genres.includes(b.genre))-Number(draft.genres.includes(a.genre))),[visibleCatalog,query,draft.genres]);
 const artists=artistOptions.filter(a=>a.name.toLowerCase().includes(query.trim().toLowerCase()));
 const suggestions=useMemo(()=>recommendPeople(profiles,visibleCatalog,{uid:user.id,blocked,genres:draft.genres,artists:draft.artists,trackIds:draft.trackIds}),[profiles,visibleCatalog,user.id,blocked,draft.genres,draft.artists,draft.trackIds]);
 async function owner(){const current=await base44.auth.me();if(current?.id!==user.id)throw Error("Your account changed. Reopen setup for the current account.");return current;}
 async function complete(skip=false){
  if(lock.current||followLock.current)return;lock.current=true;setBusy(true);setError("");
  try{
   await owner();
   if(!skip&&draft.sharingChanged){const current=await owner();const selected=draft.trackIds.filter(id=>byId.has(id)).slice(0,8);const next=draft.shareFavorites?selected:[];if(JSON.stringify(current.top_track_ids||[])!==JSON.stringify(next))await base44.auth.updateMe({top_track_ids:next});}
   await base44.auth.updateMe({onboarding_completed:true});
   const confirmed=await owner();if(confirmed.onboarding_completed!==true)throw Error("Completion was not confirmed. Please retry.");
   try{localStorage.setItem("public:onboarded:"+user.id,"1");localStorage.removeItem(draftKey(user.id));}catch{}
   window.dispatchEvent(new CustomEvent("preferences:changed",{detail:{uid:user.id}}));window.dispatchEvent(new Event("profiles:changed"));
   await checkUserAuth({silent:true});
   if(alive.current){onDone();nav("/");}
  }catch(e){if(alive.current)setError(errorText(e));}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function next(skip=false){
  if(lock.current||followLock.current)return;if(step===6){await complete(skip);return;}
  lock.current=true;setBusy(true);setError("");
  try{
   await owner();
   if(!skip&&step===1){
    const name=draft.name.trim(),username=cleanHandle(draft.username);
    if(name.length<2||name.length>60)throw Error("Use a display name between 2 and 60 characters.");
    if(!validHandle(username))throw Error("Use 3–24 letters, numbers or underscores for your username.");
    const patch={};if(name!==(user.display_name||user.full_name||""))patch.display_name=name;if(username!==(user.username||""))patch.username=username;if(draft.avatar!==(user.avatar_url||""))patch.avatar_url=draft.avatar;
    if(Object.keys(patch).length){const saved=await base44.auth.updateMe(patch);if(saved?.id!==user.id)throw Error("Profile was not confirmed.");await checkUserAuth({silent:true});window.dispatchEvent(new Event("profiles:changed"));}
   }
   if(!skip&&step===2)await saveUserMusicPreferences({genres:draft.genres},user.id);
   if(!skip&&step===3){if(loading||loadError)throw Error("Retry loading your music choices, or skip this step.");await saveUserMusicPreferences({favorite_track_ids:draft.trackIds.filter(id=>byId.has(id)),favorite_artists:draft.artists.filter(name=>artistOptions.some(a=>a.name===name))},user.id);}
   if(!skip&&step===5){const patch={profile_background_mode:draft.mode,profile_background_colors:draft.colors,profile_background_motion:"flow",profile_background_speed:1,featured_track_id:draft.profileTrack};await base44.auth.updateMe(patch);const saved=await owner();if(saved.featured_track_id!==draft.profileTrack||saved.profile_background_mode!==draft.mode)throw Error("Profile style was not confirmed.");await checkUserAuth({silent:true});}
   if(alive.current)setDraft(old=>({...old,step:step+1}));
  }catch(e){if(alive.current)setError(errorText(e));}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function upload(file){
  if(!file||lock.current)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setError("Choose a JPG, PNG or WebP photo under 5 MB.");return;}
  lock.current=true;setBusy(true);setError("");
  try{await owner();const result=await base44.integrations.Core.UploadFile({file});await owner();if(!result?.file_url)throw Error("Photo upload was not confirmed.");if(alive.current)setDraft(old=>({...old,avatar:result.file_url}));}
  catch(e){if(alive.current)setError(errorText(e));}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function follow(profile){
  if(lock.current||followLock.current)return;const uid=profile.user_id;setFollowBusy(uid);setError("");
  try{await owner();const was=following.has(uid);if(was)await base44.entities.Follow.deleteMany({follower_id:user.id,following_id:uid});else{const result=await base44.entities.Follow.create({follower_id:user.id,following_id:uid});if(!result?.id)throw Error("Follow was not confirmed.");}
   if(alive.current){setFollowing(old=>{const value=new Set(old);if(was)value.delete(uid);else value.add(uid);return value;});window.dispatchEvent(new CustomEvent("follows:changed",{detail:{uid:user.id,followingId:uid,following:!was}}));}
  }catch(e){if(alive.current)setError(errorText(e));}finally{followLock.current=false;if(alive.current)setFollowBusy("");}
 }
 const toggle=(key,value,max)=>{const current=draft[key];if(!current.includes(value)&&current.length>=max){setError("Choose up to "+max+" "+(key==="artists"?"artists":"songs")+".");return;}update({[key]:current.includes(value)?current.filter(v=>v!==value):[...current,value]});};
 const colors=step===5&&draft.mode!=="off"?draft.colors:ONBOARDING_PALETTES[0].colors;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)complete(true);}}>
  <DialogContent className="new-member-onboarding onboarding-identity" data-public-dialog onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>{e.preventDefault();}}>
   <MotionGradient colors={colors} speed={.85} className="onboarding-background"/>
   <header className="onboarding-header"><Logo width="92px" className="onboarding-logo"/><button type="button" disabled={busy||!!followBusy} onClick={()=>complete(true)}>Finish later</button></header>
   <main ref={content} className="onboarding-content" key={step}>
    <div className="onboarding-page-intro"><p className="onboarding-step-label">{step===0?"YOUR SOUND STARTS HERE":"YOUR PUBLIC · "+step+" OF 6"}</p><DialogTitle>{TITLES[step]}</DialogTitle><DialogDescription>{DESCRIPTIONS[step]}</DialogDescription></div>
    {step===0&&<div className="onboarding-welcome"><div className="onboarding-welcome-symbol"><Headphones size={62} strokeWidth={1}/></div><div className="onboarding-benefits"><span><Music2 size={18}/>Music that feels like you</span><span><Users size={18}/>People who get your sound</span><span><Palette size={18}/>A profile with its own mood</span></div><p className="onboarding-note">Start as a listener. Artist Mode is always available later in Settings.</p></div>}
    {step===1&&<div className="onboarding-form"><button className="onboarding-photo" type="button" disabled={busy} onClick={()=>fileInput.current?.click()} aria-label="Choose your profile photo"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={88}/><span><Camera size={16}/></span></button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value="";}}/><label>Display name<input value={draft.name} maxLength={60} autoComplete="nickname" disabled={busy} onChange={e=>update({name:e.target.value})}/></label><label>Username <small>Optional</small><div className="onboarding-handle"><span>@</span><input value={draft.username} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" disabled={busy} placeholder="your_sound" onChange={e=>update({username:cleanHandle(e.target.value)})}/></div></label><p className="onboarding-note">Your name, photo and chosen username appear on your public profile. Username availability is checked when you continue.</p><div className="onboarding-profile-preview"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={40}/><span><strong>{draft.name||"Your name"}</strong><small>{draft.username?"@"+draft.username:"Listener on PUBLIC"}</small></span></div></div>}
    {step===2&&<><div className="onboarding-search"><Search size={18}/><input aria-label="Find genres" placeholder="Find a genre" value={genreQuery} onChange={e=>setGenreQuery(e.target.value)}/></div><button type="button" className="onboarding-surprise" disabled={busy} onClick={()=>update({genres:[]})}>Surprise me · Explore everything</button><div className="onboarding-genres" role="group" aria-label="Favorite genres">{GENRES.filter(g=>g!=="Other"&&g.toLowerCase().includes(genreQuery.toLowerCase())).map((genre,index)=><button type="button" key={genre} aria-pressed={draft.genres.includes(genre)} disabled={busy} style={{"--genre-hue":(index*39+220)%360}} onClick={()=>update({genres:draft.genres.includes(genre)?draft.genres.filter(g=>g!==genre):[...draft.genres,genre]})}>{genre}{draft.genres.includes(genre)&&<Check size={16}/>}</button>)}</div><p className="onboarding-note">{draft.genres.length?draft.genres.length+" genres selected":"No limits. You can listen to every genre."}</p></>}
    {step===3&&<><div className="onboarding-tabs" role="group" aria-label="Choose favorites"><button aria-pressed={musicTab==="artists"} onClick={()=>{setMusicTab("artists");setLimit(20);}}>Artists · {draft.artists.length}/5</button><button aria-pressed={musicTab==="songs"} onClick={()=>{setMusicTab("songs");setLimit(20);}}>Songs · {draft.trackIds.length}/8</button></div><div className="onboarding-search"><Search size={18}/><input aria-label="Search favorite music" placeholder="Search PUBLIC’s music" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20);}}/></div><div className="onboarding-selected">{(musicTab==="artists"?draft.artists:draft.trackIds).map(value=><button key={value} type="button" onClick={()=>toggle(musicTab==="artists"?"artists":"trackIds",value,musicTab==="artists"?5:8)}>{musicTab==="artists"?value:byId.get(value)?.title||"Selected song"}<Check size={13}/></button>)}</div><div className="onboarding-music-list">{musicTab==="artists"?artists.slice(0,limit).map(a=><button type="button" className="onboarding-music-row" key={a.name} aria-pressed={draft.artists.includes(a.name)} onClick={()=>toggle("artists",a.name,5)}><SongCover url={a.cover}/><span><strong>{a.name}</strong><small>Artist</small></span>{draft.artists.includes(a.name)?<Check size={19}/>:<Plus size={18}/>}</button>):songs.slice(0,limit).map(t=><button type="button" className="onboarding-music-row" key={t.id} aria-pressed={draft.trackIds.includes(t.id)} onClick={()=>toggle("trackIds",t.id,8)}><SongCover url={t.cover_art_url}/><span><strong>{t.title}</strong><small>{t.artist||t.uploader_name}</small></span>{draft.trackIds.includes(t.id)?<Check size={19}/>:<Plus size={18}/>}</button>)}</div>{loading?<p className="onboarding-note">Loading PUBLIC’s catalog…</p>:!(musicTab==="artists"?artists:songs).length&&<p className="onboarding-note">No matches yet. Try another name, or continue without favorites.</p>}{(musicTab==="artists"?artists:songs).length>limit&&<button className="onboarding-secondary" onClick={()=>setLimit(n=>n+20)}>Show more</button>}<p className="onboarding-note">These are taste picks, not listening history. They stay private unless you choose to share them in the last step.</p></>}
    {step===4&&<div className="onboarding-people">{suggestions.map(profile=><div className="onboarding-person" key={profile.user_id}><Avatar user={profile} size={48}/><span><strong>{profile.display_name||profile.username||"PUBLIC listener"}</strong><small>{profile.reason}</small></span><button type="button" disabled={!!followBusy} aria-pressed={following.has(profile.user_id)} onClick={()=>follow(profile)}>{followBusy===profile.user_id?<Loader2 size={16} className="animate-spin"/>:following.has(profile.user_id)?<><Check size={14}/>Following</>:"Follow"}</button></div>)}{!suggestions.length&&<p className="onboarding-note">{loading?"Finding your people…":"More people will appear as PUBLIC grows. You can search for friends anytime."}</p>}<p className="onboarding-note">Suggestions use publicly shared favorites and uploads. Following is always your choice.</p></div>}
    {step===5&&<div className="onboarding-mood"><div className="onboarding-profile-preview mood-preview"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={56}/><span><strong>{draft.name||"Your PUBLIC"}</strong><small>{byId.get(draft.profileTrack)?.title||"Pick your profile song"}</small></span></div><button type="button" className="onboarding-secondary" onClick={()=>setPicker(true)}><Music2 size={16}/>{draft.profileTrack?"Change profile song":"Choose a profile song"}</button>{draft.profileTrack&&<button type="button" className="onboarding-text-button" onClick={()=>update({profileTrack:""})}>Remove profile song</button>}<div className="onboarding-palettes">{ONBOARDING_PALETTES.map(palette=><button key={palette.name} type="button" aria-pressed={draft.mode==="custom"&&draft.colors.join()===palette.colors.join()} onClick={()=>update({colors:[...palette.colors],mode:"custom"})}><span style={{background:"linear-gradient(130deg,"+palette.colors.join(",")+")"}}/>{palette.name}</button>)}</div><details className="onboarding-custom-colors"><summary>Create your own colors</summary><div className="onboarding-color-stops">{draft.colors.map((color,index)=><button key={index} type="button" aria-label={"Edit color "+(index+1)} aria-pressed={colorIndex===index} style={{background:color}} onClick={()=>setColorIndex(index)}>{colorIndex===index&&<Check size={18}/>}</button>)}</div><ProfileColorWheel value={draft.colors[colorIndex]||"#303030"} colorNumber={colorIndex+1} disabled={busy} onChange={color=>update({mode:"custom",colors:draft.colors.map((c,i)=>i===colorIndex?color:c)})}/></details><button className="onboarding-text-button" type="button" onClick={()=>update({mode:draft.mode==="off"?"custom":"off"})}>{draft.mode==="off"?"Turn colors on":"Use a plain profile background"}</button></div>}
    {step===6&&<div className="onboarding-privacy"><ShieldCheck size={36} strokeWidth={1.3}/><div className="onboarding-privacy-card"><strong>Your profile is public</strong><p>People can see your name, photo, profile song and the playlists you mark public. Private playlists stay private.</p></div><label className="onboarding-sharing"><span><strong>Show my favorite songs</strong><small>Put your {draft.trackIds.length||"selected"} favorites in the Top 8 on your profile. You can change them anytime.</small></span><input type="checkbox" checked={draft.shareFavorites} onChange={e=>update({shareFavorites:e.target.checked,sharingChanged:true})}/></label><p className="onboarding-note">Your recent listening history isn’t published by this setup. Artist and genre picks are used privately to shape your recommendations.</p><p className="onboarding-note">No permission requests now. Notifications, city weather and offline music can wait until you use them.</p></div>}
    {loadError&&step>1&&step<5&&<div className="onboarding-load-error" role="status"><p>{loadError}</p><button type="button" disabled={loading} onClick={load}>Retry choices</button></div>}
   </main>
   <footer className="onboarding-footer">{error&&<p role="alert">{error}</p>}<div className="onboarding-progress" aria-label={"Step "+(step+1)+" of 7"}>{TITLES.map((title,index)=><span key={title} className={index<=step?"active":""}/>)}</div><div className="onboarding-buttons">{step>0&&<button type="button" disabled={busy||!!followBusy} aria-label="Previous step" onClick={()=>update({step:step-1})}><ArrowLeft size={18}/></button>}<button type="button" className="onboarding-next" disabled={busy||!!followBusy} onClick={()=>next()}>{busy?<Loader2 size={18} className="animate-spin"/>:null}{busy?"Saving…":step===0?"Get started":step===6?"Start listening":"Continue"}{!busy&&<ArrowRight size={18}/>}</button></div>{step>0&&step<6&&<button className="onboarding-text-button" type="button" disabled={busy||!!followBusy} onClick={()=>next(true)}>Skip this step</button>}</footer>
   {picker&&<TrackPickerSheet title="Your profile song" tracks={visibleCatalog} selectedIds={draft.profileTrack?[draft.profileTrack]:[]} onToggle={id=>{update({profileTrack:id});setPicker(false);}} onClose={()=>setPicker(false)}/>}
  </DialogContent>
 </Dialog>;
}
export default function NewMemberOnboarding(){
 const {user}=useAuth(),[forced,setForced]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{setForced(false);setDismissed(false);},[user?.id]);
 useEffect(()=>{const open=()=>{setDismissed(false);setForced(true);};window.addEventListener("onboarding:open",open);return()=>window.removeEventListener("onboarding:open",open);},[]);
 if(!user?.id||dismissed||(!forced&&(user.role==="admin"||user.onboarding_completed===true||savedLocally(user.id)||!(Date.parse(user.created_date)>=ENROLLMENT_START))))return null;
 return <WelcomeFlow key={user.id} user={user} onDone={()=>{setDismissed(true);setForced(false);}}/>;
}
