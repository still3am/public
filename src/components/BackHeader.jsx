import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackHeader({ title, onBack, right = null }) {
  const nav = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();else
    if (window.history.length > 1) nav(-1);else
    nav("/");
  };
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 min-h-[3.5rem] py-3 mb-4 bg-background/85 backdrop-blur-md top-bar-safe">
      <button
        onClick={handleBack}
        className="tap-target inline-flex items-center justify-center rounded-full hover:bg-foreground/[0.06] hidden"
        aria-label="Go back">
        
        <ArrowLeft size={22} className="hidden" />
      </button>
      <h1 className="text-lg font-extrabold tracking-tight truncate flex-1 min-w-0">
        {title}
      </h1>
      {right}
    </div>);

}