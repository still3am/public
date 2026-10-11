import { useEffect, useRef, useState } from "react";
import { globalSearch } from "@/lib/globalSearch";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";

const DEBOUNCE_MS = 250;

/**
 * Live global search: every keystroke schedules a server query shortly after,
 * stale answers are discarded, and the previous results stay on screen while
 * the next ones are in flight.
 */
export function useGlobalSearch(query) {
  const term = query.trim();
  const [results, setResults] = useState({ tracks: [], artists: [], people: [] });
  const [searching, setSearching] = useState(false);
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
      setResults({ tracks: [], artists: [], people: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(term);
        if (id === reqId.current) setResults(res);
      } catch {
        if (id === reqId.current) setResults({ tracks: [], artists: [], people: [] });
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);

  return {
    ...results,
    searching,
    hasQuery: term.length > 0,
  };
}