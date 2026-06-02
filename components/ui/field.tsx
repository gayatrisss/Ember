import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <div className="field-root">
      {children}
      <p className="mt-2 text-data uppercase tracking-widest field-label">{label}</p>
    </div>
  );
}

type FieldControlProps = {
  children: ReactNode;
  className?: string;
  variant?: "underline" | "outline";
};

export function FieldControl({ children, className, variant = "underline" }: FieldControlProps) {
  return (
    <div
      className={["field-control", `field-control-${variant}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
