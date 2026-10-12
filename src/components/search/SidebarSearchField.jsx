import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";

/**
 * The desktop sidebar's search bar. It writes the term into the Search page's
 * ?q= parameter, so it *is* the search bar for that page: results update live
 * from anywhere in the app, and clearing it returns to genre browsing.
 */
/** @param {any} props */
export default function SidebarSearchField({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const onSearchPage = location.pathname === "/search";
  const urlQ = searchParams.get("q") || "";
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const commit = (next) => {
    setValue(next);
    if (!onSearchPage) {
      navigate(`/search${next ? `?q=${encodeURIComponent(next)}` : ""}`);
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (next) params.set("q", next);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  };

  // Tapping the field opens the search page straight away, so the genre crates
  // are there to browse before anything is typed.
  const handleFocus = () => {
    if (!onSearchPage) navigate("/search");
  };

  // Collapsed rail: the field is just the search icon link.
  if (collapsed) {
    return (
      <NavLink
        to="/search"
        title="Search"
        className="tap-target flex items-center justify-center rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
      >
        <SearchIcon size={18} className="shrink-0" />
      </NavLink>
    );
  }

  return (
    <div className="relative flex items-center">
      <SearchIcon size={16} className="absolute left-3 text-foreground/40 pointer-events-none" />
      <input
        value={value}
        onFocus={handleFocus}
        onChange={(e) => commit(e.target.value)}
        placeholder="Search…"
        aria-label="Search tracks, artists, people"
        className="w-full pl-9 pr-9 py-2 rounded-lg bg-foreground/[0.05] text-sm font-medium placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition"
      />
      {value && (
        <button
          onClick={() => commit("")}
          className="absolute right-2.5 p-1 rounded-full hover:bg-foreground/10 text-foreground/40"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}