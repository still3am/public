import {useEffect,useRef,useState} from 'react';
import {RotateCw,RotateCcw,Loader2} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {INITIAL_CROP,cropGeometry,drawCrop,cropFile} from '@/lib/profileCrop';
import './profile-upgrades.css';
export default function ProfileImageEditor({file,kind='avatar',onApply,onClose}){
 const banner=kind==='banner',canvas=useRef(null),pointers=useRef(new Map()),gesture=useRef(null);
 const [image,setImage]=useState(null),[tab,setTab]=useState(banner?'desktop':'avatar'),[crops,setCrops]=useState({avatar:{...INITIAL_CROP},desktop:{...INITIAL_CROP},mobile:{...INITIAL_CROP}}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const current=crops[tab],aspect=tab==='desktop'?4.5:tab==='mobile'?1.85:1;
 useEffect(()=>{let active=true,bitmap;setError('');setImage(null);(async()=>{try{if(!file?.type?.startsWith('image/')||file.size>10*1024*1024)throw Error('Choose an image under 10 MB.');bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(!bitmap.width||!bitmap.height)throw Error('Invalid image');if(active)setImage(bitmap);else bitmap.close();}catch(e){if(active)setError(e.message||'This image format is not supported. Try a JPEG or PNG.');}})();return()=>{active=false;bitmap?.close();};},[file]);
 useEffect(()=>{if(image&&canvas.current)drawCrop(canvas.current,image,current,900,Math.round(900/aspect));},[image,current,aspect]);
 function update(patch){setCrops(old=>({...old,[tab]:{...old[tab],...patch}}));}
 function begin(e){if(!image||busy)return;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture.current={points:[...pointers.current.values()],crop:{...current}};}
 function move(e){
  if(!pointers.current.has(e.pointerId)||!image||!gesture.current)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const points=[...pointers.current.values()],g=gesture.current,rect=canvas.current.getBoundingClientRect();
  if(points.length===2&&g.points.length===2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);update({zoom:Math.max(1,Math.min(4,g.crop.zoom*distance(points)/Math.max(1,distance(g.points))))});}
  else if(points.length===1&&g.points.length===1){const geo=cropGeometry(image.width,image.height,rect.width,rect.height,g.crop);update({x:geo.dx?Math.max(-1,Math.min(1,g.crop.x+(points[0].x-g.points[0].x)/geo.dx)):0,y:geo.dy?Math.max(-1,Math.min(1,g.crop.y+(points[0].y-g.points[0].y)/geo.dy)):0});}
 }
 function end(e){pointers.current.delete(e.pointerId);gesture.current={points:[...pointers.current.values()],crop:{...current}};}
 async function apply(){if(!image||busy)return;setBusy(true);setError('');try{const files=banner?{desktop:await cropFile(image,crops.desktop,1600,Math.round(1600/4.5),'profile-banner.jpg'),mobile:await cropFile(image,crops.mobile,900,Math.round(900/1.85),'profile-banner-mobile.jpg')}:{avatar:await cropFile(image,crops.avatar,768,768,'profile-avatar.jpg')};if(await onApply(files)===false)throw Error('Upload failed. Your crop is still here—please retry.');onClose();}catch(e){setError(e.message||'Couldn’t prepare your photo. Please retry.');}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="profile-image-editor" onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onPointerDownOutside={e=>{if(busy)e.preventDefault();}}><DialogHeader><DialogTitle>{banner?'Frame your banner':'Make it fit your circle'}</DialogTitle><DialogDescription>Drag to position. Pinch or use the slider to zoom.{banner?' Adjust both crops before applying.':''}</DialogDescription></DialogHeader>
 {banner&&<div className="profile-crop-tabs" role="group" aria-label="Banner preview">{['desktop','mobile'].map(value=><button key={value} type="button" disabled={busy} aria-pressed={tab===value} onClick={()=>{pointers.current.clear();setTab(value);}}>{value==='desktop'?'Desktop':'Mobile'}</button>)}</div>}
 <div className={'profile-crop-stage '+(!banner?'is-circle':'')} style={{aspectRatio:aspect}}>{!image?<Loader2 className="animate-spin"/>:<canvas ref={canvas} tabIndex={0} role="img" aria-label="Image crop preview. Use arrow keys to reposition." onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={e=>{const delta={ArrowLeft:{x:current.x-.05},ArrowRight:{x:current.x+.05},ArrowUp:{y:current.y-.05},ArrowDown:{y:current.y+.05}}[e.key];if(delta){e.preventDefault();update(delta);}}}/>}</div>
 <label className="profile-crop-zoom">Zoom <span>{Math.round(current.zoom*100)}%</span><input aria-label="Image zoom" type="range" min="1" max="4" step=".01" value={current.zoom} disabled={!image||busy} onChange={e=>update({zoom:Number(e.target.value)})}/></label>
 <div className="profile-crop-tools"><button type="button" disabled={busy||!image} onClick={()=>update({rotation:(current.rotation+90)%360,x:0,y:0})}><RotateCw size={17}/>Rotate</button><button type="button" disabled={busy} onClick={()=>update({...INITIAL_CROP})}><RotateCcw size={17}/>Reset</button></div>
 {error&&<p role="alert" className="profile-editor-error">{error}</p>}
 <div className="profile-crop-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={!image||busy} onClick={apply}>{busy?<Loader2 size={17} className="animate-spin"/>:null}{busy?'Preparing…':'Apply to draft'}</button></div>
 </DialogContent></Dialog>;
}
