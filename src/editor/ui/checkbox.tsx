"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  checked?: boolean | "mixed";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, onCheckedChange, disabled, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      checked={checked === "mixed" ? false : checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      aria-checked={checked === "mixed" ? "mixed" : checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "checkbox",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
