import { type ReactNode } from "react";

type Variant = "default" | "accent" | "success" | "warning" | "error" | "info";

const variantStyles: Record<Variant, string> = {
  default: "border-smoke/30 text-smoke",
  accent: "border-ember/50 text-ember",
  success: "border-green-500/40 text-green-400",
  warning: "border-amber-500/40 text-amber-400",
  error: "border-red-500/40 text-red-400",
  info: "border-blue-400/40 text-blue-400",
};

type Props = {
  variant?: Variant;
  children: ReactNode;
};

export function Badge({ variant = "default", children }: Props) {
  return (
    <div
      className={`inline-flex items-center border border-2 rounded-sm px-4 py-2 ${variantStyles[variant]}`}
    >
      <span className="text-data font-bold tracking-widest uppercase leading-none">{children}</span>
    </div>
  );
}
