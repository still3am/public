import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import MobileTopBar from "@/components/MobileTopBar";
import PlayerBar from "@/components/PlayerBar";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 px-4 md:px-8 py-6 pb-44 md:pb-32 w-full max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
      <MobileTabBar />
    </div>
  );
}