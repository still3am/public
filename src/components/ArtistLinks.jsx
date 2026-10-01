import { Link } from "react-router-dom";
import { splitCredits } from "@/lib/artistRelations";

// Renders a combined artist credit ("Adele & Beyoncé feat. Jay-Z") as one link
// per artist, keeping the original separators so the text reads naturally.
// The split itself comes from artistRelations, so what's displayed and what the
// artist pages match can never drift apart. Names past `maxShown` collapse to
// a "+N" remainder.
export default function ArtistLinks({
  artist,
  className = "",
  linkClassName = "",
  maxShown = 2,
}) {
  const { pairs } = splitCredits(artist);
  if (!pairs.length) {
    return artist ? <span className={className}>{artist}</span> : null;
  }

  const shown = pairs.slice(0, maxShown);
  const remainder = pairs.length - shown.length;
  const out = [];

  shown.forEach((pair, i) => {
    if (i > 0) {
      out.push(<span key={`sep-${i}`}>{pairs[i - 1].after || ", "}</span>);
    }
    out.push(
      <Link
        key={`name-${i}`}
        to={`/artist?name=${encodeURIComponent(pair.name)}`}
        className={linkClassName || className}
      >
        {pair.name}
      </Link>
    );
  });

  if (remainder > 0) {
    out.push(<span key="more">, +{remainder}</span>);
  }

  return <span className={className}>{out}</span>;
}