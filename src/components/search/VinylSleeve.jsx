export default function VinylSleeve({ genre, count, cover, index, active, onClick }) {
  const tilt = 12 - Math.min(index, 8) * 0.8;
  return (
    <button
      onClick={onClick}
      style={{
        transform: `perspective(900px) rotateX(${active ? 0 : tilt}deg) translateZ(0) scale(${active ? 1.02 : 1})`,
        zIndex: 100 - index
      }}
      className="group relative block w-full text-left rounded-md overflow-hidden border border-black/10 bg-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out will-change-transform hover:z-[200] focus-visible:z-[200] active:scale-[0.99]"
      aria-label={`Browse ${genre}`}>
      
      <div className="relative h-16 sm:h-20 w-full overflow-hidden">
        {cover ?
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" /> :

        <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/40 to-white/60" />
        <div className="absolute inset-x-0 top-0 h-px bg-black/10" />
        <div className="relative h-full flex flex-col justify-center px-3.5">
          <span className="text-[13px] sm:text-sm font-extrabold text-neutral-900 tracking-tight truncate">
            {genre}
          </span>
          

          
        </div>
      </div>
    </button>);

}