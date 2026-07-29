export default function VinylSleeve({ genre, count, cover, index, active, onClick }) {
  const tilt = 12 - Math.min(index, 8) * 0.8;
  return (
    <button
      onClick={onClick}
      style={{
        transform: `perspective(900px) rotateX(${active ? 0 : tilt}deg) translateZ(0) scale(${active ? 1.02 : 1})`,
        zIndex: 100 - index
      }}
      className="group relative block w-full text-left rounded-md overflow-hidden border border-white/10 bg-neutral-900 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out will-change-transform hover:z-[200] focus-visible:z-[200] active:scale-[0.99]"
      aria-label={`Browse ${genre}`}>
      
      <div className="relative h-16 sm:h-20 w-full overflow-hidden">
        {cover ?
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" /> :

        <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black" />
        }
        <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
        <div className="relative h-full flex flex-col justify-center px-3.5">
          <span className="text-[13px] sm:text-sm font-extrabold text-white tracking-tight truncate">
            {genre}
          </span>
          

          
        </div>
      </div>
    </button>);

}