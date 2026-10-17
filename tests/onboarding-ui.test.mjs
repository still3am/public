import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import * as model from "../src/lib/onboardingModel.js";
globalThis.__React=React;globalThis.__model=model;
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const load=async(source,stubs)=>{
 const code=ts.transpileModule(stubs+"\n"+source.replace(/^import[^;]+;/gm,""),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
};
const current={id:"listener",display_name:"Listener",created_date:"2026-10-17",onboarding_completed:false};
globalThis.__user=current;
const common=`const React=globalThis.__React;const {useEffect,useRef,useState,useMemo}=React;const useAuth=()=>({user:globalThis.__user,checkUserAuth:async()=>{}});const useSafety=()=>({blocked:new Set(),own:[]});`;
const settings=await load(fs.readFileSync("src/components/profile/SettingsSheet.jsx","utf8"),common+`
const Link=({children,...props})=>React.createElement("a",props,children);
const X=()=>null,Lightbulb=X,GitMerge=X,Trash2=X,ChevronRight=X,Sparkles=X,BarChart3=X,Loader2=X,LogOut=X,Sun=X,Moon=X,Shield=X,Headphones=X,FileText=X;
const useTheme=()=>({isDark:true,toggle(){}}),reportActionError=()=>{},clearPersonalData=async()=>{},base44={};
`);
const settingsMarkup=()=>renderToStaticMarkup(React.createElement(settings.default,{onClose(){},onDeleteAccount(){}}));
assert.match(settingsMarkup(),/Finish setting up PUBLIC/,"unfinished accounts retain setup");
current.onboarding_completed=true;
assert.doesNotMatch(settingsMarkup(),/Finish setting up PUBLIC|Personalize your PUBLIC/,"completed accounts lose setup");
current.onboarding_completed=false;
assert.match(settingsMarkup(),/Finish setting up PUBLIC/,"completion does not leak between accounts");
const ui=await load(fs.readFileSync("src/components/NewMemberOnboarding.jsx","utf8"),common+`
const {ONBOARDING_PALETTES,cleanHandle,validHandle,credits,recommendPeople,readOnboardingDraft,draftKey}=globalThis.__model;
const useNavigate=()=>()=>{},base44={},getPublishedTracks=async()=>[],getUserMusicPreferences=async()=>({}),saveUserMusicPreferences=async()=>{};
const GENRES=["Hip-Hop","R&B","Pop","Afrobeats","Latin","Dance","Indie","Rock","Soul","Jazz","Electronic","Reggaeton","Ambient"];
const useCoverUrl=url=>url;
const ArrowRight=()=>null,ArrowLeft=ArrowRight,Check=ArrowRight,Headphones=ArrowRight,Loader2=ArrowRight,Camera=ArrowRight,Search=ArrowRight,Music2=ArrowRight,ShieldCheck=ArrowRight,Plus=ArrowRight;
const Dialog=({children})=>React.createElement(React.Fragment,null,children);
const DialogContent=({children,...props})=>React.createElement("section",{"data-step":props["data-onboarding-step"]},children);
const DialogTitle=({children})=>React.createElement("h2",null,children);
const DialogDescription=({children})=>React.createElement("p",null,children);
const MotionGradient=()=>null,Logo=()=>null,ProfileColorWheel=()=>null,TrackPickerSheet=()=>null;
const Avatar=()=>React.createElement("span");
`);
for(let step=0;step<7;step++){
 storage.set(model.draftKey(current.id),JSON.stringify({uid:current.id,step}));
 const html=renderToStaticMarkup(React.createElement(ui.WelcomeFlow,{user:current,onDone(){}}));
 assert.match(html,new RegExp('data-step="'+step+'"'));
 assert.equal((html.match(/<h2/g)||[]).length,1,"one clear heading per screen");
 assert.match(html,/Setup progress/);
 assert.match(html,step===6?/Start listening/:step===0?/Let’s go/:/Continue/);
 if(step===2){assert.equal((html.match(/aria-pressed=/g)||[]).length,12,"genres begin with a short selection");assert.match(html,/More genres/);}
 if(step===5){assert.match(html,/<details/,"custom color wheel is collapsed");assert.match(html,/Add a profile song/);}
 if(step===6){assert.match(html,/Share my favorite songs/);assert.match(html,/<details/,"additional privacy detail is collapsed");}
}
console.log("PASS all seven onboarding screens render; concise genre choices, progressive controls, and completion-aware Settings");
