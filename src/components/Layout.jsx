import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import MobileTopBar from "@/components/MobileTopBar";
import PlayerBar from "@/components/PlayerBar";
import { useScrollRestore } from "@/hooks/useScrollRestore";

export default function Layout() {
  const location = useLocation();
  useScrollRestore();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 px-4 md:px-8 lg:px-12 py-6 md:py-8 w-full max-w-[1600px] mx-auto main-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <PlayerBar />
      <MobileTabBar />
    </div>
  );
}