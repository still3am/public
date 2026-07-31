import { useState } from "react";
import { ArrowLeft, Check, Wand2, GitMerge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTransitions } from "@/hooks/useTransitions";
import { useToast } from "@/components/ui/use-toast";
import { setTransitionSettings } from "@/lib/transitions";
import {
  TRANSITION_MODES,
  CROSSFADE_MIN,
  CROSSFADE_MAX,
} from "@/lib/transitions";

function OptionTile({ active, onClick, locked, icon: Icon, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-foreground/[0.03] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition">
      <div className="shrink-0 w-9 h-9 rounded-[7px] bg-muted grid place-items-center">
        <Icon size={17} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
          {locked && (
            <span className="text-[9px] font-bold tracking-wide uppercase text-muted-foreground bg-muted border border-border rounded px-1 py-0.5">
              Premium
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="shrink-0">
        {locked ? null : active ? (
          <Check size={18} className="text-primary" strokeWidth={3} />
        ) : (
          <div className="w-[18px] h-[18px] rounded-full border border-border" />
        )}
      </div>
    </button>
  );
}

function CrossfadeSlider({ value, disabled, onChange }) {
  const pct =
    ((value - CROSSFADE_MIN) / (CROSSFADE_MAX - CROSSFADE_MIN)) * 100;
  return (
    <div className="px-4 py-4">
      <div className="rounded-2xl bg-card border border-border px-4 py-5">
        <div className="text-sm font-semibold text-foreground mb-4">
          {value} seconds
        </div>
        <div className="relative">
          <div className="relative h-1.5 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-150"
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
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-foreground shadow-md transition-colors"
            style={{ left: `calc(${disabled ? 0 : pct}% - 12px)` }}
          />
        </div>
        <div className="flex justify-between mt-4 text-[11px] text-muted-foreground">
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
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isAdmin = !!user && user.role === "admin";

  const back = () =>
    window.history.length > 1 ? nav(-1) : nav("/profile");

  const handleSave = () => {
    setSaving(true);
    setTransitionSettings({ mode: t.mode, crossfadeSeconds: t.crossfadeSeconds });
    toast({
      title: "Saved",
      description: "Your transition preferences have been saved.",
    });
    setSaving(false);
    back();
  };

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
    <div className="fixed inset-0 bg-background z-[70] flex flex-col text-foreground">
      {/* Top bar */}
      <div className="top-bar-safe flex items-center px-3 pt-2 pb-3 shrink-0">
        <button
          onClick={back}
          className="tap-target -ml-1 inline-flex items-center gap-1 font-medium hover:opacity-70 transition"
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
          <div className="rounded-2xl bg-card border border-border px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">Song Transitions</span>
              <button
                onClick={toggleMaster}
                role="switch"
                aria-checked={masterOn}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${
                  masterOn ? "bg-primary" : "bg-muted"
                }`}>
                <span
                  className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-background shadow transition-transform ${
                    masterOn ? "translate-x-[20px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug mt-2">
              Beginnings and endings of songs blend together seamlessly. Albums
              and some genres will still play without transitions.
            </p>
          </div>
        </section>

        {/* Transition style */}
        <section>
          <h2 className="text-[13px] font-medium text-muted-foreground px-4 mb-2">
            Transition Style
          </h2>
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
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
          <p className="text-[12px] text-muted-foreground px-4 mt-2.5">
            {!isAdmin && (
              <>
                AutoMix is a{" "}
                <span className="text-primary font-medium">premium</span>{" "}
                feature, available to admins during testing.{" "}
              </>
            )}
            <span className="text-primary">Learn More</span>
          </p>
        </section>

        {/* Crossfade duration */}
        <section>
          <h2 className="text-[13px] font-medium text-muted-foreground px-4 mb-2">
            Crossfade Duration
          </h2>
          <CrossfadeSlider
            value={t.crossfadeSeconds}
            disabled={!t.isCrossfade}
            onChange={t.setCrossfadeSeconds}
          />
        </section>
      </div>

      {/* Save */}
      <div className="shrink-0 px-4 pt-3 pb-6 tab-bar-safe border-t border-border bg-background">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-[15px] font-semibold active:scale-[0.99] disabled:opacity-60 transition">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}