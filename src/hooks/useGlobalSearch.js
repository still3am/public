import { useCallback, useEffect, useRef, useState } from "react";
import { globalSearch } from "@/lib/globalSearch";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";

const DEBOUNCE_MS = 250;
const EMPTY = { tracks: [], artists: [], people: [] };

/**
 * Live global search: every keystroke schedules a server query shortly after,
 * stale answers are discarded, and the previous results stay on screen while
 * the next ones are in flight. `refresh` re-runs the current term on demand
 * (pull to refresh) without waiting for another keystroke.
 */
export function useGlobalSearch(query) {
  const term = query.trim();
  const [results, setResults] = useState(EMPTY);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reqId = useRef(0);

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
      setFailed(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(term);
        if (id === reqId.current) {
          setResults(res);
          setFailed(!!res.failed);
        }
      } catch {
        if (id === reqId.current) {
          setResults(EMPTY);
          setFailed(true);
        }
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return {
    ...results,
    searching,
    failed,
    hasQuery: term.length > 0,
    refresh,
  };
}