import { createContext } from "react";
import { useOfflineCacheStore } from "@/hooks/offlineCacheStore";

export const OfflineCacheContext = createContext(null);

/**
 * Mounts the offline-download store ONCE for the whole app and shares it.
 *
 * Without this, every track menu on the page mounted its own copy — one storage
 * read, one cloud-list request and one live subscription per song — so a long
 * Library or discovery list hammered the app's data API until nothing loaded.
 */
export function OfflineCacheProvider({ children }) {
  const cache = useOfflineCacheStore();
  return (
    <OfflineCacheContext.Provider value={cache}>
      {children}
    </OfflineCacheContext.Provider>
  );
}