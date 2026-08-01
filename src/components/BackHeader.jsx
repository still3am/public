import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackHeader({ title, onBack, right = null }) {
  const nav = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();else
    if (window.history.length > 1) nav(-1);else
    nav("/");
  };
  return null;














}