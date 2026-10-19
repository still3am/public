/** @param {any} props */
export default function PlayPauseButton({ isPlaying, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      className="w-16 h-16 xl:w-20 xl:h-20 shrink-0 rounded-full bg-transparent text-white grid place-items-center hover:bg-white/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-[transform,background-color] duration-150 motion-reduce:transition-none">
      <svg width="36" height="36" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
        {isPlaying ? <><rect x="7" y="4" width="6" height="24" rx="1.8"/><rect x="19" y="4" width="6" height="24" rx="1.8"/></> : <path d="M9 5.2c0-1.4 1.5-2.2 2.7-1.5l17 10.8c1.1.7 1.1 2.3 0 3l-17 10.8C10.5 29 9 28.2 9 26.8V5.2Z"/>}
      </svg>
    </button>
  );
}