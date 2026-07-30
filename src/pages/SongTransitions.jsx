import { ArrowLeft, Check, Wand2, GitMerge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTransitions } from "@/hooks/useTransitions";
import {
  TRANSITION_MODES,
  CROSSFADE_MIN,
  CROSSFADE_MAX,
} from "@/lib/transitions";

// iOS Apple-Music-style "Song Transitions" screen. Deliberately black on
// white so customers recognise it instantly, regardless of app theme.

function OptionTile({ active, onClick, locked, icon: Icon, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-white/5 disabled:opacity-50 transition">
      <div className="shrink-0 w-9 h-9 rounded-[7px] bg-[#8E8E93]/15 grid place-items-center">
        <Icon size={17} className="text-[#8E8E93]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-white">{title}</span>
          {locked && (
            <span className="text-[9px] font-bold tracking-wide uppercase text-black bg-white/80 rounded px-1 py-0.5">
              Premium
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#A0A0A0] leading-snug mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="shrink-0">
        {locked ? null : active ? (
          <Check size={18} className="text-[#0A84FF]" strokeWidth={3} />
        ) : (
          <div className="w-[18px] h-[18px] rounded-full border border-white/15" />
        )}
      </div>
    </button>
  );
}

function Track({ on }) {
  return (
    <div className="relative h-1 w-full rounded-full bg-[#2C2C2E]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[#0A84FF] transition-[width] duration-150"
        style={{ width: `${on ? 42 : 4}%` }}
      />
    </div>
  );
}

function CrossfadeSlider({ value, disabled, onChange }) {
  const pct =
    ((value - CROSSFADE_MIN) / (CROSSFADE_MAX - CROSSFADE_MIN)) * 100;
  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
        <div className="text-sm font-semibold text-white mb-4">
          {value} seconds
        </div>
        <div className="relative">
          <div className="relative h-1.5 rounded-full bg-[#2C2C2E]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#0A84FF]"
              style={{ width: `${disabled ? 0 : pct}%` }}
            />
          </div>
          <input
            type="range"
            min={CROSSFADE_MIN}
            max={CROSSFADE_MAX}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md"
            style={{ left: `calc(${disabled ? 0 : pct}% - 12px)` }}
          />
        </div>
        <div className="flex justify-between mt-4 text-[11px] text-[#A0A0A0]">
          <span>1s</span>
          <span>12s</span>
        </div>
      </div>
    </div>
  );
}

export default function SongTransitions() {
  const nav = useNavigate();
  const { user } = useAuth();
  const t = useTransitions();
  const isAdmin = !!user && user.role === "admin";

  const back = () =>
    window.history.length > 1 ? nav(-1) : nav("/profile");

  const masterOn =
    t.mode !== TRANSITION_MODES.OFF && (t.isCrossfade || (t.isAutoMix && isAdmin));

  const toggleMaster = () => {
    t.setMode(masterOn ? TRANSITION_MODES.OFF : TRANSITION_MODES.CROSSFADE);
  };

  const selectAutoMix = () => {
    if (!isAdmin) return;
    t.setMode(TRANSITION_MODES.AUTOMIX);
  };
  const selectCrossfade = () => t.setMode(TRANSITION_MODES.CROSSFADE);

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col text-white">
      {/* Top bar */}
      <div className="top-bar-safe flex items-center px-3 pt-2 pb-3 shrink-0">
        <button
          onClick={back}
          className="tap-target -ml-1 inline-flex items-center gap-1 text-[#0A84FF] font-medium"
          aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold truncate px-2">
          Song Transitions
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-16 space-y-7">
        {/* Master toggle */}
        <section>
          <div className="rounded-2xl bg-[#1C1C1E] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">Song Transitions</span>
              <button
                onClick={toggleMaster}
                role="switch"
                aria-checked={masterOn}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${
                  masterOn ? "bg-[#34C759]" : "bg-[#39393D]"
                }`}>
                <span
                  className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform ${
                    masterOn ? "translate-x-[20px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[13px] text-[#A0A0A0] leading-snug mt-2">
              Beginnings and endings of songs blend together seamlessly. Albums
              and some genres will still play without transitions.
            </p>
          </div>
        </section>

        {/* Transition style */}
        <section>
          <h2 className="text-[13px] font-medium text-[#A0A0A0] px-4 mb-2">
            Transition Style
          </h2>
          <div className="rounded-2xl bg-[#1C1C1E] overflow-hidden divide-y divide-white/5">
            <OptionTile
              icon={Wand2}
              title="AutoMix"
              subtitle="Songs transition at the perfect moment, based on analysis of the key and tempo of the music."
              active={t.isAutoMix && isAdmin}
              locked={!isAdmin}
              onClick={selectAutoMix}
            />
            <OptionTile
              icon={GitMerge}
              title="Crossfade"
              subtitle="Simple song transitions from one to the next for a set duration."
              active={t.isCrossfade}
              onClick={selectCrossfade}
            />
          </div>
          <p className="text-[12px] text-[#A0A0A0] px-4 mt-2.5">
            {!isAdmin && (
              <>
                AutoMix is a{" "}
                <span className="text-[#0A84FF] font-medium">premium</span>{" "}
                feature, available to admins during testing.{" "}
              </>
            )}
            <span className="text-[#0A84FF]">Learn More</span>
          </p>
        </section>

        {/* Crossfade duration */}
        <section>
          <h2 className="text-[13px] font-medium text-[#A0A0A0] px-4 mb-2">
            Crossfade Duration
          </h2>
          <CrossfadeSlider
            value={t.crossfadeSeconds}
            disabled={!t.isCrossfade}
            onChange={t.setCrossfadeSeconds}
          />
        </section>
      </div>
    </div>
  );
}