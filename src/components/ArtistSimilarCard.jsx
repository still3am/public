import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mic2 } from "lucide-react";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useColorPalette } from "@/hooks/useColorPalette";
import MotionGradient from "@/components/MotionGradient";
import { Image } from "@/components/ui/image";

// Use the same flowing surface as profiles, including its neutral fallback.
export default function ArtistSimilarCard({ artist }) {
  const url = useCoverUrl(artist.image);
  const [failed, setFailed] = useState(false);
  const colors = useColorPalette(url, true);
  useEffect(() => setFailed(false), [url]);

  return (
    <Link className="artist-similar-card" to={"/records/" + encodeURIComponent(artist.id)}>
      <MotionGradient className="artist-similar-gradient" colors={colors} speed={0.65} pauseWhenCovered />
      <div className="artist-similar-portrait">
        {url && !failed ? (
          <Image src={url} alt="" className="artist-similar-image" onError={() => setFailed(true)} />
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