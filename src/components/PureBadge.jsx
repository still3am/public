import {AudioLines} from "lucide-react";
import {usePlayer} from "@/context/PlayerContext";
import "./pure-badge.css";

export default function PureBadge({compact=false}){
 const p=usePlayer();
 if(!p.currentTrack||!p.pure?.enabled||p.pureSuspended||p.pureComparing)return null;
 return <span className={"pure-badge "+(compact?"is-compact ":"")+(p.isPlaying?"is-playing":"")} aria-label="PURE sound enhancement enabled"><AudioLines size={compact?11:13} strokeWidth={1.6} aria-hidden="true"/><span className="pure-badge-word">PURE</span></span>;
}
