import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import { readAllPages } from "@/lib/readPages";
import { setFollowState, followError } from "@/lib/followActions";
import DiscoverProfileCard from "./DiscoverProfileCard";
import Avatar from "@/components/Avatar";
import ScrollShelf from "@/components/ScrollShelf";
import { rankDiscoverPeople } from "@/lib/discoverPeople";
import "./discover-people.css";
import { useCoverPalette } from "@/hooks/useCoverPalette";
import { useCoverUrl } from "@/hooks/useCoverUrl";

function DiscoverAvatar({ person, active }) {
  const automatic = !["custom", "off"].includes(person.profile_background_mode);
  const trackId = automatic ? person.featured_track_id : "";
  const [art, setArt] = useState({ id: "", url: "" });
  useEffect(() => {
    if (!active || !trackId) return;
    let cancelled = false;
    base44.entities.Track.get(trackId).then((track) => {
      if (!cancelled) setArt({ id: trackId, url: track?.cover_art_url || "" });
    }).catch(() => {if (!cancelled) setArt({ id: trackId, url: "" });});
    return () => {cancelled = true;};
  }, [trackId, active]);
  const cover = useCoverUrl(art.id === trackId ? art.url : "");
  const { colors } = useCoverPalette(cover);
  const saved = (Array.isArray(person.profile_background_colors) ? person.profile_background_colors : []).filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 3);
  const palette = person.profile_background_mode === "off" ? [] : automatic ? colors.slice(0, 3) : saved;
  const gradient = palette.length ? "conic-gradient(from 40deg," + [...palette, palette[0]].map((color, index) => color + " " + Math.round(index * 360 / palette.length) + "deg").join(",") + ")" : undefined;
  return <span className={"profile-person-portrait profile-person-gradient-ring" + (gradient && active && person.profile_background_motion !== "still" ? " ring-is-flowing" : "")} style={gradient ? { backgroundImage: gradient, boxShadow: "0 0 0 1px " + palette[0] + "40,0 3px 18px -5px " + palette[0] + "55" } : undefined}><span className="profile-person-portrait-inner"><Avatar user={person} size={144} /></span></span>;
}

/** Public suggestions only; follow changes use the same authorized path as profiles. */
export default function DiscoverPeople({ profileId, active = true, layout = "deck" }) {
  const { user } = useAuth(),{ blocked } = useSafety();
  const uid = user?.id || "",scope = uid + ":" + profileId;
  const current = useRef(scope);current.current = scope;
  const locks = useRef(new Set());
  const mounted = useRef(false);
  useEffect(() => {mounted.current = true;return () => {mounted.current = false;};}, []);
  const [retry, setRetry] = useState(0),[selectedId, setSelectedId] = useState("");
  const [direction, setDirection] = useState(1),[drag, setDrag] = useState(0);
  const gesture = useRef(null);
  const [state, setState] = useState({ scope: "", people: [], loading: true, error: false });
  const [changes, setChanges] = useState({ scope: "", following: {}, busy: {}, errors: {} });
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setSelectedId("");setState((old) => ({ scope, people: old.scope === scope ? old.people : [], loading: true, error: false }));
    setChanges((old) => old.scope === scope ? old : { scope, following: {}, busy: {}, errors: {} });
    (async () => {
      try {
        const [page, follows] = await Promise.all([
        base44.entities.PublicProfile.filter({ visible: true }, { sort: "-updated_date", limit: 80, fields: ["visible", "user_id", "display_name", "full_name", "username", "avatar_url", "bio", "is_artist", "top_track_ids", "featured_track_id", "banner_url", "banner_mobile_url", "banner_use_default", "banner_video_url", "banner_gif_url", "avatar_video_url", "avatar_gif_url", "location", "pronouns", "top_tracks_label", "profile_background_mode", "profile_background_colors", "profile_background_motion", "profile_background_speed"] }),
        uid ? readAllPages((options) => base44.entities.Follow.filter({ follower_id: uid }, { sort: "-created_date", ...options })) : Promise.resolve([])]
        );
        const profiles = Array.isArray(page) ? page : page?.items;
        if (!Array.isArray(profiles)) throw Error("Invalid public profiles");
        const followed = new Set(follows.map((row) => row.following_id)),seen = new Set();
        const people = profiles.filter((person) => {
          const id = person.user_id;
          if (!id || id === uid || id === profileId || person.visible === false || blocked.has(id) || followed.has(id) || seen.has(id)) return false;
          seen.add(id);return true;
        }).map((person) => ({ ...person, id: person.user_id }));
        if (!cancelled) setState({ scope, people, loading: false, error: false });
      } catch {if (!cancelled) setState((old) => ({ ...old, scope, loading: false, error: true }));}
    })();
    return () => {cancelled = true;};
  }, [scope, uid, profileId, active, retry, blocked]);
  async function follow(person) {
    const key = scope + ":" + person.id;
    if (!uid || locks.current.has(key)) return;
    locks.current.add(key);
    const desired = !(changes.scope === scope && changes.following[person.id]);
    setChanges((old) => ({ ...old, scope, busy: { ...old.busy, [person.id]: true }, errors: { ...old.errors, [person.id]: "" } }));
    try {
      const result = await setFollowState(base44, uid, person.id, desired);
      if (mounted.current && current.current === scope) setChanges((old) => ({ ...old, following: { ...old.following, [person.id]: result.following } }));
    } catch (error) {
      if (mounted.current && current.current === scope) setChanges((old) => ({ ...old, errors: { ...old.errors, [person.id]: followError(error) } }));
    } finally {
      locks.current.delete(key);
      if (mounted.current && current.current === scope) setChanges((old) => ({ ...old, busy: { ...old.busy, [person.id]: false } }));
    }
  }
  const ready = state.scope === scope,people = ready ? rankDiscoverPeople(state.people.filter((p) => !blocked.has(p.id) && !(changes.scope === scope && changes.following[p.id])), user) : [];
  const local = changes.scope === scope ? changes : { following: {}, busy: {}, errors: {} };
  const position = Math.max(0, people.findIndex((person) => person.id === selectedId));
  const person = people[position];
  function navigate(step) {
    if (people.length < 2) return;
    setDirection(step);setSelectedId(people[(position + step + people.length) % people.length].id);setDrag(0);
  }
  function pointerDown(event) {
    if (event.pointerType !== "touch" || !event.isPrimary || event.target.closest("a,button,input,textarea")) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const start = gesture.current;if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x,dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 14) {gesture.current = null;setDrag(0);return;}
    if (Math.abs(dx) > 12) setDrag(Math.max(-90, Math.min(90, dx)));
  }
  function pointerEnd(event) {
    const start = gesture.current;gesture.current = null;setDrag(0);
    if (!start || start.id !== event.pointerId || event.type === "pointercancel") return;
    const dx = event.clientX - start.x,dy = event.clientY - start.y;
    if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate(dx < 0 ? 1 : -1);
  }
  const following = !!local.following[person?.id],busy = !!local.busy[person?.id];
  const name = person?.display_name || person?.full_name || person?.username || "PUBLIC listener";
  if (ready && !state.loading && !state.error && !people.length) return null;
  if (layout === "shelf") return <section className="profile-people-shelf" aria-label="Discover people">
    <header><div><h2>Discover People</h2><p>Find people through the music they love.</p></div><Link to="/search?type=people" aria-label="Find people" title="Find people" className="profile-people-search"><Search size={20} aria-hidden="true" /></Link></header>
    {!ready || state.loading && !people.length ? <div className="profile-people-skeleton" role="status" aria-label="Finding listeners">{[0, 1, 2, 3].map((item) => <div key={item} aria-hidden="true"><i /><span /><small /></div>)}</div> :
    state.error && !people.length ? <div className="profile-discover-status" role="status"><p>People couldn’t load.</p><button type="button" onClick={() => setRetry((n) => n + 1)}>Try again</button></div> :
    <><ScrollShelf paged className="profile-people-track" label="Suggested listeners">
      {people.slice(0, 6).map((candidate) => {
          const label = candidate.display_name || candidate.full_name || candidate.username || "PUBLIC listener";
          const isFollowing = !!local.following[candidate.id],pending = !!local.busy[candidate.id];
          return <article className="profile-person-tile" key={scope + ":" + candidate.id}>
        <Link to={"/profile/" + encodeURIComponent(candidate.id)} className="profile-person-identity" aria-label={"Open " + label + " profile"}><DiscoverAvatar person={candidate} active={active} /><strong>{candidate.username ? "@" + candidate.username.replace(/^@/, "") : label}</strong><small className="hidden">{candidate.is_artist ? "Artist" : "Listener"}</small></Link>
        {uid ? <button type="button" className="profile-discover-follow" disabled={pending || state.loading} aria-label={(isFollowing ? "Unfollow " : "Follow ") + label} aria-pressed={isFollowing} onClick={() => follow(candidate)}>{pending ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <UserCheck size={14} /> : null}{pending ? "Saving…" : isFollowing ? "Following" : "Follow"}</button> : <Link className="profile-discover-follow" to="/login">Sign in to follow</Link>}
        {local.errors[candidate.id] && <p className="profile-discover-error" role="alert">{local.errors[candidate.id]}</p>}
       </article>;
        })}
     </ScrollShelf>{state.error && <p className="profile-discover-status" role="status">Couldn’t refresh suggestions. Your current list is still here.</p>}</>}
   </section>;
  return <section className="profile-discover profile-discover-deck" aria-label="Discover people">
    <header><div><h2>Discover People</h2><p>Different lives. Shared soundtracks.</p></div></header>
    {state.error && people.length > 0 && <p className="profile-discover-status" role="status">Couldn’t refresh suggestions. Your current list is still here.</p>}
    {!ready || state.loading && !people.length ? <div className="profile-discover-loading" role="status" aria-label="Finding listeners"><div className="discover-skeleton-cover" /><div><i /><span><i /><i /></span></div></div> :
    state.error && !people.length ? <div className="profile-discover-status"><p>Couldn’t load people.</p><button type="button" onClick={() => setRetry((n) => n + 1)}>Try again</button></div> :
    <>
      <div className="discover-swipe-area" tabIndex={0} aria-label="Suggested profile. Use left and right arrows to explore." onKeyDown={(event) => {if (event.target !== event.currentTarget) return;if (event.key === "ArrowRight" || event.key === "ArrowLeft") {event.preventDefault();navigate(event.key === "ArrowRight" ? 1 : -1);}}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
       <div style={{ transform: drag ? "translateX(" + drag + "px) rotate(" + drag / 35 + "deg)" : undefined, opacity: drag ? 1 - Math.abs(drag) / 350 : 1 }} className="discover-drag-frame">
        <DiscoverProfileCard key={scope + ":" + person.id} person={person} active={active} direction={direction}>
         <div className="discover-profile-actions">
          <Link className="discover-view-profile" to={"/profile/" + encodeURIComponent(person.id)}>View profile</Link>
          {uid && <button type="button" className="profile-discover-follow" aria-label={(following ? "Unfollow " : "Follow ") + name} aria-pressed={following} disabled={busy || state.loading} onClick={() => follow(person)}>{busy ? <Loader2 size={16} className="animate-spin" /> : following ? <UserCheck size={16} /> : null}{busy ? "Saving…" : following ? "Following" : "Follow"}</button>}
         </div>
         {local.errors[person.id] && <p className="profile-discover-error" role="alert">{local.errors[person.id]}</p>}
        </DiscoverProfileCard>
       </div>
      </div>
      <footer className="discover-deck-controls">
       <button type="button" disabled={people.length < 2} onClick={() => navigate(-1)} aria-label="Previous person"><ChevronLeft size={18} /></button>
       <div role="status" aria-live="polite" aria-atomic="true"><strong>{position + 1} <span>/ {people.length}</span></strong><small className="discover-mobile-hint">Swipe to discover</small><small className="discover-desktop-hint">Find your people</small></div>
       <button type="button" disabled={people.length < 2} onClick={() => navigate(1)} aria-label="Next person"><span>Next</span><ChevronRight size={18} /></button>
      </footer>
     </>}
  </section>;
}