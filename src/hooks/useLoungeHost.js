import { useEffect, useState, useRef, useCallback } from "react";
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
export function useLoungeHost() {
  const { user } = useAuth();
  const p = usePlayer();
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

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
      setMembers(list || []);
    } catch {}
  }, []);

  const ensureSession = useCallback(async () => {
    if (!user?.id) return null;
    if (session?.id && session.is_active) {
      refreshMembers(session.id);
      return session;
    }
    setLoading(true);
    try {
      // Reuse an active session this host already created (e.g. reopened).
      const own = await base44.entities.LoungeSession.filter(
        { host_id: user.id, is_active: true },
        "-created_date",
        5
      );
      let active = own && own[0];
      if (!active) {
        const code = generateLoungeCode();
        active = await base44.entities.LoungeSession.create({
          host_id: user.id,
          host_name: user.full_name || "",
          name: "",
          code,
          is_active: true,
          is_playing: false,
          position_seconds: 0,
          current_track_id: "",
          current_track: "",
          sync_anchor_at: new Date().toISOString(),
        });
        // The host is a member of their own lounge.
        try {
          await base44.entities.LoungeMember.create({
            session_id: active.id,
            user_id: user.id,
            name: user.full_name || "",
            role: "host",
            status: "approved",
          });
        } catch {}
      }
      setSession(active);
      refreshMembers(active.id);
      return active;
    } catch (e) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, session, refreshMembers]);

  const approve = useCallback(
    async (m) => {
      if (!session?.id || !m) return;
      try {
        await base44.functions.invoke("loungeApprove", {
          member_id: m.id,
          session_id: session.id,
          action: "approve",
        });
        refreshMembers(session.id);
      } catch {}
    },
    [session?.id, refreshMembers]
  );

  const reject = useCallback(
    async (m) => {
      if (!session?.id || !m) return;
      try {
        await base44.functions.invoke("loungeApprove", {
          member_id: m.id,
          session_id: session.id,
          action: "reject",
        });
        refreshMembers(session.id);
      } catch {}
    },
    [session?.id, refreshMembers]
  );

  const endSession = useCallback(async () => {
    if (!session?.id) return;
    try {
      await base44.entities.LoungeSession.update(session.id, { is_active: false });
    } catch {}
    setSession(null);
    setMembers([]);
  }, [session?.id]);

  const updateName = useCallback(
    async (name) => {
      if (!session?.id) return false;
      const clean = (name || "").slice(0, 60);
      try {
        await base44.entities.LoungeSession.update(session.id, { name: clean });
        setSession((prev) => (prev ? { ...prev, name: clean } : prev));
        return true;
      } catch {
        return false;
      }
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
    return () => {
      if (unsub) unsub();
    };
  }, [session?.id, refreshMembers]);

  // Guest queue submissions → host's local play queue (dedup by row id so a
  // page reload doesn't double-add rows that are already queued).
  useEffect(() => {
    if (!session?.id) return;
    let unsub;
    try {
      unsub = base44.entities.LoungeQueueItem.subscribe((ev) => {
        if (!ev || ev.type !== "create") return;
        const it = ev.data;
        if (!it || it.session_id !== session.id) return;
        if (addedRef.current.has(it.id)) return;
        addedRef.current.add(it.id);
        persistAdded();
        let t = null;
        try {
          t = typeof it.track === "string" ? JSON.parse(it.track) : it.track;
        } catch {}
        if (!t) return;
        const player = pRef.current;
        if (!player.currentTrack) {
          player.playTrackAt([t]);
        } else {
          player.addToQueue(t);
        }
      });
    } catch {}
    return () => {
      if (unsub) unsub();
    };
  }, [session?.id]);

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