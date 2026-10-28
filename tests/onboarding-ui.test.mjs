import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import * as model from "../src/lib/onboardingModel.js";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
globalThis.__avatars=AVATAR_PRESETS;
globalThis.__React=React;globalThis.__model=model;
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const load=async(source,stubs)=>{
 const code=ts.transpileModule(stubs+"\n"+source.replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
};
const current={id:"listener",display_name:"Listener",created_date:"2026-10-17",onboarding_completed:false};
globalThis.__user=current;
const common=`const useAvatarGallery=()=>({avatars:globalThis.__avatars,error:""});const React=globalThis.__React;const {useEffect,useRef,useState,useMemo,useDeferredValue}=React;const useAuth=()=>({user:globalThis.__user,checkUserAuth:async()=>{}});const useSafety=()=>({blocked:globalThis.__blocked||new Set(),own:[]});`;
const settings=await load(fs.readFileSync("src/components/profile/SettingsSheet.jsx","utf8"),common+`
const usePlayer=()=>({}),PureControls=()=>null,useLiquidGlass=()=>({mode:"off"}),LiquidGlassControls=()=>null,ArrowLeft=()=>null,AudioLines=ArrowLeft,Play=ArrowLeft,Pause=ArrowLeft;
const {onboardingComplete}=globalThis.__model;
const Link=({children,...props})=>React.createElement("a",props,children);
const X=()=>null,Droplets=X,Lightbulb=X,GitMerge=X,Trash2=X,ChevronRight=X,Sparkles=X,BarChart3=X,Loader2=X,LogOut=X,Sun=X,Moon=X,Shield=X,Headphones=X,FileText=X;
const useTheme=()=>({isDark:true,toggle(){}}),reportActionError=()=>{},clearPersonalData=async()=>{},base44={};
`);
const settingsMarkup=()=>renderToStaticMarkup(React.createElement(settings.default,{onClose(){},onDeleteAccount(){}}));
assert.match(settingsMarkup(),/Finish setting up PUBLIC/,"unfinished accounts retain setup");
current.onboarding_completed=true;
assert.doesNotMatch(settingsMarkup(),/Finish setting up PUBLIC|Personalize your PUBLIC/,"completed accounts lose setup");
current.onboarding_completed=false;
assert.match(settingsMarkup(),/Finish setting up PUBLIC/,"completion does not leak between accounts");
const ui=await load(fs.readFileSync("src/components/NewMemberOnboarding.jsx","utf8"),common+`
const {ONBOARDING_PALETTES,cleanHandle,validHandle,credits,recommendPeople,readOnboardingDraft,draftKey,onboardingComplete,normalizeOnboardingColors,mergeOnboardingTaste,withOnboardingDeadline,onboardingSearchMatch}=globalThis.__model;
const usePlayer=()=>globalThis.__player||{currentTrack:null,isPlaying:false,playTrackAt(){},togglePlay(){}},useNavigate=()=>()=>{},base44={},getPublishedTracks=async()=>[],getUserMusicPreferences=async()=>({}),saveUserMusicPreferences=async()=>{};
const GENRES=["Hip-Hop","R&B","Pop","Afrobeats","Latin","Dance","Indie","Rock","Soul","Jazz","Electronic","Reggaeton","Ambient"];
const useCoverUrl=url=>url;
const useCoverPalette=()=>({colors:globalThis.__artColors||[],loading:false});
const ArrowRight=()=>null,ArrowLeft=ArrowRight,Check=ArrowRight,Headphones=ArrowRight,Loader2=ArrowRight,Camera=ArrowRight,Search=ArrowRight,Music2=ArrowRight,ShieldCheck=ArrowRight,Plus=ArrowRight,Play=ArrowRight,Pause=ArrowRight;
const Dialog=({children})=>React.createElement(React.Fragment,null,children);
const DialogContent=({children,...props})=>React.createElement("section",{"data-step":props["data-onboarding-step"]},children);
const DialogTitle=React.forwardRef(({children},ref)=>React.createElement("h2",{ref},children));
const DialogDescription=({children})=>React.createElement("p",null,children);
const MotionGradient=props=>{globalThis.__gradientColors=props.colors;return null;},Logo=()=>null,ProfileColorPicker=()=>null,TrackPickerSheet=()=>null;
const AVATAR_PRESETS=globalThis.__avatars;
const Avatar=()=>React.createElement("span");
`);
for(let step=0;step<7;step++){
 storage.set(model.draftKey(current.id),JSON.stringify({uid:current.id,step}));
 const html=renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
 assert.match(html,new RegExp('data-step="'+step+'"'));
 assert.equal((html.match(/<h2/g)||[]).length,1,"one clear heading per screen");
 assert.match(html,/Setup progress/);
 assert.match(html,step===6?/Start listening/:step===0?/Let’s go/:/Continue/);
 if(step===1){assert.match(html,/Choose an avatar/);assert.match(html,/Upload a photo/);assert.equal((html.match(/aria-label="Choose [^"]+ avatar"/g)||[]).length,AVATAR_PRESETS.length,"onboarding offers the complete gallery");}
 if(step===2){assert.equal((html.match(/aria-pressed=/g)||[]).length,12,"genres begin with a short selection");assert.match(html,/More genres/);}
 if(step===5){assert.match(html,/Choose profile colors/,"opens the shared PUBLIC color editor");assert.match(html,/Add a profile song/);}
 if(step===6){assert.match(html,/Share my favorite songs/);assert.match(html,/<details/,"additional privacy detail is collapsed");}
}
console.log("PASS all seven onboarding screens render; concise genre choices, progressive controls, and completion-aware Settings");

// Confirmed completion remains hidden even if the context refresh has stale data.
storage.set("public:onboarded:"+current.id,"1");
assert.doesNotMatch(settingsMarkup(),/Finish setting up PUBLIC/);
globalThis.__user={id:"another",onboarding_completed:false};assert.match(settingsMarkup(),/Finish setting up PUBLIC/);
globalThis.__user=current;
globalThis.__blocked=new Set(["blocked"]);
const picker=await load(fs.readFileSync("src/components/profile/TrackPickerSheet.jsx","utf8"),common+`
const useLibrary=()=>({ids:new Set()}),useCoverUrl=url=>url;
const peekPublishedTracks=()=>[{id:"allowed",uploader_id:"friend",title:"Allowed song"},{id:"hidden",uploader_id:"blocked",title:"Blocked song"}];
const getPublishedTracks=async()=>peekPublishedTracks(),subscribePublishedTracks=()=>()=>{};
const Check=()=>null,Search=Check,Loader2=Check,Music2=Check,X=Check,Image=()=>null;
const Dialog=({children})=>React.createElement(React.Fragment,null,children);
const DialogContent=Dialog,DialogHeader=Dialog,DialogTitle=Dialog,DialogDescription=Dialog;
`);
const pickerHtml=renderToStaticMarkup(React.createElement(picker.default,{title:"Your profile song",onToggle(){},onClose(){}}));
assert.match(pickerHtml,/Allowed song/);assert.doesNotMatch(pickerHtml,/Blocked song/);
console.log("PASS stale-context Settings completion, account separation and shared picker blocked-user filtering");

const previewSong={id:"preview",title:"My profile song",artist:"Preview artist",cover_art_url:"https://example.test/art.jpg"};
let songMarkup=renderToStaticMarkup(React.createElement(ui.OnboardingProfileSong,{track:previewSong,onChange(){}}));
assert.match(songMarkup,/My profile song/);assert.match(songMarkup,/Preview artist/);assert.match(songMarkup,/art.jpg/);assert.match(songMarkup,/Play My profile song/);
globalThis.__player={currentTrack:previewSong,isPlaying:true};
songMarkup=renderToStaticMarkup(React.createElement(ui.OnboardingProfileSong,{track:previewSong,onChange(){}}));assert.match(songMarkup,/Pause My profile song/);
console.log("PASS selected profile song shows real artwork, artist and player state");

storage.set(model.draftKey(current.id),JSON.stringify({uid:current.id,step:5,mode:"auto",profileTrack:"preview"}));
globalThis.__artColors=["#a02020","#e0a020","#201010"];
let autoHtml=renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
assert.match(autoHtml,/Automatic · From your song/);assert.match(autoHtml,/onboarding-auto-color[^>]*aria-pressed="true"/);
assert.deepEqual(globalThis.__gradientColors,globalThis.__artColors,"automatic preview uses extracted artwork palette");
globalThis.__artColors=[];
renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
assert.deepEqual(globalThis.__gradientColors,model.ONBOARDING_PALETTES[0].colors,"unavailable colors use a stable brand fallback");
console.log("PASS automatic artwork choice, matching live palette and extraction fallback");

storage.set(model.draftKey(current.id),JSON.stringify({uid:current.id,step:0}));
const welcomeHtml=renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
assert.doesNotMatch(welcomeHtml,/A SOUND OF YOUR OWN|Your taste\.|Your PUBLIC\./,"welcome has one headline and a short introduction");
storage.set(model.draftKey(current.id),JSON.stringify({uid:current.id,step:5,mode:"off"}));
renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
assert.deepEqual(globalThis.__gradientColors,[],"no-color mode actually stops rendering the gradient");
console.log('PASS simplified welcome and no-color onboarding preview');
