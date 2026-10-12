import {readAllPages} from '@/lib/readPages';
import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// The signed-in user's own playlists. Shared by the Library and the uploads page
// so "Add to playlist" offers the same list on both.
export function useMyPlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState(null);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([]);
      return;
    }
    try {
      const rows=await readAllPages(opts=>base44.entities.Playlist.filter({creator_id:user.id},{sort:"-created_date",...opts}));
      setPlaylists(rows || []);
    } catch {
      setPlaylists([]);
    }
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { playlists, reload };
}