import {usePlayer} from "@/context/PlayerContext";
import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PageHeading from "@/components/PageHeading";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import ScrollingBanner from "@/components/ScrollingBanner";
import PlayerBar from "@/components/PlayerBar";
import ResumePlaybackBanner from "@/components/ResumePlaybackBanner";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { useAuth } from "@/lib/AuthContext";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Library from "@/pages/Library";
import Profile from "@/pages/Profile";

/**
 * The mobile tab destinations. Each is mounted the first time it is opened and
 * then kept mounted: switching tabs only toggles `hidden`, so loaded lists,
 * in-page state and scroll position survive the switch.
 */
const TABS = [
  { path: "/", Page: Home, requiresAuth: false },
  { path: "/search", Page: Search, requiresAuth: false },
  { path: "/library", Page: Library, requiresAuth: true },
  { path: "/profile", Page: Profile, requiresAuth: true },
];

export default function Layout() {
  const location = useLocation();
  const reducedMotion=useReducedMotion();
  const artworkPage = /^\/(?:track\/[^/]+|playlist\/[^/]+|records\/[^/]+|artist|profile(?:\/[^/]+)?)\/?$/.test(location.pathname);
  const { user } = useAuth();
  const {currentTrack}=usePlayer();
  useScrollRestore();

  const match = TABS.find((t) => t.path === location.pathname);
  const activeTab = match && (!match.requiresAuth || user) ? match : null;

  // Tabs opened at least once stay in the tree from here on.
  const mountedTabs = useRef(new Set());
  if (activeTab) mountedTabs.current.add(activeTab.path);

  return (
    <div className={`public-app flex min-h-screen bg-background text-foreground ${currentTrack?"has-player":""}`}>
      <div aria-hidden="true" className="public-status-bar-shield" />
      <a href="#main-content" className="public-skip-link">Skip to content</a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollingBanner />
        <main id="main-content" tabIndex={-1} className={`flex-1 w-full mx-auto main-content app-content ${artworkPage ? "artwork-content" : ""}`}>
          <PageHeading />
          {TABS.map(({ path, Page, requiresAuth }) =>
          mountedTabs.current.has(path) && (!requiresAuth || user) ?
          <div key={`${path}:${requiresAuth?user?.id:"public"}`} data-page={path === "/" ? "home" : path.slice(1)} className={activeTab?.path === path ? "page-surface block public-page-enter" : "page-surface hidden"}>
              <Page ownProfileTab={path === "/profile"} />
            </div> :
          null
          )}

          <AnimatePresence mode="wait" initial={false}>
            {!activeTab &&
            <motion.div
              key={`${location.pathname}:${user?.id||"guest"}`}
              className="page-surface"
              data-page={location.pathname.split("/")[1] || "home"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion?0:0.18, ease: "easeInOut" }}>

                <Outlet />
              </motion.div>
            }
          </AnimatePresence>
        </main>
      </div>
      <ResumePlaybackBanner />
      <PlayerBar />
      <MobileTabBar />
    </div>
  );
}