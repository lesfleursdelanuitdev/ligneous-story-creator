"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import {
  Menu as HLMenu,
  MenuButton as HLMenuButton,
  MenuItems as HLMenuItems,
  MenuItem as HLMenuItem,
} from "@headlessui/react";
import { cn } from "../../cn";

export function DropdownMenu({ children }: { children?: ReactNode }) {
  return <HLMenu>{children}</HLMenu>;
}

export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function DropdownMenuTrigger({ className, children, ...props }, ref) {
    return (
      <HLMenuButton ref={ref} className={className} {...props}>
        {children}
      </HLMenuButton>
    );
  },
);

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center";
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({ className, align = "start", ...props }, ref) {
    const anchor = align === "end" ? "bottom end" : align === "center" ? "bottom" : "bottom start";
    return (
      <HLMenuItems
        ref={ref}
        anchor={anchor}
        className={cn(
          "z-[250] min-w-32 origin-top-left rounded-box",
          "border border-base-content/10 bg-base-100 p-1.5 shadow-xl",
          "focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
  variant?: "default" | "destructive";
}

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ className, inset, variant = "default", children, ...props }, ref) {
    return (
      <HLMenuItem>
        <button
          ref={ref}
          type="button"
          data-inset={inset}
          data-variant={variant}
          className={cn(
            "group flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none",
            "data-[focus]:bg-base-200 data-[focus]:text-base-content",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[inset=true]:pl-7",
            variant === "destructive" && "text-error data-[focus]:bg-error/10",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </HLMenuItem>
    );
  },
);

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-base-content/10", className)} />;
}
