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
  const [a, b, c] = [colors[0], colors[1] || colors[0], colors[2] || colors[1] || colors[0]];
  const tint = a ? {
    backgroundColor: c,
    backgroundImage: `radial-gradient(60% 64% at 22% 16%, ${a} 0%, transparent 68%), radial-gradient(58% 62% at 82% 34%, ${b} 0%, transparent 70%), radial-gradient(64% 68% at 46% 94%, ${c} 0%, transparent 72%)`,
  } : undefined;

  return (
    <Link className="artist-similar-card" to={"/records/" + encodeURIComponent(artist.id)}>
      {tint && <span aria-hidden="true" className="artist-similar-tint" style={tint} />}
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