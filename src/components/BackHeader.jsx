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
      





      
      

      
      {right}
    </div>);

}