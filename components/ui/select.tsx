"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

// Inline single-select. Solid-ember trigger (darkens on hover) that opens a
// night dropdown with an ember-range border + ember glow; the selected row is a
// solid-ember fill, rows split by ember-40 dividers. Matches the Figma "Select"
// component. Scrolls when the option list is long.
export function Select({ value, options, onChange, ariaLabel, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const selected = options.find((o) => o.value === value);

  return (
    <span ref={ref} className={`relative inline-block align-middle ${className ?? ""}`}>
      <button
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

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 z-50 w-56 bg-night border border-ember-range rounded-xl shadow-ember-md overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto">
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
                  className={`w-full flex items-center px-4 py-3 text-body font-medium text-left transition-colors ${
                    isLast ? "" : "border-b border-ember-40"
                  } ${isSelected ? "bg-ember text-wax" : "text-wax hover:bg-ember/10"}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
