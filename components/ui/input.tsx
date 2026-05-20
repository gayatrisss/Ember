import type { ComponentProps } from "react";
import { fieldControlClassName } from "@/components/ui/field";

const inputClassName = `${fieldControlClassName} outline-none text-body text-wax caret-ember`;

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={[inputClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
