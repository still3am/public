import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import MobileTopBar from "@/components/MobileTopBar";
import ScrollingBanner from "@/components/ScrollingBanner";
import PlayerBar from "@/components/PlayerBar";
import ResumePlaybackBanner from "@/components/ResumePlaybackBanner";
import { useScrollRestore } from "@/hooks/useScrollRestore";

export default function Layout() {
  const location = useLocation();
  useScrollRestore();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollingBanner />
        <MobileTopBar />
        <main className="flex-1 px-3 sm:px-4 md:px-8 lg:px-12 pt-3 pb-6 md:py-8 w-full max-w-[1600px] mx-auto main-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ResumePlaybackBanner />
      <PlayerBar />
      <MobileTabBar />
    </div>
  );
}