import { type ReactNode } from "react";

export type BadgeType = "default" | "accent" | "error";
export type BadgeFill = "ghost" | "fill";
export type BadgeSize = "default" | "small" | "pill";

type Props = {
  type?: BadgeType;
  fill?: BadgeFill;
  size?: BadgeSize;
  children: ReactNode;
};

const shapeStyles: Record<BadgeSize, string> = {
  default: "px-4 py-2 rounded-sm",
  small:   "px-2 py-1 rounded-sm",
  pill:    "px-2 py-1 rounded-full",
};

const ghostBorderWidth: Record<BadgeSize, string> = {
  default: "border-2",
  small:   "border",
  pill:    "border",
};

const ghostBorderColor: Record<BadgeType, string> = {
  default: "border-smoke/30",
  accent:  "border-ember-selected",
  error:   "border-red-600",
};

const ghostTextColor: Record<BadgeType, string> = {
  default: "text-smoke",
  accent:  "text-ember",
  error:   "text-red-400",
};

const fillBg: Record<BadgeType, string> = {
  default: "bg-smoke",
  accent:  "bg-ember",
  error:   "bg-red-600",
};

const textStyle: Record<BadgeSize, string> = {
  default: "text-data font-medium",
  small:   "text-data font-medium",
  pill:    "text-label",
};

export function Badge({ type = "default", fill = "ghost", size = "default", children }: Props) {
  const shape = shapeStyles[size];
  const text = `${textStyle[size]} uppercase leading-none`;

  const containerStyles = fill === "ghost"
    ? `${shape} ${ghostBorderWidth[size]} ${ghostBorderColor[type]}`
    : `${shape} ${fillBg[type]}`;

  const textColor = fill === "ghost" ? ghostTextColor[type] : "text-wax";

  return (
    <div className={`inline-flex items-center justify-center ${containerStyles}`}>
      <span className={`${text} ${textColor}`}>{children}</span>
    </div>
  );
}
