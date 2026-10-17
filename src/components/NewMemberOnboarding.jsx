import {useEffect,useMemo,useRef,useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowRight,ArrowLeft,Check,Headphones,Loader2,Camera,Search,Music2,ShieldCheck,Plus} from "lucide-react";
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
import {ONBOARDING_PALETTES,cleanHandle,validHandle,credits,recommendPeople,readOnboardingDraft,draftKey,onboardingComplete,normalizeOnboardingColors,mergeOnboardingTaste,withOnboardingDeadline} from "@/lib/onboardingModel";
import "./new-member-onboarding.css";
import "./profile/profile-colors.css";

const ENROLLMENT_START=Date.parse("2026-10-15T06:07:04Z");
const FEATURED_GENRES=["Hip-Hop","R&B","Pop","Afrobeats","Latin","Dance","Indie","Rock","Soul","Jazz","Electronic","Reggaeton"];
const TITLES=["Welcome to PUBLIC.","Make it yours.","What’s your sound?","Choose your favorites.","Find your people.","Set the mood.","Your music. Your choice."];
const DESCRIPTIONS=["A little about you. A better place to listen.","Choose how people see you.","Pick a few favorites. Explore everything.","Start with the artists and songs you love.","Good music is better together.","Give your profile its own feeling.","One last choice before the music."];
const rows=page=>Array.isArray(page)?page:Array.isArray(page?.items)?page.items:[];
const errorText=error=>(error?.response?.status===402||error?.status===402)?"This save is temporarily unavailable. Your choices are kept. Please retry.":error?.response?.data?.error||error?.message||"This step could not save. Your choices are kept.";
function SongCover({url}){const cover=useCoverUrl(url);return <span className="onboarding-cover">{cover?<img src={cover} alt="" loading="lazy"/>:<Music2 size={20}/>}</span>;}
function initialDraft(user){
 const previous=readOnboardingDraft(user.id);
 return {step:0,name:user.display_name||user.full_name||"",username:user.username||"",avatar:user.avatar_url||"",genres:[],trackIds:[],artists:[],profileTrack:user.featured_track_id||"",mode:user.profile_background_mode||"custom",colors:normalizeOnboardingColors(user.profile_background_colors),editedFields:[],shareFavorites:!!user.top_track_ids?.length,sharingChanged:false,...previous};
}
export function WelcomeFlow({user,onDone}){
 const nav=useNavigate(),{checkUserAuth}=useAuth(),{blocked}=useSafety();
 const [draft,setDraft]=useState(()=>initialDraft(user)),[busy,setBusy]=useState(false),[error,setError]=useState(""),[catalog,setCatalog]=useState([]),[profiles,setProfiles]=useState([]),[following,setFollowing]=useState(new Set()),[loading,setLoading]=useState(true),[musicReady,setMusicReady]=useState(false),[loadError,setLoadError]=useState(""),[followBusy,setFollowBusy]=useState(""),[query,setQuery]=useState(""),[genreQuery,setGenreQuery]=useState(""),[musicTab,setMusicTab]=useState("artists"),[limit,setLimit]=useState(8),[allGenres,setAllGenres]=useState(false),[colorIndex,setColorIndex]=useState(0),[picker,setPicker]=useState(false);
 const lock=useRef(false),alive=useRef(true),content=useRef(null),fileInput=useRef(null),heading=useRef(null),request=useRef(0),followLock=useRef(false);

 const step=Math.max(0,Math.min(6,Number(draft.step)||0));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const update=patch=>{if(lock.current||followLock.current)return;setError("");setDraft(old=>({...old,...patch,editedFields:[...new Set([...(old.editedFields||[]),...Object.keys(patch).filter(key=>["genres","trackIds","artists"].includes(key))])]}));};
 const defer=()=>{if(lock.current||followLock.current)return;try{localStorage.setItem(draftKey(user.id),JSON.stringify({...draft,uid:user.id}));}catch{}onDone();};
 useEffect(()=>{try{localStorage.setItem(draftKey(user.id),JSON.stringify({...draft,uid:user.id}));}catch{}},[draft,user.id]);
 useEffect(()=>{content.current?.scrollTo({top:0});heading.current?.focus({preventScroll:true});setQuery("");setLimit(8);},[step]);
 async function load(){
  const version=++request.current;setLoading(true);setMusicReady(false);setLoadError("");
  const result=await Promise.allSettled([
   withOnboardingDeadline(getPublishedTracks()),
   withOnboardingDeadline(getUserMusicPreferences(user.id)),
   withOnboardingDeadline(base44.entities.PublicProfile.filter({visible:true},{sort:"-updated_date",limit:100,fields:["user_id","display_name","username","avatar_url","top_track_ids","is_artist","visible"]})),
   withOnboardingDeadline(base44.entities.Follow.filter({follower_id:user.id},"-created_date",500))
  ]);
  if(!alive.current||version!==request.current)return;
  setMusicReady(result[0].status==="fulfilled"&&result[1].status==="fulfilled");
  if(result[0].status==="fulfilled")setCatalog(result[0].value);
  if(result[1].status==="fulfilled")setDraft(old=>mergeOnboardingTaste(old,result[1].value));
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
   if(!skip&&draft.sharingChanged){const current=await owner();const selected=draft.trackIds.filter(id=>byId.has(id)).slice(0,8);if(draft.shareFavorites&&(loading||!musicReady||selected.length!==draft.trackIds.length))throw Error("Some favorites aren’t available. Review your songs or turn sharing off to continue.");const next=draft.shareFavorites?selected:[];if(JSON.stringify(current.top_track_ids||[])!==JSON.stringify(next))await base44.auth.updateMe({top_track_ids:next});}
   await base44.auth.updateMe({onboarding_completed:true});
   const confirmed=await owner();if(confirmed.onboarding_completed!==true)throw Error("Completion was not confirmed. Please retry.");
   try{localStorage.setItem("public:onboarded:"+user.id,"1");localStorage.removeItem(draftKey(user.id));}catch{}
   window.dispatchEvent(new CustomEvent("onboarding:completed",{detail:{uid:user.id}}));window.dispatchEvent(new CustomEvent("preferences:changed",{detail:{uid:user.id}}));window.dispatchEvent(new Event("profiles:changed"));
   await checkUserAuth({silent:true});
   if((await base44.auth.me())?.id===user.id){onDone();nav("/");}
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
    if(Object.keys(patch).length){const saved=await base44.auth.updateMe(patch);if(saved?.id!==user.id||Object.keys(patch).some(key=>saved[key]!==patch[key]))throw Error("Profile was not confirmed. Please retry.");await checkUserAuth({silent:true});window.dispatchEvent(new Event("profiles:changed"));}
   }
   if(!skip&&step===2)await saveUserMusicPreferences({genres:draft.genres},user.id);
   if(!skip&&step===3){if(loading||!musicReady)throw Error("Retry loading your music choices, or skip this step.");await saveUserMusicPreferences({favorite_track_ids:draft.trackIds.filter(id=>byId.has(id)),favorite_artists:draft.artists.filter(name=>artistOptions.some(a=>a.name===name))},user.id);}
   if(!skip&&step===5){const patch={profile_background_mode:draft.mode,profile_background_colors:draft.colors,profile_background_motion:"flow",profile_background_speed:1,featured_track_id:draft.profileTrack};await base44.auth.updateMe(patch);const saved=await owner();if(saved.featured_track_id!==draft.profileTrack||saved.profile_background_mode!==draft.mode||JSON.stringify(saved.profile_background_colors)!==JSON.stringify(draft.colors))throw Error("Profile style was not confirmed.");await checkUserAuth({silent:true});}
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
  if(lock.current||followLock.current)return;followLock.current=true;const uid=profile.user_id;setFollowBusy(uid);setError("");
  try{await owner();const was=following.has(uid);if(was)await base44.entities.Follow.deleteMany({follower_id:user.id,following_id:uid});else{const result=await base44.entities.Follow.create({follower_id:user.id,following_id:uid});if(!result?.id)throw Error("Follow was not confirmed.");}
   await owner();
   if(alive.current){setFollowing(old=>{const value=new Set(old);if(was)value.delete(uid);else value.add(uid);return value;});window.dispatchEvent(new CustomEvent("follows:changed",{detail:{uid:user.id,followingId:uid,following:!was}}));}
  }catch(e){if(alive.current)setError(errorText(e));}finally{followLock.current=false;if(alive.current)setFollowBusy("");}
 }
 const toggle=(key,value,max)=>{const current=draft[key];if(!current.includes(value)&&current.length>=max){setError("Choose up to "+max+" "+(key==="artists"?"artists":"songs")+".");return;}update({[key]:current.includes(value)?current.filter(v=>v!==value):[...current,value]});};
 const genreOptions=genreQuery.trim()||allGenres?GENRES.filter(g=>g!=="Other"): [...new Set([...draft.genres,...FEATURED_GENRES.filter(g=>GENRES.includes(g))])];
 const colors=step===5&&draft.mode!=="off"?draft.colors:ONBOARDING_PALETTES[0].colors;
 return <Dialog open>
  <DialogContent className="new-member-onboarding onboarding-identity" data-public-dialog data-onboarding-step={step} onPointerDownOutside={e=>e.preventDefault()} onOpenAutoFocus={e=>{e.preventDefault();heading.current?.focus({preventScroll:true});}} onEscapeKeyDown={e=>{e.preventDefault();if(!picker)defer();}}>
   <MotionGradient colors={colors} speed={.85} className="onboarding-background"/>
   <header className="onboarding-header">
    <div className="onboarding-topbar">{step>0?<button type="button" className="onboarding-back" disabled={busy||!!followBusy} aria-label="Previous step" onClick={()=>update({step:step-1})}><ArrowLeft size={18}/></button>:<Logo width="92px" className="onboarding-logo"/>}<button type="button" className="onboarding-later" disabled={busy||!!followBusy} onClick={defer}>Finish later</button></div>
    <div className="onboarding-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={7} aria-valuenow={step+1}>{TITLES.map((title,index)=><span key={title} className={index<=step?"active":""}/>)}</div>
   </header>
   <main ref={content} className="onboarding-content" key={step}>
    <div className="onboarding-page-intro"><p className="onboarding-step-label">{step===0?"MADE AROUND YOU":"YOUR PUBLIC · "+step+" OF 6"}</p><DialogTitle ref={heading} tabIndex={-1}>{TITLES[step]}</DialogTitle><DialogDescription>{DESCRIPTIONS[step]}</DialogDescription></div>
    {step===0&&<div className="onboarding-welcome"><div className="onboarding-welcome-symbol"><Headphones size={76} strokeWidth={1}/></div><p className="onboarding-welcome-line">Your taste.<br/>Your people.<br/><span>Your PUBLIC.</span></p><p className="onboarding-note">Make it yours in a few simple steps.</p></div>}
    {step===1&&<div className="onboarding-form">
     <div className="onboarding-photo-area"><button className="onboarding-photo" type="button" disabled={busy} onClick={()=>fileInput.current?.click()} aria-label="Choose your profile photo"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={80}/><span><Camera size={15}/></span></button><span className="onboarding-note">Add a photo · optional</span></div>
     <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value="";}}/>
     <label>Display name<input value={draft.name} maxLength={60} autoComplete="nickname" disabled={busy} placeholder="What should we call you?" onChange={e=>update({name:e.target.value})}/></label>
     <label>Username <small>Optional</small><div className="onboarding-handle"><span>@</span><input value={draft.username} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" disabled={busy} placeholder="your_sound" onChange={e=>update({username:cleanHandle(e.target.value)})}/></div></label>
     <p className="onboarding-note">Shown on your public profile. You can edit this later.</p>
    </div>}
    {step===2&&<>
     <div className="onboarding-search"><Search size={18}/><input aria-label="Find genres" placeholder="Search genres" value={genreQuery} onChange={e=>setGenreQuery(e.target.value)}/></div>
     <div className="onboarding-genres" role="group" aria-label="Favorite genres">{genreOptions.filter(g=>g.toLowerCase().includes(genreQuery.toLowerCase())).map(genre=><button type="button" key={genre} aria-pressed={draft.genres.includes(genre)} disabled={busy} onClick={()=>update({genres:draft.genres.includes(genre)?draft.genres.filter(g=>g!==genre):[...draft.genres,genre]})}>{genre}{draft.genres.includes(genre)&&<Check size={15}/>}</button>)}</div>
     {!genreQuery&&<button className="onboarding-text-button" type="button" onClick={()=>setAllGenres(v=>!v)}>{allGenres?"Show fewer genres":"More genres"}</button>}
     {genreQuery&&!genreOptions.some(g=>g.toLowerCase().includes(genreQuery.toLowerCase()))&&<p className="onboarding-note">No matching genres. Try another search.</p>}
     <p className="onboarding-note">{draft.genres.length?draft.genres.length+" selected · You can always explore more.":"Not sure? Skip this step and explore everything."}</p>
    </>}
    {step===3&&<>
     <div className="onboarding-tabs" role="group" aria-label="Choose favorites"><button type="button" aria-pressed={musicTab==="artists"} onClick={()=>{setMusicTab("artists");setLimit(8);}}>Artists <small>{draft.artists.length}/5</small></button><button type="button" aria-pressed={musicTab==="songs"} onClick={()=>{setMusicTab("songs");setLimit(8);}}>Songs <small>{draft.trackIds.length}/8</small></button></div>
     <div className="onboarding-search"><Search size={18}/><input aria-label="Search favorite music" placeholder={musicTab==="artists"?"Find an artist":"Find a song"} value={query} onChange={e=>{setQuery(e.target.value);setLimit(8);}}/></div>
     {(draft.artists.length>0||draft.trackIds.length>0)&&<details className="onboarding-selected-review"><summary>Your picks · {draft.artists.length} artists, {draft.trackIds.length} songs</summary><div className="onboarding-picked-chips">{draft.artists.map(name=><button key={name} type="button" disabled={busy} aria-label={"Remove artist "+name} onClick={()=>toggle("artists",name,5)}>{name}<span aria-hidden="true">×</span></button>)}{draft.trackIds.map(id=><button key={id} type="button" disabled={busy} aria-label={"Remove song "+(byId.get(id)?.title||"unavailable song")} onClick={()=>toggle("trackIds",id,8)}>{byId.get(id)?.title||"Unavailable song"}<span aria-hidden="true">×</span></button>)}</div></details>}
     {musicTab==="artists"?<div className="onboarding-artist-grid">{artists.slice(0,limit).map(a=><button type="button" key={a.name} aria-pressed={draft.artists.includes(a.name)} onClick={()=>toggle("artists",a.name,5)}><span className="onboarding-artist-art"><SongCover url={a.cover}/><span className="onboarding-pick-check">{draft.artists.includes(a.name)?<Check size={15}/>:<Plus size={15}/>}</span></span><strong>{a.name}</strong></button>)}</div>:<div className="onboarding-music-list">{songs.slice(0,limit).map(t=><button type="button" className="onboarding-music-row" key={t.id} aria-pressed={draft.trackIds.includes(t.id)} onClick={()=>toggle("trackIds",t.id,8)}><SongCover url={t.cover_art_url}/><span><strong>{t.title}</strong><small>{t.artist||t.uploader_name}</small></span><span className="onboarding-row-check">{draft.trackIds.includes(t.id)?<Check size={17}/>:<Plus size={17}/>}</span></button>)}</div>}
     {loading?<p className="onboarding-note">Loading music…</p>:!(musicTab==="artists"?artists:songs).length&&<p className="onboarding-note">No matches. Try another search or skip for now.</p>}
     {(musicTab==="artists"?artists:songs).length>limit&&<button type="button" className="onboarding-text-button" onClick={()=>setLimit(n=>n+8)}>Show more</button>}
     <p className="onboarding-note">A few picks help shape your first mixes.</p>
    </>}
    {step===4&&<div className="onboarding-people">
     {suggestions.slice(0,limit).map(profile=><div className="onboarding-person" key={profile.user_id}><Avatar user={profile} size={48}/><span><strong>{profile.display_name||profile.username||"PUBLIC listener"}</strong><small>{profile.reason}</small></span><button type="button" disabled={busy||!!followBusy} aria-pressed={following.has(profile.user_id)} onClick={()=>follow(profile)}>{followBusy===profile.user_id?<Loader2 size={16} className="animate-spin"/>:following.has(profile.user_id)?<><Check size={14}/>Following</>:"Follow"}</button></div>)}
     {!suggestions.length&&<p className="onboarding-note">{loading?"Finding your people…":"Find friends in Search whenever you’re ready."}</p>}
     {suggestions.length>limit&&<button type="button" className="onboarding-text-button" onClick={()=>setLimit(n=>n+8)}>More people</button>}
     <p className="onboarding-note">Follow anyone you like, or keep exploring solo.</p>
    </div>}
    {step===5&&<div className="onboarding-mood">
     <div className="onboarding-profile-preview mood-preview"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={64}/><strong>{draft.name||"Your PUBLIC"}</strong><button type="button" className="onboarding-profile-song" onClick={()=>setPicker(true)}><Music2 size={15}/><span>{byId.get(draft.profileTrack)?.title||"Add a profile song"}</span><Plus size={15}/></button></div>
     <div className="onboarding-palettes" role="group" aria-label="Profile color palettes">{ONBOARDING_PALETTES.map(palette=><button key={palette.name} type="button" aria-pressed={draft.mode==="custom"&&draft.colors.join()===palette.colors.join()} onClick={()=>update({colors:[...palette.colors],mode:"custom"})}><span style={{background:"linear-gradient(130deg,"+palette.colors.join(",")+")"}}/>{palette.name}</button>)}</div>
     <details className="onboarding-custom-colors"><summary>Customize colors</summary><div className="onboarding-color-stops">{draft.colors.map((color,index)=><button key={index} type="button" aria-label={"Edit color "+(index+1)} aria-pressed={colorIndex===index} style={{background:color}} onClick={()=>setColorIndex(index)}>{colorIndex===index&&<Check size={18}/>}</button>)}</div><ProfileColorWheel value={draft.colors[colorIndex]||"#303030"} colorNumber={colorIndex+1} disabled={busy} onChange={color=>update({mode:"custom",colors:draft.colors.map((c,i)=>i===colorIndex?color:c)})}/><button className="onboarding-text-button" type="button" onClick={()=>update({mode:draft.mode==="off"?"custom":"off"})}>{draft.mode==="off"?"Turn colors on":"Use a plain background"}</button></details>
     {draft.profileTrack&&<button type="button" className="onboarding-text-button" onClick={()=>update({profileTrack:""})}>Remove profile song</button>}
    </div>}
    {step===6&&<div className="onboarding-privacy">
     <div className="onboarding-privacy-heading"><ShieldCheck size={24} strokeWidth={1.5}/><span>Your listening stays yours.</span></div>
     <label className="onboarding-sharing"><span><strong>Share my favorite songs</strong><small>Show your picks in your profile’s Top 8.</small></span><input type="checkbox" checked={draft.shareFavorites} onChange={e=>update({shareFavorites:e.target.checked,sharingChanged:true})}/></label>
     <p className="onboarding-note">Your profile is public. Private playlists and your recent listening history stay private.</p>
     <details className="onboarding-custom-colors"><summary>What people can see</summary><p className="onboarding-note">Your name, photo, profile song and public playlists. Your artist and genre picks help personalize recommendations privately.</p></details>
    </div>}
    {loadError&&step>1&&step<5&&<div className="onboarding-load-error" role="status"><p>{loadError}</p><button type="button" disabled={loading} onClick={load}>Retry</button></div>}
   </main>
   <footer className="onboarding-footer">{error&&<p role="alert">{error}</p>}<div className="onboarding-buttons">{step>0&&step<6&&<button className="onboarding-skip" type="button" disabled={busy||!!followBusy} onClick={()=>next(true)}>Skip</button>}<button type="button" className="onboarding-next" disabled={busy||!!followBusy} onClick={()=>next()}>{busy?<Loader2 size={18} className="animate-spin"/>:null}{busy?"Saving…":step===0?"Let’s go":step===6?"Start listening":"Continue"}{!busy&&<ArrowRight size={18}/>}</button></div></footer>
   {picker&&<TrackPickerSheet title="Your profile song" tracks={visibleCatalog.filter(t=>t.uploader_id===user.id)} selectedIds={draft.profileTrack?[draft.profileTrack]:[]} onToggle={id=>{update({profileTrack:id});setPicker(false);}} onClose={()=>setPicker(false)}/>}
  </DialogContent>
 </Dialog>;
}

export default function NewMemberOnboarding(){
 const {user}=useAuth(),[forced,setForced]=useState(false),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{setForced(false);setDismissed(false);},[user?.id]);
 useEffect(()=>{const open=()=>{if(onboardingComplete(user))return;setDismissed(false);setForced(true);};window.addEventListener("onboarding:open",open);return()=>window.removeEventListener("onboarding:open",open);},[user?.onboarding_completed]);
 if(!user?.id||dismissed||(!forced&&(user.role==="admin"||onboardingComplete(user)||!(Date.parse(user.created_date)>=ENROLLMENT_START))))return null;
 return <WelcomeFlow key={user.id} user={user} onDone={()=>{setDismissed(true);setForced(false);}}/>;
}
