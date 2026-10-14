import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import Avatar from "@/components/Avatar";
import ArtistRow from "@/components/search/ArtistRow";
import PlaylistCard from "@/components/playlist/PlaylistCard";

/** @param {any} props */
function SectionTitle({ children, count }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/60 mb-2 px-1 hidden">
      {children}
      {count > 0 && <span className="text-xs font-semibold text-foreground/40">{count}</span>}
    </h3>);

}

/** @param {any} props */
export default function SearchResults({ tracks = [], artists = [], people = [], playlists = [], dimmed }) {
  return (
    <div className={`space-y-8 transition-opacity ${dimmed ? "opacity-60" : "opacity-100"}`}>
      {artists.length > 0 &&
      <div>
          <SectionTitle count={artists.length}>Artists</SectionTitle>
          <div className="space-y-1">
            {artists.map((a) =>
          <ArtistRow key={a.id} artist={a} />
          )}
          </div>
        </div>
      }

      {people.length > 0 &&
      <div>
          <SectionTitle count={people.length}>
            <Users size={14} /> People
          </SectionTitle>
          <div className="space-y-1">
            {people.map((u) =>
          <Link
            key={u.id}
            to={`/profile/${u.id}`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition">
            
                <Avatar user={u} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {u.display_name || u.full_name || "Unnamed"}
                  </div>
                  {(u.bio || u.location) &&
              <div className="text-xs text-foreground/50 truncate">
                      {u.bio || u.location}
                    </div>
              }
                </div>
              </Link>
          )}
          </div>
        </div>
      }

      {playlists.length > 0 &&
      <div>
          <SectionTitle count={playlists.length}>Playlists</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {playlists.map((pl) =>
          <PlaylistCard key={pl.id} playlist={pl} />
          )}
          </div>
        </div>
      }

      {tracks.length > 0 &&
      <div>
          <SectionTitle count={tracks.length}>Tracks</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {tracks.map((t) =>
          <TrackCard key={t.id} track={t} queue={tracks} />
          )}
          </div>
        </div>
      }
    </div>);

}