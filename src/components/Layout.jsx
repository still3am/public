import {useContentClearance} from "@/hooks/useContentClearance";
import {usePlayer} from "@/context/PlayerContext";
import "@/components/profile/navigation-colors.css";
import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";
import DesktopHeader from "@/components/DesktopHeader";
import MomentsChrome from "@/components/moments/MomentsChrome";
import FriendsFamilyProfileBadge from "@/components/profile/FriendsFamilyProfileBadge";

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
import NewMemberOnboarding from "@/components/NewMemberOnboarding";

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
  const artworkPage = /^\/(?:track\/[^/]+|album\/[^/]+|playlist\/[^/]+|mix\/[^/]+|recap\/[^/]+(?:\/[^/]+)?|records\/[^/]+|artist|profile(?:\/[^/]+)?)\/?$/.test(location.pathname);
  const { user } = useAuth();
  const navigationColor = /^#[0-9a-f]{6}$/i.test(user?.navigation_color || "") ? user.navigation_color : "";
  const rgb = navigationColor ? [1,3,5].map(index => parseInt(navigationColor.slice(index,index+2),16)/255) : [];
  const luminance = rgb.map(value => value <= .04045 ? value / 12.92 : ((value+.055)/1.055)**2.4)
    .reduce((sum,value,index) => sum + value * [.2126,.7152,.0722][index],0);
  const momentsRoute = (user?.role === "admin" || user?.friends_family_badge === true) && !user?.disabled && !user?.is_blocked && /^\/moments(?:\/[^/]+)?\/?$/.test(location.pathname);
  const {currentTrack}=usePlayer();
  useScrollRestore();
  useContentClearance(currentTrack?.id,location.pathname);

  const match = TABS.find((t) => t.path === location.pathname);
  const activeTab = match && (!match.requiresAuth || user) ? match : null;

  // Tabs opened at least once stay in the tree from here on.
  const mountedTabs = useRef(new Set());
  if (activeTab) mountedTabs.current.add(activeTab.path);

  return (
    <div data-navigation-color={navigationColor || undefined} style={navigationColor ? {"--navigation-accent":navigationColor,"--navigation-ink":luminance>.179?"#000":"#fff"} : undefined} className={`public-app flex min-h-screen bg-background text-foreground ${currentTrack?"has-player":""} ${momentsRoute?"moments-route":""}`}>
      <div aria-hidden="true" className="public-status-bar-shield" />
      <a href="#main-content" className="public-skip-link">Skip to content</a>
      <Sidebar />
      <div className="desktop-workspace flex-1 flex flex-col min-w-0">
        <ScrollingBanner />
        <DesktopHeader />
        <main id="main-content" tabIndex={-1} className={`flex-1 w-full mx-auto main-content app-content ${artworkPage ? "artwork-content" : ""} ${/^\/(?:mix\/[^/]+|recap\/[^/]+(?:\/[^/]+)?)\/?$/.test(location.pathname) ? "mix-content" : ""}`}>

          {TABS.map(({ path, Page, requiresAuth }) =>
          mountedTabs.current.has(path) && (!requiresAuth || user) ?
          <div key={`${path}:${requiresAuth?user?.id:"public"}`} data-page={path === "/" ? "home" : path.slice(1)} className={activeTab?.path === path ? "page-surface block public-page-enter" : "page-surface hidden"}>
              <ErrorBoundary scope="page" resetKey={`${user?.id||"guest"}:${activeTab?.path===path?location.key:"inactive"}`}><Page ownProfileTab={path === "/profile"} /></ErrorBoundary>
            </div> :
          null
          )}

          {!activeTab && <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${location.pathname}:${user?.id||"guest"}`}
              className="page-surface"
              data-page={location.pathname.split("/")[1] || "home"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion?0:0.18, ease: "easeInOut" }}>

                <ErrorBoundary scope="page" resetKey={`${location.pathname}:${location.search}:${user?.id||"guest"}`}><Outlet /></ErrorBoundary>
              </motion.div>
          </AnimatePresence>}
        </main>
      </div>
      {momentsRoute && <MomentsChrome key={location.pathname} />}
      {/^\/profile(?:\/[^/]+)?\/?$/.test(location.pathname) && <FriendsFamilyProfileBadge key={location.pathname} />}
      <ResumePlaybackBanner />
      <PlayerBar />
      <MobileTabBar />
      <NewMemberOnboarding/>
    </div>
  );
}