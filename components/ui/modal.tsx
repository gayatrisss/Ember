"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  dismissLabel: string;
  onDismiss: () => void;
  variant?: "default" | "destructive";
};

export function Modal({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  dismissLabel,
  onDismiss,
  variant = "default",
}: Props) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    dismissRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-evergreen rounded-xl border border-smoke/20 shadow-ember-md p-8 w-full max-w-sm mx-4 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p id="modal-title" className="text-heading text-wax">
            {title}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-smoke hover:text-wax transition-colors shrink-0 mt-0.5"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-body text-wax-muted">{description}</p>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "primary"}
            className="w-full"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            ref={dismissRef}
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onDismiss}
          >
            {dismissLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
