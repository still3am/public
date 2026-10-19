import {usePlayer} from "@/context/PlayerContext";
import "./pure-badge.css";

export default function PureBadge({compact=false,className=""}){
 const p=usePlayer();
 if(!p.currentTrack||!p.pure?.enabled||p.pureSuspended||p.pureComparing)return null;
 return <span className={"pure-badge "+(compact?"is-compact ":"")+(p.isPlaying?"is-playing ":"")+className} aria-label="PURE sound enhancement enabled"><svg className="pure-badge-symbol" width={compact?12:14} height={compact?12:14} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 8v4"/><path d="M6.5 5v10"/><path d="M10 2v16"/><path d="M13.5 5v10"/><path d="M17 8v4"/></svg><span className="pure-badge-word">PURE</span></span>;
}
