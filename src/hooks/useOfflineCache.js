import { useContext } from "react";
import { OfflineCacheContext } from "@/context/OfflineCacheContext";

// Only reached if a consumer renders outside OfflineCacheProvider; the app
// mounts that provider at the root, so this keeps a stray render harmless.
const NOOP = {
  cachedIds: new Set(),
  records: [],
  downloading: {},
  loading: true,
  refresh: async () => {},
  isCached: () => false,
  downloadTrack: async () => false,
  removeTrack: async () => {},
  reorder: async () => {},
  clearAllCache: async () => {},
};

export function useOfflineCache() {
  const ctx = useContext(OfflineCacheContext);
  return ctx || NOOP;
}