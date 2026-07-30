import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicRecords from "@/pages/PublicRecords";
import { Loader2, Mic2 } from "lucide-react";

// Normalize an artist name for exact comparison: trim + collapse internal
// whitespace + lowercase. Using an EXACT match (not fuzzy split-name) is what
// guarantees each distinct artist gets its own separate Public Record page —
// e.g. "Adele" never lands on a combined "Adele & Beyoncé" record.
const normalize = (str) =>
  (str || "").trim().replace(/\s+/g, " ").toLowerCase();

export default function ArtistByName() {
  const [params] = useSearchParams();
  const name = params.get("name") || "";
  const [artist, setArtist] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let active = true;
    (async () => {
      if (!name) {
        if (active) setArtist(null);
        return;
      }
      const target = normalize(name);
      if (!target) {
        if (active) setArtist(null);
        return;
      }
      const artists = await base44.entities.Artist.list("-updated_date", 1000).catch(() => []);
      const match = (Array.isArray(artists) ? artists : []).find(
        (a) => normalize(a.name) === target
      );
      if (!active) return;
      if (match) {
        setArtist(match);
        return;
      }
      // No record for this exact artist yet — give them their own page.
      try {
        const created = await base44.entities.Artist.create({ name: name.trim() });
        if (active) setArtist(created);
      } catch {
        if (active) setArtist(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [name]);

  if (artist === undefined) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!artist) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
          <Mic2 size={28} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1">No Public Record</h2>
        <p className="text-sm text-foreground/50 mb-5">
          We couldn’t open a Public Record for “{name}”.
        </p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
        >
          Search artists
        </Link>
      </div>
    );
  }
  return <PublicRecords id={artist.id} />;
}