import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Round, icon-only button (e.g. carousel arrows). `label` is required — an icon-only
// control needs an accessible name. Pass a lucide icon component via `icon`.
const iconButtonVariants = cva(
  "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        ghost: "border border-wax/30 text-wax hover:border-ember hover:text-ember",
      },
    },
    defaultVariants: {
      variant: "ghost",
    },
  }
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  VariantProps<typeof iconButtonVariants> & {
    icon: LucideIcon;
    label: string;
  };

const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant, icon: Icon, label, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, className }))}
      {...props}
    >
      <Icon size={16} />
    </button>
  )
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
