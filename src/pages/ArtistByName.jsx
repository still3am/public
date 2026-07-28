import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicRecords from "@/pages/PublicRecords";
import EmptyState from "@/components/EmptyState";
import { Loader2, Mic2 } from "lucide-react";

const splitNames = (str) =>
  (str || "")
    .split(/\s*(?:,|&| feat\.| ft\.| x |;)\s*/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

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
      const artists = await base44.entities.Artist.list("-updated_date", 1000).catch(() => []);
      const names = splitNames(name);
      const match = (Array.isArray(artists) ? artists : []).find((a) =>
        splitNames(a.name).some((n) => names.includes(n))
      );
      if (active) setArtist(match || null);
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
      <EmptyState
        icon={Mic2}
        title="No Public Record yet"
        description={`No artist record exists for “${name}” on PUBLIC yet.`}
      />
    );
  }
  return <PublicRecords id={artist.id} />;
}