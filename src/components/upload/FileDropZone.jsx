import { useRef, useState } from 'react';
import { UploadCloud, Plus } from 'lucide-react';
/** @param {any} props */
export default function FileDropZone({onFiles,inputRef,compact=false,disabled=false}) {
  const [drag,setDrag]=useState(false);
  const depth=useRef(0);
  const choose=()=>{if(!disabled)inputRef.current?.click();};
  return <div role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label="Choose audio files to upload" className={`upload-dropzone ${compact?'is-compact':''} ${drag?'is-dragging':''} ${disabled?'is-disabled':''}`}
    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}}} onClick={choose}
    onDragEnter={e=>{e.preventDefault();if(disabled)return;depth.current++;setDrag(true);}}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled?'none':'copy';}}
    onDragLeave={e=>{e.preventDefault();depth.current=Math.max(0,depth.current-1);if(!depth.current)setDrag(false);}}
    onDrop={e=>{e.preventDefault();depth.current=0;setDrag(false);if(!disabled&&e.dataTransfer.files?.length)onFiles(e.dataTransfer.files);}}>
    <span className="upload-drop-icon">{compact?<Plus size={26}/>:<UploadCloud size={30}/>}</span>
    <h2>{drag?'Drop your audio here':compact?'Add more music':'Start with your audio'}</h2>
    <p><span className="upload-drop-mobile">Tap to choose files</span><span className="upload-drop-desktop">Drop your tracks here or browse files</span></p>
    <span className="upload-choose-label">Choose files <Plus size={15}/></span>
    <small>MP3, WAV, M4A, FLAC & more<br/>Multiple tracks and cover artwork welcome</small>
  </div>;
}
