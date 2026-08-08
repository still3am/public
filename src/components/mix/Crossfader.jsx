/**
 * Equal-power crossfader. 0 = full Deck A, 1 = full Deck B, 0.5 = both blended
 * at ~70% (no loudness dip in the middle).
 */
export default function Crossfader({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-muted-foreground">
        <span>DECK A</span>
        <span className="text-foreground/40">CROSSFADER</span>
        <span>DECK B</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 accent-foreground cursor-pointer"
        aria-label="Crossfader"
      />
    </div>
  );
}