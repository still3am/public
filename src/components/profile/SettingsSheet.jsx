import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {X,Lightbulb,GitMerge,Trash2,ChevronRight,Sparkles,BarChart3,Loader2,LogOut,Sun,Moon,Shield,Headphones,FileText,Music2} from "lucide-react";
import {reportActionError} from "@/lib/actionError";
import {useTheme} from "@/lib/useTheme";
import {useAuth} from "@/lib/AuthContext";
import {clearPersonalData} from "@/lib/clearPersonalData";
import {useSafety} from "@/context/SafetyContext";
import {base44} from "@/api/base44Client";

/** @param {any} props */
function SettingRow({icon:Icon,title,description,children,to,onClick,danger=false,disabled=false}){
 const content=<><span className={"w-9 h-9 rounded-xl grid place-items-center shrink-0 "+(danger?"bg-red-500/10 text-red-500":"bg-foreground/[0.06] text-foreground/75")}><Icon size={18}/></span><span className="min-w-0 flex-1"><span className={"block text-sm font-semibold leading-snug "+(danger?"text-red-500":"")}>{title}</span>{description&&<span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</span>}</span>{children||<ChevronRight size={16} className="shrink-0 text-muted-foreground/60"/>}</>;
 const cls="w-full min-h-[64px] flex items-center gap-3 px-4 py-3 text-left";
 return to?<Link to={to} onClick={onClick} className={cls+" hover:bg-foreground/[0.04] transition-colors"}>{content}</Link>:onClick?<button type="button" disabled={disabled} onClick={onClick} className={cls+" hover:bg-foreground/[0.04] transition-colors disabled:opacity-50"}>{content}</button>:<div className={cls}>{content}</div>;
}
/** @param {any} props */
function SettingSwitch({checked,onChange,busy,label}){
 return <button type="button" role="switch" aria-label={label} aria-checked={checked} aria-busy={busy} disabled={busy} onClick={()=>onChange(!checked)} className="w-14 h-11 shrink-0 grid place-items-center focus-visible:ring-2 focus-visible:ring-ring rounded-xl disabled:opacity-50">
  <span className={"relative w-12 h-7 rounded-full transition-colors "+(checked?"bg-foreground":"bg-foreground/20")}><span className={"absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm transition-transform "+(checked?"translate-x-5 bg-background":"translate-x-0 bg-background")}>{busy&&<Loader2 size={12} className="absolute inset-1 animate-spin text-foreground"/>}</span></span>
 </button>;
}
/** @param {any} props */
function SettingGroup({title,children}){
 return <section className="space-y-2"><h3 className="px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{title}</h3><div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60">{children}</div></section>;
}
/** @param {any} props */
export default function SettingsSheet({onClose,onDeleteAccount}){
 const safety=useSafety(),{user,checkUserAuth}=useAuth(),theme=useTheme();
 const [artist,setArtist]=useState(!!user?.is_artist),[explicit,setExplicit]=useState(!!user?.show_explicit);
 const [saving,setSaving]=useState(""),[unblocking,setUnblocking]=useState(""),[loggingOut,setLoggingOut]=useState(false);
 const lock=useRef(false),logoutLock=useRef(false),blockedLock=useRef(false);
 useEffect(()=>{setArtist(!!user?.is_artist);setExplicit(!!user?.show_explicit);},[user?.id,user?.is_artist,user?.show_explicit]);
 async function preference(key,value){
  if(!user?.id||lock.current||logoutLock.current)return;
  if(key==="show_explicit"&&value&&!window.confirm("I confirm I am at least 18 and want to see explicit music."))return;
  lock.current=true;setSaving(key);
  const before=key==="is_artist"?artist:explicit,set=key==="is_artist"?setArtist:setExplicit;set(value);
  try{
   await base44.auth.updateMe(key==="is_artist"?{is_artist:value}:{show_explicit:value,adult_confirmed:value||!!user.adult_confirmed});
   await checkUserAuth({silent:true});
   if(key==="show_explicit")window.dispatchEvent(new Event("catalog:invalidate"));
  }catch(error){set(before);reportActionError(error,"Couldn’t save this setting. Please try again.");}
  finally{lock.current=false;setSaving("");}
 }
 async function logout(){
  if(logoutLock.current||lock.current||blockedLock.current)return;
  logoutLock.current=true;setLoggingOut(true);
  try{await clearPersonalData().catch(()=>{});await base44.auth.logout(window.location.origin+"/");}
  catch(error){logoutLock.current=false;setLoggingOut(false);reportActionError(error,"Couldn’t sign out. Please try again.");}
 }
 async function unblock(row){
  if(blockedLock.current||logoutLock.current)return;
  blockedLock.current=true;setUnblocking(row.id);
  try{await base44.functions.invoke("safety",{action:"block",user_id:row.blocked_user_id,blocked:false});await safety.reload();window.dispatchEvent(new Event("catalog:invalidate"));}
  catch(error){reportActionError(error,"Couldn’t unblock this account.");}
  finally{blockedLock.current=false;setUnblocking("");}
 }
 return <div role="dialog" aria-modal="true" aria-label="Settings" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}}} className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-5">
  <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose}/>
  <div className="relative w-full md:max-w-lg max-h-[92dvh] md:max-h-[86dvh] flex flex-col bg-background text-foreground border border-border/70 rounded-t-[28px] md:rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
   <header className="shrink-0 px-5 pt-3 pb-4 border-b border-border/60 bg-background">
    <div aria-hidden="true" className="md:hidden mx-auto w-9 h-1 rounded-full bg-foreground/20 mb-3"/>
    <div className="flex justify-between items-center gap-3"><div><h2 className="text-2xl font-bold tracking-tight">Settings</h2><p className="text-xs text-muted-foreground mt-1">Make PUBLIC feel right for you.</p></div><button type="button" onClick={onClose} className="w-11 h-11 rounded-full bg-foreground/[0.06] grid place-items-center hover:bg-foreground/10 shrink-0" aria-label="Close settings"><X size={20}/></button></div>
   </header>
   <div className="min-h-0 overflow-y-auto overscroll-contain px-4 md:px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6">
    <SettingGroup title="Listening & appearance">
     <SettingRow icon={Music2} title="Explicit music" description="Show songs marked explicit. Ages 18+."><SettingSwitch label="Show explicit music" checked={explicit} busy={!!saving||loggingOut} onChange={v=>preference("show_explicit",v)}/></SettingRow>
     <SettingRow icon={GitMerge} title="Song transitions" description="Crossfade and gapless playback" to="/settings/transitions" onClick={onClose}/>
     <SettingRow icon={theme.isDark?Moon:Sun} title="Dark appearance" description={theme.isDark?"Dark backgrounds, softer light":"Light backgrounds, clear contrast"}><SettingSwitch label="Dark appearance" checked={theme.isDark} onChange={theme.toggle}/></SettingRow>
    </SettingGroup>
    {user?.role!=="admin"&&<SettingGroup title="Creator">
     <SettingRow icon={Sparkles} title="Artist Mode" description="Artist badge and listening insights"><SettingSwitch label="Artist Mode" checked={artist} busy={!!saving||loggingOut} onChange={v=>preference("is_artist",v)}/></SettingRow>
     {artist&&<SettingRow icon={BarChart3} title="Artist dashboard" description="Plays, likes and followers" to="/artist-dashboard" onClick={onClose}/>}
    </SettingGroup>}
    <SettingGroup title="Help & privacy">
     <SettingRow icon={Headphones} title="Support & copyright" description="Get help or send a copyright request" to="/support" onClick={onClose}/>
     <SettingRow icon={Lightbulb} title="Ideas & suggestions" to="/suggestions" onClick={onClose}/>
     <SettingRow icon={Shield} title="Privacy" to="/privacy" onClick={onClose}/>
     <SettingRow icon={FileText} title="Terms & community" to="/terms" onClick={onClose}/>
    </SettingGroup>
    {safety.own.length>0&&<SettingGroup title="Blocked accounts">{safety.own.map((row,i)=><SettingRow key={row.id} icon={Shield} title={"Blocked account "+(i+1)} description="This account can’t interact with you."><button type="button" disabled={!!unblocking||loggingOut} className="min-h-11 px-3 rounded-full border text-xs font-semibold disabled:opacity-50 shrink-0" onClick={()=>unblock(row)}>{unblocking===row.id?"Unblocking…":"Unblock"}</button></SettingRow>)}</SettingGroup>}
    <SettingGroup title="Account">
     <SettingRow icon={loggingOut?Loader2:LogOut} title={loggingOut?"Signing out…":"Log out"} description="Sign out on this device" disabled={loggingOut||!!saving||!!unblocking} onClick={logout}/>
     <SettingRow icon={Trash2} title="Delete account" description="Permanently remove your profile and uploads" danger disabled={loggingOut||!!saving||!!unblocking} onClick={()=>{onClose();onDeleteAccount();}}/>
    </SettingGroup>
    <p className="text-center text-[11px] tracking-[.18em] text-muted-foreground/60 font-semibold">PUBLIC.</p>
   </div>
  </div>
 </div>;
}
