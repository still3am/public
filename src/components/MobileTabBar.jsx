import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Home, Clapperboard, ArrowLeft, Search, X, User, MoreHorizontal, Library as LibraryIcon } from "lucide-react";
import MobileMoreSheet from "@/components/MobileMoreSheet";

const TABS = [
{ to: "/", label: "Home", Icon: Home, end: true },
{ to: "/moments", label: "Moments", Icon: Clapperboard },
{ to: "/library", label: "Library", Icon: LibraryIcon },
{ to: "/profile", label: "Me", Icon: User }];


export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);
  const lastPage = useRef("/");
  const loc = useLocation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const onSearch = loc.pathname === "/search";
  const expanded = onSearch || searchOpen;
  const query = onSearch ? params.get("q") || "" : "";

  useEffect(() => {
    if (loc.pathname !== "/search") lastPage.current = loc.pathname + loc.search + loc.hash;
    setSearchOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    if (loc.pathname !== "/search") lastPage.current = loc.pathname + loc.search + loc.hash;
  }, [loc.pathname, loc.search, loc.hash]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      const typing = document.activeElement === inputRef.current;
      const inset = typing && viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      root.style.setProperty("--mobile-search-keyboard-offset", inset + "px");
      root.toggleAttribute("data-mobile-search-keyboard", inset > 80);
    };
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--mobile-search-keyboard-offset");
      root.removeAttribute("data-mobile-search-keyboard");
    };
  }, []);

  function handleTab(to, event) {
    if (loc.pathname === to) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else if (to !== "/" && loc.pathname.startsWith(to + "/")) {
      event.preventDefault();
      nav(to);
    }
  }
  function openSearch(event) {
    event.preventDefault();
    // Mount and focus within the tap gesture so iOS can open its keyboard.
    flushSync(() => setSearchOpen(true));
    inputRef.current?.focus({ preventScroll: true });
    if (!onSearch) {
      lastPage.current = loc.pathname + loc.search + loc.hash;
      nav("/search", { state: { searchReturnTo: lastPage.current } });
    }
  }
  function updateQuery(value) {
    const next = new URLSearchParams(onSearch ? params : undefined);
    next.delete("genre");
    if (value) next.set("q", value);else next.delete("q");
    nav({ pathname: "/search", search: next.toString() }, { replace: true, state: loc.state });
  }
  const returnTo = loc.state?.searchReturnTo?.startsWith("/") && !loc.state.searchReturnTo.startsWith("//") && !loc.state.searchReturnTo.startsWith("/search") ? loc.state.searchReturnTo : lastPage.current;
  const returnPath = returnTo.split(/[?#]/)[0];
  const ReturnIcon = returnPath === "/" ? Home : returnPath === "/library" ? LibraryIcon : returnPath.startsWith("/profile") ? User : ArrowLeft;
  const returnLabel = returnPath === "/" ? "Home" : returnPath === "/library" ? "Library" : returnPath.startsWith("/profile") ? "profile" : "previous page";
  function returnFromSearch(event) {
    event.preventDefault();
    inputRef.current?.blur();
    if (loc.state?.searchReturnTo === returnTo) nav(-1);else
    nav(returnTo, { replace: true });
  }
  const moreActive = !["/", "/search", "/moments", "/library", "/profile"].some((path) => loc.pathname === path || path !== "/" && loc.pathname.startsWith(path + "/"));
  return <>
    <nav aria-label={expanded ? "Search navigation" : "Main navigation"} className={"mobile-tab-bar md:hidden" + (expanded ? " mobile-search-expanded" : "")}>
      {expanded ? <>
        <NavLink to={returnTo} onClick={returnFromSearch} className="mobile-search-home" aria-label={"Return to " + returnLabel} title={"Return to " + returnLabel}><ReturnIcon size={25} strokeWidth={1.9} aria-hidden="true" /></NavLink>
        <form role="search" className="mobile-search-field" onSubmit={(event) => {event.preventDefault();inputRef.current?.blur();}}>
          <Search size={22} aria-hidden="true" className="shrink-0" />
          <input ref={inputRef} type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Artists, songs, people…" aria-label={params.get("type") === "people" ? "Search people by name" : "Search songs, artists, playlists, and people"} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" />
          {query && <button type="button" aria-label="Clear search" onClick={() => {updateQuery("");inputRef.current?.focus({ preventScroll: true });}}><X size={18} /></button>}
        </form>
      </> : <>
        <div className="mobile-nav-pill">
          {TABS.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} onClick={(event) => handleTab(to, event)} className={({ isActive }) => "mobile-nav-tab" + (isActive ? " is-active" : "")}>
            <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
          </NavLink>)}
          <button type="button" onClick={() => setMoreOpen(true)} className={"mobile-nav-tab" + (moreOpen || moreActive ? " is-active" : "")} aria-label="More pages" aria-haspopup="dialog" aria-expanded={moreOpen}><MoreHorizontal size={23} strokeWidth={1.9} aria-hidden="true" /></button>
        </div>
        <NavLink to="/search" onClick={openSearch} className="mobile-nav-search" aria-label="Search music and people"><Search size={26} strokeWidth={2} aria-hidden="true" /></NavLink>
      </>}
    </nav>
    {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
  </>;
}