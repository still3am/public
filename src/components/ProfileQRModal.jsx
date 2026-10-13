import {copyText,shareLink} from '@/lib/shareLink';
import { useState } from "react";
import { X, Share2, ScanLine } from "lucide-react";
import QRScannerModal from "@/components/QRScannerModal";

/** @param {any} props */
export default function ProfileQRModal({ url, name, avatar, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=2&color=000000&bgcolor=FFFFFF&qzone=2&data=${encodeURIComponent(
    url
  )}`;

  async function copy() {
    try{await copyText(url);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}
  }
  async function share() {
    try{const result=await shareLink({title:name+' on PUBLIC.',text:'Listen to '+name+' on PUBLIC.',url});if(result==='copied'){setCopied(true);setTimeout(()=>setCopied(false),1500);}}catch{}
  }

  function download() {
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${name}-public-qr.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Profile QR code" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();if(!scanning)onClose();}}}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}>
      
      <div
        className="bg-card rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative max-h-[90dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}>
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-foreground/5"
          aria-label="Close">
          
          <X size={18} />
        </button>

        <div className="flex flex-col items-center mb-4">
          {avatar ?
          <img
            src={avatar}
            alt=""
            className="w-16 h-16 rounded-full object-cover mb-2 ring-2 ring-foreground/10" /> :


          <div className="w-16 h-16 rounded-full bg-foreground/10 grid place-items-center text-2xl font-extrabold mb-2">
              {(name || "?").charAt(0)}
            </div>
          }
          <h3 className="text-lg font-extrabold tracking-tight">{name}</h3>
          <p className="text-xs text-foreground/50">Scan to view on PUBLIC.</p>
        </div>

        <div
          className="inline-block p-4 rounded-3xl shadow-sm mb-4"
          style={{ backgroundColor: "white" }}>
          
          <img
            src={qrUrl}
            alt={`QR code for ${name}`}
            width="240"
            height="240"
            className="rounded-xl w-full max-w-[240px] h-auto" />
          
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={copy} className="col-span-2 px-4 py-2.5 rounded-full border text-sm font-semibold">{copied?'Link copied':'Copy profile link'}</button>
          {navigator.share ?
          <button
            onClick={share}
            className="col-span-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2">
            
              <Share2 size={14} /> Share profile
            </button> :
          null}
          










          
          




          
        </div>

        <button
          onClick={() => setScanning(true)}
          className="w-full px-4 py-2.5 rounded-full border border-dashed border-border text-sm font-semibold flex items-center justify-center gap-2 mt-1">
          
          <ScanLine size={14} /> Scan someone else's code
        </button>
      </div>
      {scanning && <QRScannerModal onClose={() => setScanning(false)} />}
    </div>);

}