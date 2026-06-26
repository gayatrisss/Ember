"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

export type ToastIntent = "info" | "success" | "error";

type Props = {
  intent?: ToastIntent;
  title: string;
  description?: string;
  // Consumer-provided icon (e.g. <Info size={24} />). It's tinted to the intent
  // color via the wrapper, so pass an uncolored icon.
  icon?: ReactNode;
  // Optional callback fired when the X is clicked. The toast also hides itself, so
  // a callback isn't required to dismiss.
  onDismiss?: () => void;
};

// Each intent: a deep surface with a bright accent (border + icon), per Figma 3687-5395.
const intentStyles: Record<ToastIntent, { surface: string; icon: string }> = {
  info: { surface: "bg-smoke-deep border-smoke", icon: "text-smoke" },
  success: { surface: "bg-ember-range border-ember", icon: "text-ember" },
  // Matches the destructive button palette.
  error: { surface: "bg-red-900/50 border-red-500/30", icon: "text-red-300" },
};

export function Toast({ intent = "info", title, description, icon, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const styles = intentStyles[intent];

  function dismiss() {
    // When managed by the ToastProvider, let it remove us (so the exit animation
    // plays). Standalone (e.g. /design), self-hide.
    if (onDismiss) onDismiss();
    else setVisible(false);
  }

  return (
    <div
      role="status"
      aria-live={intent === "error" ? "assertive" : "polite"}
      className={`flex items-center gap-2 w-full rounded-xl border px-2 py-3 ${styles.surface}`}
    >
      {icon && <div className={`shrink-0 pl-1 ${styles.icon}`}>{icon}</div>}

      <div className="flex-1 min-w-0 flex flex-col gap-2 px-2 text-body text-wax">
        <p className="font-bold leading-tight">{title}</p>
        {description && <p className="font-normal leading-tight">{description}</p>}
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 mr-1 p-0.5 rounded-lg text-wax hover:bg-wax/10 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
}
