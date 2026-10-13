import { Children } from "react";

/** @param {any} props */
export default function CardRail({ children }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-5 sm:px-5 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:gap-4">
      {Children.map(children, (child) =>
        child ? (
          <div className="snap-start shrink-0 w-[46vw] max-w-[210px] sm:w-[200px] md:w-auto">
            {child}
          </div>
        ) : null
      )}
    </div>
  );
}