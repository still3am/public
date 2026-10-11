import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  const { user } = useAuth();
  useScrollRestore();

  const match = TABS.find((t) => t.path === location.pathname);
  const activeTab = match && (!match.requiresAuth || user) ? match : null;

  // Tabs opened at least once stay in the tree from here on.
  const mountedTabs = useRef(new Set());
  if (activeTab) mountedTabs.current.add(activeTab.path);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollingBanner />
        <main className="flex-1 px-4 sm:px-5 md:px-8 lg:px-12 pt-4 pb-6 md:py-8 w-full max-w-[1600px] mx-auto main-content">
          {TABS.map(({ path, Page }) =>
          mountedTabs.current.has(path) ?
          <div key={path} className={activeTab?.path === path ? "block" : "hidden"}>
              <Page />
            </div> :
          null
          )}

          <AnimatePresence mode="wait" initial={false}>
            {!activeTab &&
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}>

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