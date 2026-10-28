const useAvatarGallery=()=>({avatars:AVATAR_PRESETS,error:""});
import {setFollowState,followError} from "@/lib/followActions";
import {useEffect,useMemo,useRef,useState} from "react";
const useNavigate=()=>()=>{};
import {ArrowRight,ArrowLeft,Check,Loader2,Camera,Search,Music2,ShieldCheck,Plus,Play,Pause} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import MotionGradient from "@/components/MotionGradient";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import {AVATAR_PRESETS} from "@/lib/avatarPresets";
const usePlayer=()=>null;
import ProfileColorPicker from "@/components/profile/ProfileColorPicker";
import TrackPickerSheet from "@/components/profile/TrackPickerSheet";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import {useCoverPalette} from "@/hooks/useCoverPalette";
const useAuth=()=>({user:fixtureUser,checkUserAuth:async()=>{}});
const useSafety=()=>({blocked:new Set()});
const fixtureUser={id:"onboarding-visual-fixture",display_name:"Music listener",created_date:"2026-10-28",onboarding_completed:false};
const base44={auth:{me:async()=>fixtureUser,updateMe:async patch=>Object.assign(fixtureUser,patch)},entities:{PublicProfile:{filter:async()=>[{user_id:"fixture-friend",display_name:"Music friend",avatar_url:AVATAR_PRESETS.at(-1).url,visible:true},{user_id:"fixture-default",display_name:"New listener",visible:true}]},Follow:{filter:async()=>[]}}};
import {GENRES} from "@/lib/audio-utils";
const getPublishedTracks=async()=>[{id:"fixture-song",title:"First listen",artist:"PUBLIC Artist",is_published:true,approval_status:"approved",cover_art_url:AVATAR_PRESETS[0].url,uploader_id:"fixture-creator",genre:"Pop"}];
const getUserMusicPreferences=async()=>({}),saveUserMusicPreferences=async()=>{};
import {ONBOARDING_PALETTES,cleanHandle,validHandle,credits,recommendPeople,readOnboardingDraft,draftKey,onboardingComplete,normalizeOnboardingColors,mergeOnboardingTaste,withOnboardingDeadline,onboardingSearchMatch} from "@/lib/onboardingModel";
import "@/components/new-member-onboarding.css";
import "@/components/profile/profile-colors.css";

const ENROLLMENT_START=Date.parse("2026-10-15T06:07:04Z");
const FEATURED_GENRES=["Hip-Hop","R&B","Pop","Afrobeats","Latin","Dance","Indie","Rock","Soul","Jazz","Electronic","Reggaeton"];
const TITLES=["Welcome to PUBLIC.","Make it yours.","What’s your sound?","Choose your favorites.","Find your people.","Set the mood.","Ready when you are."];
const DESCRIPTIONS=["Your music. Your people. Make yourself at home.","Choose how people see you.","Pick a few favorites. Explore everything.","Start with the artists and songs you love.","Good music is better together.","Give your profile its own feeling.","One last choice before the music."];
const rows=page=>Array.isArray(page)?page:Array.isArray(page?.items)?page.items:[];
const errorText=error=>(error?.response?.status===402||error?.status===402)?"This save is temporarily unavailable. Your choices are kept. Please retry.":error?.response?.data?.error||error?.message||"This step could not save. Your choices are kept.";
// Keep one complete accessible phrase; only its decorative copy is split into letters.
function OnboardingLetters({text,delay=0,className=""}){
 let index=0;
 return <span className={"onboarding-letter-text "+className}><span className="sr-only">{text}</span><span aria-hidden="true">{text.split(/(\s+)/).map((word,wordIndex)=>/\s/.test(word)?word:<span className="onboarding-word" key={wordIndex}>{Array.from(word).map((letter,letterIndex)=><span key={letterIndex} className="onboarding-letter" style={{"--letter-delay":(delay+Math.min(index++*11,220))+"ms"}}>{letter}</span>)}</span>)}</span></span>;
}
function SongCover({url}){const cover=useCoverUrl(url);return <span className="onboarding-cover">{cover?<img src={cover} alt="" loading="lazy"/>:<Music2 size={20}/>}</span>;}
export function OnboardingProfileSong({track,onChange,onError,disabled=false}){
 const player=usePlayer();
 const playing=player?.currentTrack?.id===track?.id&&player?.isPlaying;
 async function play(){
  if(!track||disabled||!player)return;
  try{if(player.currentTrack?.id===track.id)await player.togglePlay();else await player.playTrackAt([track]);}
  catch(error){onError?.(errorText(error));}
 }
 if(!track)return <button type="button" className="onboarding-profile-song" disabled={disabled} onClick={onChange}><Music2 size={16}/><span>Add a profile song</span><Plus size={16}/></button>;
 return <div className="onboarding-song-preview"><SongCover url={track.cover_art_url}/><button type="button" className="onboarding-song-details" disabled={disabled} onClick={onChange} aria-label={"Change profile song: "+track.title}><strong>{track.title}</strong><span>{track.artist||track.uploader_name||"PUBLIC"}</span><small>Change song</small></button><button type="button" className="onboarding-song-play" disabled={disabled||!player} onClick={play} aria-label={(playing?"Pause ":"Play ")+track.title}>{playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</button></div>;
}
function initialDraft(user){
 const previous={step:Number(new URLSearchParams(location.search).get("step"))||0};
 return {step:0,name:user.display_name||user.full_name||"",username:user.username||"",avatar:user.avatar_url||"",genres:[],trackIds:[],artists:[],profileTrack:user.featured_track_id||"",motion:user.profile_background_motion||"flow",speed:user.profile_background_speed||1,mode:user.profile_background_mode||"custom",colors:normalizeOnboardingColors(user.profile_background_colors),editedFields:[],shareFavorites:!!user.top_track_ids?.length,sharingChanged:false,...previous};
}
export function WelcomeFlow({user,onDone}){
 const {avatars:galleryAvatars,error:galleryError}=useAvatarGallery();
 const nav=useNavigate(),{checkUserAuth}=useAuth(),{blocked}=useSafety();
 const [draft,setDraft]=useState(()=>initialDraft(user)),[busy,setBusy]=useState(false),[error,setError]=useState(""),[catalog,setCatalog]=useState([]),[profiles,setProfiles]=useState([]),[following,setFollowing]=useState(new Set()),[loading,setLoading]=useState(true),[musicReady,setMusicReady]=useState(false),[loadError,setLoadError]=useState(""),[followBusy,setFollowBusy]=useState(""),[query,setQuery]=useState(""),[genreQuery,setGenreQuery]=useState(""),[musicTab,setMusicTab]=useState("artists"),[limit,setLimit]=useState(8),[allGenres,setAllGenres]=useState(false),[colorEditor,setColorEditor]=useState(false),[colorPreview,setColorPreview]=useState(null),[galleryOpen,setGalleryOpen]=useState(false),[picker,setPicker]=useState(false),[pickedTrack,setPickedTrack]=useState(null);
 const lock=useRef(false),alive=useRef(true),content=useRef(null),fileInput=useRef(null),heading=useRef(null),request=useRef(0),followLock=useRef(false);

 const step=Math.max(0,Math.min(6,Number(draft.step)||0));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const update=patch=>{if(lock.current||followLock.current)return;setError("");setDraft(old=>({...old,...patch,editedFields:[...new Set([...(old.editedFields||[]),...Object.keys(patch).filter(key=>["genres","trackIds","artists"].includes(key))])]}));};
 const defer=()=>{if(lock.current||followLock.current)return;try{localStorage.setItem(draftKey(user.id),JSON.stringify({...draft,uid:user.id}));}catch{}onDone();};
 useEffect(()=>{try{localStorage.setItem(draftKey(user.id),JSON.stringify({...draft,uid:user.id}));}catch{}},[draft,user.id]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});if(content.current){content.current.scrollTop=0;const dialog=content.current.closest("[role=dialog]");if(dialog)dialog.scrollTop=0;}setQuery("");setLimit(8);},[step]);
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
 const previewTrack=byId.get(draft.profileTrack)||(pickedTrack?.id===draft.profileTrack&&!blocked.has(pickedTrack.uploader_id)?pickedTrack:null);
 const artworkUrl=useCoverUrl(step===5?previewTrack?.cover_art_url:"");
 const {colors:artworkColors,loading:artworkLoading}=useCoverPalette(artworkUrl);
 const artistOptions=useMemo(()=>{
  const map=new Map();for(const track of visibleCatalog)for(const name of credits(track)){const key=name.toLowerCase();if(!map.has(key))map.set(key,{name,cover:track.cover_art_url,genre:track.genre});}
  return [...map.values()].sort((a,b)=>Number(draft.genres.includes(b.genre))-Number(draft.genres.includes(a.genre))||a.name.localeCompare(b.name));
 },[visibleCatalog,draft.genres]);
 const songs=useMemo(()=>visibleCatalog.filter(t=>!query.trim()||onboardingSearchMatch([t.title,t.artist].join(" "),query)).sort((a,b)=>Number(draft.genres.includes(b.genre))-Number(draft.genres.includes(a.genre))),[visibleCatalog,query,draft.genres]);
 const artists=artistOptions.filter(a=>onboardingSearchMatch(a.name,query));
 const suggestions=useMemo(()=>recommendPeople(profiles,visibleCatalog,{uid:user.id,blocked,genres:draft.genres,artists:draft.artists,trackIds:draft.trackIds}),[profiles,visibleCatalog,user.id,blocked,draft.genres,draft.artists,draft.trackIds]);
 async function owner(){const current=await base44.auth.me();if(current?.id!==user.id)throw Error("Your account changed. Reopen setup for the current account.");return current;}
 async function complete(skip=false){
  if(lock.current||followLock.current)return;lock.current=true;setBusy(true);setError("");
  try{
   await owner();
   if(!skip&&draft.sharingChanged){const current=await owner();const selected=draft.trackIds.filter(id=>byId.has(id)).slice(0,8);if(draft.shareFavorites&&(loading||!musicReady||!selected.length||selected.length!==draft.trackIds.length))throw Error("Some favorites aren’t available. Review your songs or turn sharing off to continue.");const next=draft.shareFavorites?selected:[];if(JSON.stringify(current.top_track_ids||[])!==JSON.stringify(next))await base44.auth.updateMe({top_track_ids:next});}
   await base44.auth.updateMe({onboarding_completed:true});
   const confirmed=await owner();if(confirmed.onboarding_completed!==true)throw Error("Completion was not confirmed. Please retry.");
   try{localStorage.setItem("public:onboarded:"+user.id,"1");localStorage.removeItem(draftKey(user.id));}catch{}
   window.dispatchEvent(new CustomEvent("onboarding:completed",{detail:{uid:user.id}}));window.dispatchEvent(new CustomEvent("preferences:changed",{detail:{uid:user.id}}));window.dispatchEvent(new Event("profiles:changed"));
   if(alive.current){onDone();nav("/");}
   await checkUserAuth({silent:true});
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
    const current=await owner(),patch={};if(name!==(current.display_name||current.full_name||""))patch.display_name=name;if(username!==(current.username||""))patch.username=username;
    let changed=false;
    if(Object.keys(patch).length){const saved=await base44.auth.updateMe(patch);if(saved?.id!==user.id||Object.keys(patch).some(key=>saved[key]!==patch[key]))throw Error("Profile was not confirmed. Please retry.");changed=true;}
    if(draft.avatar!==(current.avatar_url||"")){await owner();const saved=await base44.auth.updateMe({avatar_url:draft.avatar});if(saved?.id!==user.id||saved.avatar_url!==draft.avatar)throw Error("Avatar was not confirmed. Please retry.");changed=true;}
    if(changed){await checkUserAuth({silent:true});window.dispatchEvent(new Event("profiles:changed"));}
   }
   if(!skip&&step===2)await saveUserMusicPreferences({genres:draft.genres},user.id);
   if(!skip&&step===3){if(loading||!musicReady)throw Error("Retry loading your music choices, or skip this step.");await saveUserMusicPreferences({favorite_track_ids:draft.trackIds.filter(id=>byId.has(id)),favorite_artists:draft.artists.filter(name=>artistOptions.some(a=>a.name===name))},user.id);}
   if(!skip&&step===5){const patch={profile_background_mode:draft.mode,profile_background_colors:draft.colors,profile_background_motion:draft.motion,profile_background_speed:draft.speed,featured_track_id:draft.profileTrack};await base44.auth.updateMe(patch);const saved=await owner();if(saved.featured_track_id!==draft.profileTrack||saved.profile_background_mode!==draft.mode||JSON.stringify(saved.profile_background_colors)!==JSON.stringify(draft.colors))throw Error("Profile style was not confirmed.");await checkUserAuth({silent:true});}
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
  try{await owner();const was=following.has(uid);await setFollowState(base44,user.id,uid,!was);
   await owner();
   if(alive.current){setFollowing(old=>{const value=new Set(old);if(was)value.delete(uid);else value.add(uid);return value;});window.dispatchEvent(new CustomEvent("follows:changed",{detail:{uid:user.id,followingId:uid,following:!was}}));}
  }catch(e){if(alive.current)setError(followError(e));}finally{followLock.current=false;if(alive.current)setFollowBusy("");}
 }
 const toggle=(key,value,max)=>{const current=draft[key];if(!current.includes(value)&&current.length>=max){setError("Choose up to "+max+" "+(key==="artists"?"artists":"songs")+".");return;}update({[key]:current.includes(value)?current.filter(v=>v!==value):[...current,value]});};
 const genreOptions=genreQuery.trim()||allGenres?GENRES.filter(g=>g!=="Other"): [...new Set([...draft.genres,...FEATURED_GENRES.filter(g=>GENRES.includes(g))])];
 const automaticColors=artworkColors.length?artworkColors.slice(0,3):ONBOARDING_PALETTES[0].colors;
 const styleDraft=colorPreview||draft;
 const colors=step===5?(styleDraft.mode==="off"?[]:styleDraft.mode==="auto"?automaticColors:styleDraft.colors):["#090909","#45454b","#202025"];
 return <Dialog open>
  <DialogContent className="new-member-onboarding onboarding-identity" data-public-dialog data-onboarding-step={step} onPointerDownOutside={e=>e.preventDefault()} onOpenAutoFocus={e=>{e.preventDefault();heading.current?.focus({preventScroll:true});}} onEscapeKeyDown={e=>{e.preventDefault();if(!picker&&!colorEditor)defer();}}>
   <MotionGradient colors={colors} motion={step===5?styleDraft.motion:"flow"} speed={step===5?styleDraft.speed:.65} className="onboarding-background"/><div className="onboarding-contrast" aria-hidden="true"/>
   <header className="onboarding-header">
    <div className="onboarding-topbar"><div className="onboarding-nav-start">{step>0&&<button type="button" className="onboarding-back" disabled={busy||!!followBusy} aria-label="Previous step" onClick={()=>update({step:step-1})}><ArrowLeft size={18}/></button>}</div><Logo width="82px" className="onboarding-logo"/><button type="button" className="onboarding-later" disabled={busy||!!followBusy} onClick={defer}>Finish later</button></div>
    <div className="onboarding-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={7} aria-valuenow={step+1}>{TITLES.map((title,index)=><span key={title} className={index<=step?"active":""}/>)}</div>
   </header>
   <main ref={content} className="onboarding-content" key={step}>
    <div className="onboarding-page-intro">{step>0&&<p className="onboarding-step-label">{"YOUR PUBLIC · "+step+" OF 6"}</p>}<DialogTitle ref={heading} tabIndex={-1}><OnboardingLetters text={TITLES[step]}/></DialogTitle><DialogDescription>{DESCRIPTIONS[step]}</DialogDescription></div>
    {step===0&&<div className="onboarding-welcome"><div className="onboarding-record-stage" aria-hidden="true"><div className="onboarding-record"><span className="onboarding-record-grooves"/><span className="onboarding-record-light"/><div className="onboarding-record-label"><Logo width="65px" className="onboarding-logo"/></div></div></div></div>}
    {step===1&&<form className="onboarding-form" onSubmit={e=>{e.preventDefault();next();}}>
     <div className="onboarding-photo-area"><button className="onboarding-photo" type="button" disabled={busy} onClick={()=>fileInput.current?.click()} aria-label="Choose your profile photo"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={80}/><span><Camera size={15}/></span></button><span className="onboarding-note">Choose an avatar or add a photo · optional</span>{draft.avatar&&<button type="button" className="onboarding-remove-photo" disabled={busy} onClick={()=>update({avatar:""})}>Remove photo</button>}</div>
     <details className="onboarding-avatar-gallery" onToggle={event=>setGalleryOpen(event.currentTarget.open)}><summary>Choose an avatar</summary>{galleryError&&<p role="alert">{galleryError}</p>}<div className="onboarding-avatar-grid" role="group" aria-label="Profile avatar gallery">{galleryAvatars.map(item=><button type="button" key={item.id} disabled={busy} aria-label={"Choose "+item.name+" avatar"} aria-pressed={draft.avatar===item.url} onClick={()=>update({avatar:item.url})}><span><Avatar user={{avatar_url:item.url}} size="100%" motion active={galleryOpen}/>{draft.avatar===item.url&&<i aria-hidden="true"><Check size={14}/></i>}</span><strong>{item.name}</strong></button>)}</div><p className="onboarding-note">{AVATAR_PRESETS.find(item=>item.url===draft.avatar)?.credit||"Artwork by mu.staffa · supplied by PUBLIC."}</p></details>
     <button type="button" className="onboarding-upload-photo" disabled={busy} onClick={()=>fileInput.current?.click()}><Camera size={16}/>Upload a photo</button>
     <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value="";}}/>
     <label>Display name<input value={draft.name} maxLength={60} autoComplete="nickname" disabled={busy} placeholder="What should we call you?" onChange={e=>update({name:e.target.value})}/></label>
     <label>Username <small>Optional</small><div className="onboarding-handle"><span>@</span><input value={draft.username} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" disabled={busy} placeholder="your_sound" onChange={e=>update({username:cleanHandle(e.target.value)})}/></div></label>
     <p className="onboarding-note">Shown on your public profile. You can edit this later.</p><button type="submit" hidden disabled={busy}>Continue</button>
    </form>}
    {step===2&&<>
     <div className="onboarding-search"><Search size={18}/><input aria-label="Find genres" placeholder="Search genres" value={genreQuery} onChange={e=>setGenreQuery(e.target.value)}/>{genreQuery&&<button type="button" aria-label="Clear genre search" onClick={e=>{setGenreQuery("");e.currentTarget.parentElement.querySelector("input")?.focus();}}>×</button>}</div>
     <div className="onboarding-genres" role="group" aria-label="Favorite genres">{genreOptions.filter(g=>onboardingSearchMatch(g,genreQuery)).map(genre=><button type="button" key={genre} aria-pressed={draft.genres.includes(genre)} disabled={busy} onClick={()=>update({genres:draft.genres.includes(genre)?draft.genres.filter(g=>g!==genre):[...draft.genres,genre]})}>{genre}{draft.genres.includes(genre)&&<Check size={15}/>}</button>)}</div>
     {!genreQuery&&<button className="onboarding-text-button" type="button" onClick={()=>setAllGenres(v=>!v)}>{allGenres?"Show fewer genres":"More genres"}</button>}
     {genreQuery&&!genreOptions.some(g=>onboardingSearchMatch(g,genreQuery))&&<p className="onboarding-note">No matching genres. Try another search.</p>}
     <p className="onboarding-note">{draft.genres.length?draft.genres.length+" selected · You can always explore more.":"Not sure? Skip this step and explore everything."}</p>
    </>}
    {step===3&&<>
     <div className="onboarding-tabs" role="group" aria-label="Choose favorites"><button type="button" aria-pressed={musicTab==="artists"} onClick={()=>{setMusicTab("artists");setLimit(8);}}>Artists</button><button type="button" aria-pressed={musicTab==="songs"} onClick={()=>{setMusicTab("songs");setLimit(8);}}>Songs</button></div>
     <div className="onboarding-search"><Search size={18}/><input aria-label="Search favorite music" placeholder={musicTab==="artists"?"Find an artist":"Find a song"} value={query} onChange={e=>{setQuery(e.target.value);setLimit(8);}}/>{query&&<button type="button" aria-label="Clear music search" onClick={e=>{setQuery("");e.currentTarget.parentElement.querySelector("input")?.focus();}}>×</button>}</div>
     <p className="onboarding-selection-status" role="status" aria-live="polite">{musicTab==="artists"?(draft.artists.length===5?"5 artists selected. Deselect one to choose another.":draft.artists.length+" of 5 artists selected"):(draft.trackIds.length===8?"8 songs selected. Deselect one to choose another.":draft.trackIds.length+" of 8 songs selected")}</p>
     {(draft.artists.length>0||draft.trackIds.length>0)&&<details className="onboarding-selected-review"><summary>Your picks · {draft.artists.length} artists, {draft.trackIds.length} songs</summary><div className="onboarding-picked-chips">{draft.artists.map(name=><button key={name} type="button" disabled={busy} aria-label={"Remove artist "+name} onClick={()=>toggle("artists",name,5)}>{name}<span aria-hidden="true">×</span></button>)}{draft.trackIds.map(id=><button key={id} type="button" disabled={busy} aria-label={"Remove song "+(byId.get(id)?.title||"unavailable song")} onClick={()=>toggle("trackIds",id,8)}>{byId.get(id)?.title||"Unavailable song"}<span aria-hidden="true">×</span></button>)}</div></details>}
     {musicTab==="artists"?<div className="onboarding-artist-grid">{artists.slice(0,limit).map(a=><button type="button" key={a.name} disabled={busy||(!draft.artists.includes(a.name)&&draft.artists.length>=5)} aria-pressed={draft.artists.includes(a.name)} onClick={()=>toggle("artists",a.name,5)}><span className="onboarding-artist-art"><SongCover url={a.cover}/><span className="onboarding-pick-check">{draft.artists.includes(a.name)?<Check size={15}/>:<Plus size={15}/>}</span></span><strong>{a.name}</strong></button>)}</div>:<div className="onboarding-music-list">{songs.slice(0,limit).map(t=><button type="button" className="onboarding-music-row" key={t.id} disabled={busy||(!draft.trackIds.includes(t.id)&&draft.trackIds.length>=8)} aria-pressed={draft.trackIds.includes(t.id)} onClick={()=>toggle("trackIds",t.id,8)}><SongCover url={t.cover_art_url}/><span><strong>{t.title}</strong><small>{t.artist||t.uploader_name}</small></span><span className="onboarding-row-check">{draft.trackIds.includes(t.id)?<Check size={17}/>:<Plus size={17}/>}</span></button>)}</div>}
     {loading?<p className="onboarding-note">Loading music…</p>:!(musicTab==="artists"?artists:songs).length&&<p className="onboarding-note">No matches. Try another search or skip for now.</p>}
     {(musicTab==="artists"?artists:songs).length>limit&&<button type="button" className="onboarding-text-button" onClick={()=>setLimit(n=>n+8)}>Show more</button>}
     <p className="onboarding-note">A few picks help shape your first mixes.</p>
    </>}
    {step===4&&<div className="onboarding-people">
     {suggestions.slice(0,limit).map(profile=><div className="onboarding-person" key={profile.user_id}><div className="onboarding-person-avatar"><Avatar user={profile} size={48} motion/></div><span className="onboarding-person-copy"><strong>{profile.display_name||profile.username||"PUBLIC listener"}</strong><small>{profile.reason}</small></span><button type="button" disabled={busy||!!followBusy} aria-pressed={following.has(profile.user_id)} onClick={()=>follow(profile)}>{followBusy===profile.user_id?<Loader2 size={16} className="animate-spin"/>:following.has(profile.user_id)?<><Check size={14}/>Following</>:"Follow"}</button></div>)}
     {!suggestions.length&&<p className="onboarding-note">{loading?"Finding your people…":"Find friends in Search whenever you’re ready."}</p>}
     {suggestions.length>limit&&<button type="button" className="onboarding-text-button" onClick={()=>setLimit(n=>n+8)}>More people</button>}
     <p className="onboarding-note">Follow anyone you like, or keep exploring solo.</p>
    </div>}
    {step===5&&<div className="onboarding-mood">
     <div className="onboarding-profile-preview mood-preview"><Avatar user={{display_name:draft.name,avatar_url:draft.avatar}} size={64}/><strong>{draft.name||"Your PUBLIC"}</strong><OnboardingProfileSong track={previewTrack} disabled={busy} onChange={()=>setPicker(true)} onError={setError}/></div>
     <button type="button" className="onboarding-auto-color" disabled={busy} aria-pressed={draft.mode==="auto"} onClick={()=>update({mode:"auto"})}><span className="onboarding-auto-swatch" aria-hidden="true" style={{background:"linear-gradient(135deg,"+automaticColors.join(",")+")"}}><Music2 size={19}/></span><span className="onboarding-auto-copy"><strong>Automatic · From your song</strong><small>{!draft.profileTrack?"Choose a profile song to match its artwork.":artworkLoading?"Finding your artwork colors…":artworkColors.length?"Changes with your profile song.":"Choose a palette if artwork colors aren’t available."}</small></span><span className="onboarding-auto-check">{draft.mode==="auto"&&<Check size={18}/>}</span></button>
     <button type="button" className="onboarding-color-launch" disabled={busy} onClick={()=>setColorEditor(true)}><span className="onboarding-color-mini" aria-hidden="true">{draft.colors.map((color,index)=><i key={index} style={{background:color}}/>)}</span><span><strong>Choose profile colors</strong><small>Palettes, color wheel &amp; movement</small></span><ArrowRight size={18}/></button>
     {draft.profileTrack&&<button type="button" className="onboarding-text-button" onClick={()=>update({profileTrack:""})}>Remove profile song</button>}
    </div>}
    {step===6&&<div className="onboarding-privacy">
     <div className="onboarding-ready-card"><Avatar user={user} size={52}/><div><small>YOUR PLACE ON PUBLIC</small><strong>{user.display_name||user.full_name||"Your PUBLIC"}</strong><span>Music. People. Possibilities.</span></div><Check size={20}/></div>
     <div className="onboarding-privacy-heading"><ShieldCheck size={24} strokeWidth={1.5}/><span>Your listening stays yours.</span></div>
     <label className="onboarding-sharing"><span><strong>Share my favorite songs</strong><small>Show your picks in your profile’s Top 8.</small></span><input type="checkbox" checked={draft.shareFavorites} onChange={e=>update({shareFavorites:e.target.checked,sharingChanged:true})}/></label>
     {!draft.trackIds.length&&<button type="button" className="onboarding-text-button" disabled={busy} onClick={()=>{update({step:3});setMusicTab("songs");}}>Choose favorite songs</button>}
     <p className="onboarding-note">Your profile is public. Private playlists and your recent listening history stay private.</p>
     <details className="onboarding-custom-colors"><summary>What people can see</summary><p className="onboarding-note">Your name, photo, profile song and public playlists. Your artist and genre picks help personalize recommendations privately.</p></details>
    </div>}
    {loadError&&step>1&&step<5&&<div className="onboarding-load-error" role="status"><p>{loadError}</p><button type="button" disabled={loading} onClick={load}>Retry</button></div>}
   </main>
   <footer className="onboarding-footer">{error&&<p role="alert">{error}</p>}<div className="onboarding-buttons">{step>0&&step<6&&<button className="onboarding-skip" type="button" disabled={busy||!!followBusy} onClick={()=>next(true)}>Skip</button>}<button type="button" className="onboarding-next" disabled={busy||!!followBusy} onClick={()=>next()}>{busy?<Loader2 size={18} className="animate-spin"/>:null}{busy?"Saving…":step===0?"Let’s go":step===6?"Start listening":"Continue"}{!busy&&<ArrowRight size={18}/>}</button></div></footer>
   {colorEditor&&<ProfileColorPicker coverUrl={artworkUrl} colors={artworkColors} loading={artworkLoading} value={{mode:draft.mode,colors:draft.colors,motion:draft.motion,speed:draft.speed}} onPreview={setColorPreview} onSave={async value=>update({mode:value.mode,colors:value.colors,motion:value.motion,speed:value.speed})} onClose={()=>{setColorEditor(false);setColorPreview(null);}}/>}
   {picker&&<TrackPickerSheet title="Your profile song" tracks={visibleCatalog.filter(t=>t.uploader_id===user.id)} selectedIds={draft.profileTrack?[draft.profileTrack]:[]} onToggle={(id,track)=>{setPickedTrack(track);update({profileTrack:id});setPicker(false);}} onClose={()=>setPicker(false)}/>}
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

import {createRoot} from "react-dom/client";
createRoot(document.getElementById("root")).render(<WelcomeFlow user={fixtureUser} onDone={()=>{}}/>);
