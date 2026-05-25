"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "input input-bordered input-md w-full min-w-0 bg-base-100 text-base-content",
        "placeholder:text-base-content/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
