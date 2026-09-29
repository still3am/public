import { useBannerMessages } from "@/hooks/useBannerMessages";

function MarqueeItem({ text }) {
  return (
    <span className="px-6 text-[11px] font-semibold uppercase tracking-[0.25em]">
      {text}
      
    </span>);

}

export default function ScrollingBanner() {
  const { messages } = useBannerMessages();

  return null;











}