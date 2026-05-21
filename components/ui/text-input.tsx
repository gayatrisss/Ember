import type { ComponentProps, ReactNode } from "react";

type TextInputProps = ComponentProps<"input"> & {
  icon?: ReactNode;
  variant?: "underline" | "outline";
};

export function TextInput({
  icon,
  variant = "underline",
  className,
  ...props
}: TextInputProps) {
  return (
    <div
      className={[
        "field-control",
        `field-control-${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span className="field-icon">{icon}</span>}
      <input className="field-input" {...props} />
    </div>
  );
}
