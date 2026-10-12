import { useEffect, useRef, useState } from "react";

const STEP = 120;

/**
 * Renders a long list in chunks as the reader scrolls. The full set is already
 * loaded — this only grows the DOM gradually, so a catalogue of thousands of
 * tracks stays smooth instead of mounting every card at once.
 */
/** @param {any} props */
export default function IncrementalList({ items, renderItem, className }) {
  const [shown, setShown] = useState(STEP);
  const sentinel = useRef(null);
  const total = items.length;

  useEffect(() => {
    if (shown >= total || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((n) => n + STEP);
      },
      { rootMargin: "1200px" }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [shown, total]);

  return (
    <>
      <div className={className}>{items.slice(0, shown).map(renderItem)}</div>
      {shown < total && <div ref={sentinel} aria-hidden className="h-px" />}
    </>
  );
}