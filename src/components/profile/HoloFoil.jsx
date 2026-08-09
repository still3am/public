import { useEffect, useRef } from "react";
import {
  Follow,
  Kick,
  Orientation,
  applyFoil,
  applyFrame,
  fromPointer,
  getFoil,
} from "@/lib/holoEngine";

/**
 * useHoloTilt — attaches pointer + device-orientation tracking to a card
 * element and writes per-frame CSS variables that drive the foil layers.
 *
 * Returns a ref to attach to the card container. The foil layers (rendered by
 * <HoloFoil />) read the variables this hook writes.
 *
 * @param {object} opts
 * @param {string} opts.foilKey   — which material to mount (holo, glitter, cosmos, brushed)
 * @param {number} opts.maxTilt  — max rotation in degrees (smaller = subtler for large cards)
 */
export function useHoloTilt({ foilKey = "holo", maxTilt = 7 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const foil = getFoil(foilKey);
    applyFoil(host, foil);

    const tilt = new Follow(0.16);
    const sheet = new Follow(0.09);
    const kick = new Kick();
    const orient = new Orientation();
    const t0 = performance.now();

    let raf = 0;
    let running = false;
    let onScreen = false;
    let idle = 0;
    let touched = false;
    let release = 1;
    let handoff = { x: 0, y: 0 };
    let grab = 1;
    let grabFrom = { x: 0, y: 0 };
    let aim = { x: 0, y: 0 };

    const frame = () => {
      raf = 0;

      if (!touched) {
        idle += 0.0042;
        const drift = { x: Math.sin(idle) * 0.24, y: Math.cos(idle * 0.73) * 0.18 };
        release = Math.min(1, release + 0.016);
        const k = release * release;
        tilt.target = {
          x: handoff.x + (drift.x - handoff.x) * k,
          y: handoff.y + (drift.y - handoff.y) * k,
        };
      } else {
        grab = Math.min(1, grab + 0.018);
        const k = grab * grab;
        tilt.target = {
          x: grabFrom.x + (aim.x - grabFrom.x) * k,
          y: grabFrom.y + (aim.y - grabFrom.y) * k,
        };
      }

      const k = kick.step();
      if (k.x || k.y) {
        tilt.target = { x: tilt.target.x + k.x, y: tilt.target.y + k.y };
      }

      tilt.step();
      sheet.target = tilt.value;
      sheet.step();

      applyFrame(host, tilt.value, sheet.value, foil, foil, {
        speed: sheet.speed,
        velocity: sheet.velocity,
        time: (performance.now() - t0) / 1000,
      }, maxTilt);

      if (
        running &&
        (!touched || release < 1 || grab < 1 || kick.active || !tilt.settled || !sheet.settled)
      ) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (!running || raf) return;
      raf = requestAnimationFrame(frame);
    };

    const onPointer = (e) => {
      aim = fromPointer(host.getBoundingClientRect(), e.clientX, e.clientY);
      if (!touched) {
        touched = true;
        grabFrom = { x: tilt.value.x, y: tilt.value.y };
        grab = 0;
      }
      release = 0;
      wake();
    };

    const onLeave = () => {
      touched = false;
      handoff = { x: tilt.value.x, y: tilt.value.y };
      release = 0;
      grab = 1;
      kick.fire(tilt.velocity);
      wake();
    };

    const onOrient = (e) => {
      const v = orient.read(e);
      if (!v) return;
      touched = true;
      tilt.target = v;
      wake();
    };

    const io = new IntersectionObserver(
      (es) => {
        onScreen = es.some((e) => e.isIntersecting);
        const should = onScreen;
        if (should === running) return;
        running = should;
        if (should) wake();
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      },
      { rootMargin: "200px" }
    );
    io.observe(host);

    host.addEventListener("pointermove", onPointer);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onOrient);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [foilKey, maxTilt]);

  return ref;
}

/**
 * HoloFoil — the foil layer stack. Renders three generic background layers,
 * a glare, a sheen, and a velocity streak, all driven by CSS variables that
 * useHoloTilt writes on the parent card. Mount inside a positioned container
 * with `overflow-hidden` and `border-radius`.
 */
export default function HoloFoil() {
  return (
    <div className="holo-foil-stack" aria-hidden="true">
      <div className="holo-foil holo-foil-a" />
      <div className="holo-foil holo-foil-b" />
      <div className="holo-foil holo-foil-c" />
      <div className="holo-smear" />
      <div className="holo-spot" />
      <div className="holo-noise" />
      <div className="holo-glare" />
      <div className="holo-sheen" />
    </div>
  );
}