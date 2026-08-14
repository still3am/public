// Splits a combined artist string (e.g. "Adele & Beyoncé feat. Jay-Z") into
// individual names, rendering EACH as its own styled span.  Original
// separators between names are preserved as plain text.  When there are
// more than `maxShown` artists, only the first `maxShown` are shown and a
// "+N" remainder is appended.
export default function ArtistLinks({
  artist,
  className = "",
  linkClassName = "",
  maxShown = 2,
}) {
  if (!artist) return null;

  const tokens = String(artist)
    .split(/(\s*(?:,|&| feat\.| ft\.| x |;)\s*)/i)
    .map((t) => t.trim())
    .filter(Boolean);

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
      <span key={`name-${i}`} className={linkClassName || className}>
        {name}
      </span>
    );
  });

  if (remainder > 0) {
    out.push(<span key="more">, +{remainder}</span>);
  }

  return <span className={className}>{out}</span>;
}