import { useCallback, useEffect, useRef, useState } from "react";
import { globalSearch,peekSearch } from "@/lib/globalSearch";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";

// Long enough that a fast typist fires one server search per pause instead of
// one per character — each search scans tracks and artists server-side.
const DEBOUNCE_MS = 400;
const EMPTY = { tracks: [], artists: [], people: [], playlists: [] };

/**
 * Live global search: every keystroke schedules a server query shortly after,
 * stale answers are discarded, and the previous results stay on screen while
 * the next ones are in flight. `refresh` re-runs the current term on demand
 * (pull to refresh) without waiting for another keystroke.
 */
export function useGlobalSearch(query,scope="all") {
  const term = query.trim();
  const [results, setResults] = useState(()=>peekSearch(term,scope)||EMPTY);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [peopleFailed,setPeopleFailed]=useState(false);
  const [nonce, setNonce] = useState(0);
  const reqId = useRef(0);
  const forceFresh = useRef(false);

  useUnpublishedSync((id) => {
    setResults((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== id),
    }));
  });

  useEffect(() => {
    if (!term) {
      reqId.current += 1;
      setResults(EMPTY);
      setFailed(false);setPeopleFailed(false);
      setSearching(false);
      return;
    }

    const cached=peekSearch(term,scope);if(cached&&!forceFresh.current)setResults(cached);
    setSearching(true);
    const id = ++reqId.current;
    // An explicit refresh must bypass the short-lived result reuse below.
    const fresh = forceFresh.current;
    forceFresh.current = false;
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(term, { fresh,scope });
        if (id === reqId.current) {
          setResults(prev=>({...res,tracks:res.failed?prev.tracks:res.tracks,people:res.peopleFailed?prev.people:res.people}));
          setPeopleFailed(!!res.peopleFailed);
          setFailed(!!res.failed);
        }
      } catch {
        if (id === reqId.current) {
          setFailed(true);setPeopleFailed(true);
        }
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {clearTimeout(timer);if(reqId.current===id)reqId.current+=1;};
  }, [term, nonce,scope]);

  const refresh = useCallback(() => {
    forceFresh.current = true;
    setNonce((n) => n + 1);
  }, []);

  useEffect(()=>{const changed=()=>{reqId.current+=1;setResults(EMPTY);refresh();};window.addEventListener("catalog:invalidate",changed);window.addEventListener("account:cleared",changed);return()=>{window.removeEventListener("catalog:invalidate",changed);window.removeEventListener("account:cleared",changed);};},[refresh]);

  return {
    ...results,
    searching,
    failed,
    peopleFailed,
    hasQuery: term.length > 0,
    refresh,
  };
}