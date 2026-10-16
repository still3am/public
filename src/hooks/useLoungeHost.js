import {reportActionError} from "@/lib/actionError";
import {readAllPages} from "@/lib/readPages";
import {coalesce} from "@/lib/coalesce";
import { useEffect, useState, useRef, useCallback, createContext, useContext, createElement } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { generateLoungeCode } from "@/lib/lounge";

const ADDED_KEY = "public:lounge:added_ids";

function loadAddedSet() {
  try {
    const stored = JSON.parse(localStorage.getItem(ADDED_KEY) || "[]");
    return new Set(stored);
  } catch {
    return new Set();
  }
}

// Host-side manager for a Lounge session: creates/reuses the host's active
// session, surfaces members + pending join requests, hands the host approve /
// reject actions (via the loungeApprove backend function), and pipes_guest
// queue submissions straight into the host's local PlayerContext queue.
function useLoungeHostState() {
  const { user } = useAuth();
  const p = usePlayer();
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const memberLocks=useRef(new Set());
  const startingRef=useRef(null),accountRef=useRef(user?.id),sessionKey=useRef(null);accountRef.current=user?.id;
  useEffect(()=>{startingRef.current=null;sessionKey.current=null;setSession(null);setMembers([]);setLoading(false);},[user?.id]);
  const addedRef = useRef(null);
  if (addedRef.current === null) addedRef.current = loadAddedSet();
  const pRef = useRef(p);
  useEffect(() => {
    pRef.current = p;
  }, [p]);

  const persistAdded = () => {
    try {
      localStorage.setItem(ADDED_KEY, JSON.stringify([...addedRef.current]));
    } catch {}
  };

  const refreshMembers = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const list = await base44.entities.LoungeMember.filter(
        { session_id: sid },
        "created_date",
        200
      );
      if(sessionKey.current===sid)setMembers(list || []);
    } catch {}
  }, []);

  const ensureSession = useCallback(async () => {
    if (!user?.id) return null;
    if (session?.id && session.is_active && session.host_id===user.id) {
      refreshMembers(session.id);
      return session;
    }
    if(startingRef.current)return startingRef.current;
    const uid=user.id;
    const request=(async()=>{
    setLoading(true);
    try {
      // Reuse an active session this host already created (e.g. reopened).
      const own = await base44.entities.LoungeSession.filter(
        { host_id: user.id, is_active: true },
        "-created_date",
        5
      );
      if(accountRef.current!==uid)return null;
      let active = own && own[0];
      if (!active) {
        const code = generateLoungeCode();
        active = await base44.entities.LoungeSession.create({
          host_id: user.id,
          host_name: user.display_name || user.full_name || "",
          name: "",
          code,
          is_active: true,
          is_playing: false,
          position_seconds: 0,
          current_track_id: "",
          current_track: "",
          sync_anchor_at: new Date().toISOString(),
        });
        if(accountRef.current!==uid)return null;
        // The host is a member of their own lounge.
        try {
          await base44.entities.LoungeMember.create({
            session_id: active.id,
            user_id: user.id,
            name: user.display_name || user.full_name || "",
            role: "host",
            status: "approved",
          });
        } catch {}
      }
      if(accountRef.current!==uid)return null;
      sessionKey.current=active.id;setSession(active);
      refreshMembers(active.id);
      return active;
    } catch (e) {
      if(accountRef.current===uid)reportActionError(e,"Your lounge could not start. Please retry.");
      return null;
    } finally {
      if(accountRef.current===uid)setLoading(false);
    }
    })();
    startingRef.current=request;
    try{return await request;}finally{if(startingRef.current===request)startingRef.current=null;}
  }, [user?.id, session, refreshMembers]);

  const approve = useCallback(
    async (m) => {
      if (!session?.id || !m || memberLocks.current.has(m.id)) return false;
      memberLocks.current.add(m.id);
      try {
        await base44.entities.LoungeMember.update(m.id,{status:"approved"});
        refreshMembers(session.id);return true;
      } catch(error) {if(sessionKey.current===session.id)reportActionError(error,"Couldn’t approve this listener. Please retry.");return false;}
      finally{memberLocks.current.delete(m.id);}
    },
    [session?.id, refreshMembers]
  );

  const reject = useCallback(
    async (m) => {
      if (!session?.id || !m || memberLocks.current.has(m.id)) return false;
      memberLocks.current.add(m.id);
      try {
        await base44.entities.LoungeMember.update(m.id,{status:"rejected"});
        refreshMembers(session.id);return true;
      } catch(error) {if(sessionKey.current===session.id)reportActionError(error,"Couldn’t reject this request. Please retry.");return false;}
      finally{memberLocks.current.delete(m.id);}
    },
    [session?.id, refreshMembers]
  );

  const endSession = useCallback(async () => {
    if (!session?.id) return;
    try {
      await base44.entities.LoungeSession.update(session.id, { is_active: false });
    } catch(error) {if(sessionKey.current===session.id)reportActionError(error,"Couldn’t end the lounge. Please retry.");return false;}
    if(sessionKey.current===session.id){sessionKey.current=null;setSession(null);setMembers([]);}
    return true;
  }, [session?.id]);

  const updateName = useCallback(
    async (name) => {
      if (!session?.id) return false;
      const clean = (name || "").slice(0, 60);
      try {
        await base44.entities.LoungeSession.update(session.id, { name: clean });
        setSession((prev) => (prev?.id===session.id ? { ...prev, name: clean } : prev));
        return true;
      } catch {return false;}
    },
    [session?.id]
  );

  // Live member updates so pending requests appear as guests scan the QR.
  useEffect(() => {
    if (!session?.id) return;
    let unsub;
    try {
      unsub = base44.entities.LoungeMember.subscribe(() => refreshMembers(session.id));
    } catch {}
    const poll=setInterval(()=>refreshMembers(session.id),10000);
    return () => {
      clearInterval(poll);if (unsub) unsub();
    };
  }, [session?.id, refreshMembers]);

  useEffect(()=>{
    if(!session?.id)return;
    let active=true,reading=false;
    const load=async()=>{if(!active||reading)return;reading=true;try{
      const rows=await readAllPages(opts=>base44.entities.LoungeQueueItem.filter({session_id:session.id},{sort:"created_date",...opts}));
      if(!active)return;
      const player=pRef.current;
      for(const it of rows){if(addedRef.current.has(it.id))continue;let track;try{track=JSON.parse(it.track);}catch{continue;}
        if(!track?.id)continue;addedRef.current.add(it.id);player.addToQueue({...track,_loungeRowId:it.id});}
      const live=new Set(rows.map(r=>r.id));
      for(let i=player.queue.length-1;i>=0;i--){const t=player.queue[i];if(t._loungeRowId&&!live.has(t._loungeRowId))player.removeFromQueue(i);}
      persistAdded();
    }catch{}finally{reading=false;}}
    load();const reload=coalesce(load,400),timer=setInterval(reload,8000);let unsub;try{unsub=base44.entities.LoungeQueueItem.subscribe(reload);}catch{}
    return()=>{active=false;reload.cancel();clearInterval(timer);if(unsub)unsub();};
  },[session?.id]);

  // Cleanup tracked "added" ids when the session changes / ends so a new lounge
  // starts from a clean dedup set.
  useEffect(() => {
    if (!session?.id) {
      addedRef.current = new Set();
      persistAdded();
    }
  }, [session?.id]);

  return {
    session,
    members,
    loading,
    ensureSession,
    approve,
    reject,
    endSession,
    updateName,
  };
}
const LoungeHostContext=createContext(null);
export function LoungeHostProvider({children}){
 const lounge=useLoungeHostState();
 return createElement(LoungeHostContext.Provider,{value:lounge},children);
}
export function useLoungeHost(){
 const lounge=useContext(LoungeHostContext);
 if(!lounge)throw new Error("LoungeHostProvider is required");
 return lounge;
}
