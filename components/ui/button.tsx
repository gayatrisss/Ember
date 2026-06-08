import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-body font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:     "bg-ember text-wax hover:brightness-110",
        ghost:       "border border-smoke/30 text-wax-muted hover:opacity-80",
        destructive: "bg-red-900/50 text-red-300 border border-red-500/30 hover:bg-red-900/70",
        link:        "text-ember underline-offset-4 hover:underline",
      },
      size: {
        sm:      "h-9 px-4 text-label",
        default: "h-11 px-6",
        lg:      "h-13 px-8",
        icon:    "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
