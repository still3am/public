import { Link } from "react-router-dom";

// Splits a combined artist string (e.g. "Adele & Beyoncé feat. Jay-Z") into
// individual names, rendering EACH as its own link to that artist's separate
// Public Record page. Original separators between names are preserved as
// plain text. When there are more than `maxShown` artists, only the first
// `maxShown` are linked and a "+N" remainder is shown as plain text.
export default function ArtistLinks({
  artist,
  className = "",
  linkClassName = "",
  maxShown = 2,
}) {
  if (!artist) return null;

  // Split keeping the separators so the display reads naturally between links.
  const tokens = String(artist)
    .split(/(\s*(?:,|&| feat\.| ft\.| x |;)\s*)/i)
    .map((t) => t.trim())
    .filter(Boolean);

  // tokens alternate: name, separator, name, separator, ...
  const parts = [];
  const seps = [];
  tokens.forEach((t, i) => {
    if (i % 2 === 0) parts.push(t);
    else seps.push(t);
  });

  if (parts.length === 0) return <span className={className}>{artist}</span>;

  const shown = parts.slice(0, maxShown);
  const remainder = parts.length - shown.length;
  const out = [];

  shown.forEach((name, i) => {
    if (i > 0) out.push(<span key={`sep-${i}`}>{seps[i - 1] || ", "}</span>);
    out.push(
      <Link
        key={`name-${i}`}
        to={`/artist?name=${encodeURIComponent(name)}`}
        className={linkClassName || className}
      >
        {name}
      </Link>
    );
  });

  if (remainder > 0) {
    out.push(<span key="more">, +{remainder}</span>);
  }

  return <span className={className}>{out}</span>;
}