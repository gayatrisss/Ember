"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useIsomorphicLayoutEffect } from "@/components/ui/use-popover";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

const GAP = 8; // between trigger and menu
const EDGE = 8; // minimum breathing room against the viewport
const MIN_MENU_HEIGHT = 120;

// Inline single-select. Solid-ember trigger that opens a night dropdown with an
// ember-range border + ember glow; the selected row is a solid-ember fill, rows
// split by ember-40 dividers. Matches the Figma "Select" component.
//
// The menu is PORTALLED to <body> and positioned `fixed` from the trigger's rect.
// An absolutely-positioned menu is clipped by any ancestor with `overflow`, and
// this control lives inside the availability drawer's scrolling content area —
// which clipped the list, dragged a horizontal scrollbar into the drawer, and
// overlapped the surrounding sentence. Portalling is what actually fixes that;
// a native <select> also escapes the clip but can't be styled, and renders the
// OS menu on desktop-narrow viewports.
export function Select({ value, options, onChange, ariaLabel, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Placed before paint so the menu never flashes at the wrong coordinates.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const height = menu.offsetHeight;
      const below = window.innerHeight - rect.bottom - GAP - EDGE;
      const above = rect.top - GAP - EDGE;
      const openUp = height > below && above > below;

      const left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - EDGE);
      menu.style.left = `${Math.max(EDGE, left)}px`;
      menu.style.minWidth = `${rect.width}px`;
      menu.style.maxHeight = `${Math.max(MIN_MENU_HEIGHT, openUp ? above : below)}px`;
      menu.style.top = openUp ? `${rect.top - GAP - height}px` : `${rect.bottom + GAP}px`;
    }

    place();
    // Capture phase so scrolling *any* ancestor (the drawer's content area, not
    // just the window) keeps the menu attached to its trigger.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const menu = (
    <div
      ref={menuRef}
      role="listbox"
      className="fixed z-50 w-max max-w-[calc(100vw-16px)] bg-night border border-ember-range rounded-xl shadow-ember-md overflow-y-auto"
    >
      {options.map((opt, i) => {
        const isSelected = opt.value === value;
        const isLast = i === options.length - 1;
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3 text-body text-left transition-colors ${
              isLast ? "" : "border-b border-ember-40"
            } ${isSelected ? "bg-ember text-wax font-medium " : "text-wax hover:bg-ember/10 "}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <span ref={rootRef} className={`relative inline-block align-middle ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ember text-wax text-body font-medium px-3 py-1.5 hover:bg-ember-selected transition-colors"
      >
        {selected?.label ?? ""}
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* `open` is false on the server and through hydration, so this never
          reaches `document` during SSR and can't cause a mismatch. */}
      {open && typeof document !== "undefined" && createPortal(menu, document.body)}
    </span>
  );
}
