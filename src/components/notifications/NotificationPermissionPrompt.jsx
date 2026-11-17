import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { onboardingComplete } from "@/lib/onboardingModel";
import "./notification-permission-prompt.css";

const SNOOZE_DAYS = 14;
const promptKey = (userId) => `public:notif-prompt:${userId}`;

function canAsk() {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "default";
}

function snoozedRecently(userId) {
  try {
    return Date.now() - (Number(localStorage.getItem(promptKey(userId))) || 0) < SNOOZE_DAYS * 864e5;
  } catch {
    return false;
  }
}

/** Asks once every couple of weeks for browser notification permission. */
export default function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ctaRef = useRef(null);

  const eligible = !!(user?.id && !user.disabled && !user.is_blocked && onboardingComplete(user));

  useEffect(() => {
    if (!eligible || !canAsk() || snoozedRecently(user.id)) return;
    const timer = setTimeout(() => setOpen(true), 2200);
    return () => clearTimeout(timer);
  }, [eligible, user?.id, user?.onboarding_completed]);

  useEffect(() => {
    if (!open) return;
    ctaRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(promptKey(user.id), String(Date.now()));
    } catch {}
  }

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    try {
      await Notification.requestPermission();
    } catch {}
    setBusy(false);
    dismiss();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="notification-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="notification-prompt-backdrop" onClick={dismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-prompt-title"
            className="notification-prompt-card"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <button type="button" className="notification-prompt-close" onClick={dismiss} aria-label="Not now">
              <X size={18} />
            </button>

            <div className="notification-prompt-tile" aria-hidden="true">
              <div className="notification-prompt-row">
                <span className="notification-prompt-icon">
                  <Bell size={15} strokeWidth={2.2} />
                </span>
                <span className="notification-prompt-app">PUBLIC</span>
                <span className="notification-prompt-switch">
                  <span />
                </span>
              </div>
              <span className="notification-prompt-line" />
              <span className="notification-prompt-line short" />
            </div>

            <h2 id="notification-prompt-title">Your notifications are off</h2>
            <p>Get notified right away when people message you, interact with your posts and more.</p>
            <button ref={ctaRef} type="button" className="notification-prompt-cta" onClick={turnOn} disabled={busy}>
              {busy ? "Turning on…" : "Turn on"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}