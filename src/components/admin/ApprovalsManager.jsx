import {readAllPages} from "@/lib/readPages";
import IncrementalList from "@/components/IncrementalList";
import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import ApprovalRow from "@/components/admin/ApprovalRow";
import LiveTrackRow from "@/components/admin/LiveTrackRow";

export default function ApprovalsManager() {
  const { toast } = useToast();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIds,setBusyIds]=useState(new Set()),[query,setQuery]=useState("");
  const writes=useRef(new Set()),pendingVersion=useRef(0),liveVersion=useRef(0);
  const [pendingFailed,setPendingFailed]=useState(false),[liveFailed,setLiveFailed]=useState(false);
  const begin=id=>{if(writes.current.has(id))return false;writes.current.add(id);setBusyIds(new Set(writes.current));return true;};
  const finish=id=>{writes.current.delete(id);setBusyIds(new Set(writes.current));};
  const [live, setLive] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);

  async function load(){
    const request=++pendingVersion.current;setLoading(true);setPendingFailed(false);
    try{const rows=await readAllPages(opts=>base44.entities.Track.filter({approval_status:"pending"},{sort:"-created_date",...opts}));if(request===pendingVersion.current)setTracks(rows);}
    catch{if(request===pendingVersion.current)setPendingFailed(true);}
    finally{if(request===pendingVersion.current)setLoading(false);}
  }
  async function loadLive(){
    const request=++liveVersion.current;setLiveLoading(true);setLiveFailed(false);
    try{const rows=await readAllPages(opts=>base44.entities.Track.filter({is_published:true},{sort:"-play_count",...opts}));if(request===liveVersion.current)setLive(rows);}
    catch{if(request===liveVersion.current)setLiveFailed(true);}
    finally{if(request===liveVersion.current)setLiveLoading(false);}
  }
  useEffect(()=>{load();loadLive();return()=>{pendingVersion.current++;liveVersion.current++;};},[]);

  async function approve(track) {
    if(!begin(track.id))return;
    try {
      await base44.entities.Track.update(track.id, {
        is_published: true,
        approval_status: "approved",
      });
      setTracks((prev) => (prev || []).filter((t) => t.id !== track.id));
      loadLive();
      toast({ title: `"${track.title}" is now live on PUBLIC` });
    } catch (e) {
      toast({ title: "Couldn't approve track", variant: "destructive" });
    } finally {
      finish(track.id);
    }
  }

  async function takedown(track) {
    if (!window.confirm(`Remove "${track.title}" from PUBLIC? It stays in the uploader's library and profile.`)) return;
    if(!begin(track.id))return;
    try {
      await base44.entities.Track.update(track.id, {
        is_published: false,
        approval_status: "rejected",
      });
      setLive((prev) => (prev || []).filter((t) => t.id !== track.id));
      toast({ title: "Removed from PUBLIC" });
    } catch (e) {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    } finally {
      finish(track.id);
    }
  }

  async function reject(track) {
    if(!begin(track.id))return;
    try {
      await base44.entities.Track.update(track.id, {
        is_published: false,
        approval_status: "rejected",
      });
      setTracks((prev) => (prev || []).filter((t) => t.id !== track.id));
      toast({ title: "Track rejected" });
    } catch (e) {
      toast({ title: "Couldn't reject track", variant: "destructive" });
    } finally {
      finish(track.id);
    }
  }

  const count = (tracks || []).length;
  const matches=track=>!query.trim()||[track.title,track.artist,track.uploader_name].some(value=>(value||"").toLowerCase().includes(query.trim().toLowerCase()));
  const pendingFiltered=(tracks||[]).filter(matches),liveFiltered=(live||[]).filter(matches);

  return (
    <div className="space-y-4">
      <div className="collection-tools"><input aria-label="Search music in approvals" placeholder="Find a title, artist, or uploader" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/>{query&&<button className="playlist-action" onClick={()=>setQuery("")}>Clear search</button>}</div>
      {/* Pending approvals */
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground/5 grid place-items-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Upload approvals</div>
              <div className="text-xs text-foreground/50">
                {tracks===null?"Review queue":count > 0 ? `${count} awaiting review` : "Queue is clear"}
              </div>
            </div>
          </div>
          <button
            onClick={() => { load(); loadLive(); }}
            className="p-2 rounded-full hover:bg-foreground/5 text-foreground/50"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading || liveLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {pendingFailed&&tracks===null?<button className="playlist-action" onClick={load}>Refresh approvals</button>:loading && tracks === null ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !pendingFiltered.length ? (
          <div className="py-8 text-center text-sm text-foreground/50">
            {query?"No matching uploads awaiting review.":"No tracks waiting for approval."}
          </div>
        ) : (
          <div className="space-y-2">
            {pendingFiltered.map((t) => (
              <ApprovalRow
                key={t.id}
                track={t}
                busy={busyIds.has(t.id)}
                onApprove={() => approve(t)}
                onReject={() => reject(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live on PUBLIC — takedown */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 grid place-items-center">
            <EyeOff size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Live on PUBLIC</div>
            <div className="text-xs text-foreground/50">
              Remove a track from public without deleting it; it stays in the owner's profile and library.
            </div>
          </div>
        </div>

        {liveFailed&&live===null?<button className="playlist-action" onClick={loadLive}>Refresh published music</button>:liveLoading && live === null ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !liveFiltered.length ? (
          <div className="py-6 text-center text-sm text-foreground/50">
            {query?"No matching published music.":"No tracks are live on PUBLIC right now."}
          </div>
        ) : (
          <IncrementalList items={liveFiltered} className="space-y-2" renderItem={track=><LiveTrackRow key={track.id} track={track} busy={busyIds.has(track.id)} onTakedown={()=>takedown(track)}/>}/>
        )}
      </div>
    </div>
  );
}