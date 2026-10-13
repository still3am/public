import {useState} from "react";
import {Check,Loader2} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {profileGradient} from "@/hooks/useCoverPalette";
export default function ProfileColorPicker({coverUrl,colors,loading,value,onPreview,onSave,onClose}){
 const [draft,setDraft]=useState(value),[saving,setSaving]=useState(false);
 const update=next=>{setDraft(next);onPreview(next);};
 const toggle=color=>{const selected=draft.colors.includes(color)?draft.colors.filter(c=>c!==color):[...draft.colors,color].slice(-3);update({mode:"custom",colors:selected});};
 const preview=draft.mode==="off"?[]:draft.mode==="custom"?draft.colors:colors.slice(0,3);
 const save=async()=>{if(saving)return;setSaving(true);try{await onSave(draft);onClose();}catch{/* Keep the dialog and draft available to retry. */}finally{setSaving(false);}};
 return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose();}}><DialogContent className="profile-palette-dialog"><DialogHeader><DialogTitle>Your profile colors</DialogTitle><DialogDescription>Make your profile yours. Choose up to three colors from your profile song’s cover.</DialogDescription></DialogHeader>
 <div className="profile-palette-preview" style={{backgroundImage:profileGradient(preview)}}>{coverUrl&&<img src={coverUrl} alt="Profile song cover"/>}<span>Live preview</span></div>
 <div className="view-switch" role="group" aria-label="Profile background mode">{[["auto","Automatic"],["custom","Custom"],["off","No color"]].map(([mode,label])=><button key={mode} disabled={saving} aria-pressed={draft.mode===mode} className={draft.mode===mode?"active":""} onClick={()=>update({...draft,mode})}>{label}</button>)}</div>
 {loading?<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin"/>Reading cover colors…</div>:colors.length?<div><p className="text-xs text-muted-foreground mb-3">Tap a color to add or remove it.</p><div className="profile-palette-swatches">{colors.map(color=><button key={color} disabled={saving} aria-label={`Choose ${color}`} aria-pressed={draft.mode==="custom"&&draft.colors.includes(color)} onClick={()=>toggle(color)} style={{backgroundColor:color}}>{draft.mode==="custom"&&draft.colors.includes(color)&&<span><Check size={15}/></span>}</button>)}</div></div>:<p className="text-sm text-muted-foreground">{coverUrl?"Cover colors aren’t available yet. Try another profile song cover.":"Choose a profile song with cover art first using Edit profile."}</p>}
 <p className="text-xs text-muted-foreground">Automatic follows your profile song. Custom keeps your chosen colors until you change them.</p>
 <div className="flex justify-end gap-2"><button disabled={saving} onClick={onClose} className="playlist-action">Cancel</button><button disabled={saving||(draft.mode==="custom"&&!draft.colors.length)} onClick={save} className="chrome-button">{saving&&<Loader2 size={15} className="animate-spin"/>}{saving?"Saving…":"Save colors"}</button></div></DialogContent></Dialog>;
}
