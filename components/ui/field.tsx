import type { ReactNode } from "react";

export const fieldControlClassName =
  "bg-night/60 w-full p-4 border-b border-ember";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <div>
      {children}
      <p className="mt-2 text-data text-ember uppercase tracking-widest">{label}</p>
    </div>
  );
}

type FieldControlProps = {
  children: ReactNode;
  className?: string;
};

export function FieldControl({ children, className }: FieldControlProps) {
  return (
    <div className={[fieldControlClassName, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
