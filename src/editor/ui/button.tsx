"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../cn";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "btn-primary",
  outline: "btn-outline border-base-content/15 text-base-content",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-error",
  link: "btn-link h-auto min-h-0 px-0 normal-case font-semibold",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "btn-md",
  xs: "btn-xs",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-square btn-md",
  "icon-xs": "btn-square btn-xs",
  "icon-sm": "btn-square btn-sm",
  "icon-lg": "btn-square btn-lg",
};

const BASE =
  "btn font-semibold no-animation [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default, SIZE_CLASSES[size] ?? SIZE_CLASSES.default, className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "default", className, ...props },
  ref,
) {
  return <button ref={ref} data-slot="button" className={buttonVariants({ variant, size, className })} {...props} />;
});
