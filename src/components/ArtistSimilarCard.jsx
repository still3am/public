import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mic2 } from "lucide-react";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useCoverPalette } from "@/hooks/useCoverPalette";

// A similar-artist card tinted with the artist's own artwork colour,
// so a card without a bright portrait never reads as empty.
export default function ArtistSimilarCard({ artist }) {
  const url = useCoverUrl(artist.image);
  const [failed, setFailed] = useState(false);
  const { colors } = useCoverPalette(url);
  useEffect(() => setFailed(false), [url]);
  const tone = colors[0];

  return (
    <Link
      className="artist-similar-card"
      to={"/records/" + encodeURIComponent(artist.id)}
      style={tone ? {
        "--similar-tone-a": colors[0],
        "--similar-tone-b": colors[1] || colors[0],
        "--similar-tone-c": colors[2] || colors[1] || colors[0],
      } : undefined}
    >
      <div className="artist-similar-portrait">
        {url && !failed ? (
          <img src={url} alt="" className="artist-similar-image" onError={() => setFailed(true)} />
        ) : (
          <div aria-hidden="true" className="artist-similar-image artist-art-fallback">
            <Mic2 size={36} />
          </div>
        )}
      </div>
      <span>{artist.name}</span>
      {artist.genre && <small className="artist-similar-genre">{artist.genre}</small>}
    </Link>
  );
}