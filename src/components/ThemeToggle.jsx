import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle({ className = "", withLabel = true, labelClassName = "" }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 overflow-hidden whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition w-full ${
        dark
          ? "bg-foreground/[0.06] text-foreground"
          : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
      } ${className}`}
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
      {withLabel && <span className={labelClassName}>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}