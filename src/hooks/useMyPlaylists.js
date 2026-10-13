import {readAllPages} from '@/lib/readPages';
import { useCallback, useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// The signed-in user's own playlists. Shared by the Library and the uploads page
// so "Add to playlist" offers the same list on both.
export function useMyPlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState(null);
  const [error,setError]=useState(false);
  const version=useRef(0);

  const reload = useCallback(async () => {
    const request=++version.current;setError(false);
    if (!user?.id) {
      setPlaylists([]);
      return;
    }
    try {
      const rows=await readAllPages(opts=>base44.entities.Playlist.filter({creator_id:user.id},{sort:"-created_date",...opts}));
      if(request===version.current)setPlaylists(rows || []);
    } catch {
      if(request===version.current)setError(true);
    }
  }, [user?.id]);

  useEffect(() => {
    setPlaylists(null);reload();window.addEventListener("playlists:changed",reload);return()=>{version.current++;window.removeEventListener("playlists:changed",reload);};
  }, [reload]);

  return { playlists, reload,error };
}